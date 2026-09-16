import type { EngineBaselineInputFixtureV1 } from "../engineOutputProjectionV1";
import { runEngineBaselineFixtureV1 } from "../engineOutputProjectionV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import { hashLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1";
import { projectNativeSourceCaseV1 } from "./buildLegacyCompatibilityExecutionPlanV1";
import {
  compareLegacyToCompatibilityEffective,
  detachedFrozen,
  hashDifferentialReportContent,
  type DifferentialObservationV1,
  type DomainModelDifferentialReportV1,
  type M1CHashIdentity,
} from "./differentialExecutionV1";
import {
  executeCompatibilityEffectiveProjectionV1,
  executeDerivedRegistryCounterfactualsV1,
  executePureNativeProjectionV1,
  type NativeExecutionResultV1,
} from "./executeVerifiedNativeProjectionV1";
import { comparePureNativeToCompatibilityEffective } from "./runCompatibilityCounterfactualV1";

function hashes(envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1): M1CHashIdentity {
  return {
    sourceSemanticPayloadHash: envelope.source.semanticPayloadHash,
    projectedSemanticPayloadHash: envelope.projection.semanticPayloadHash,
    compatibilityDeclarationsHash: envelope.compatibility.declarationsHash,
    envelopeHash: hashLegacyProfileProjectionEnvelopeV1(envelope),
  };
}

function observation(
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1,
  fixture: EngineBaselineInputFixtureV1,
  kind: DifferentialObservationV1["kind"],
  result: NativeExecutionResultV1
): DifferentialObservationV1 {
  return detachedFrozen({
    version: "domain-model-differential-observation-v1" as const,
    kind,
    profileId: fixture.profileId,
    caseId: fixture.fixtureId,
    scenario: "combined" as const,
    hashes: hashes(envelope),
    activatedDeclarationPaths: result.activatedDeclarationPaths,
    compatibilityLedger: result.compatibilityLedger,
    nativeStateHasCompatibilityProperties: false as const,
    comparisonSurface: result.comparisonSurface,
  });
}

function legacyObservation(
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1,
  fixture: EngineBaselineInputFixtureV1
): DifferentialObservationV1 {
  const output = runEngineBaselineFixtureV1(fixture);
  return detachedFrozen({
    version: "domain-model-differential-observation-v1" as const,
    kind: "legacy-reference" as const,
    profileId: fixture.profileId,
    caseId: fixture.fixtureId,
    scenario: "combined" as const,
    hashes: hashes(envelope),
    activatedDeclarationPaths: [],
    compatibilityLedger: [],
    nativeStateHasCompatibilityProperties: false as const,
    comparisonSurface: structuredClone(output),
  });
}

export function runDomainModelDifferentialV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  fixture: EngineBaselineInputFixtureV1;
}>): DomainModelDifferentialReportV1 {
  const sourceCase = projectNativeSourceCaseV1(input.envelope, input.fixture);
  const legacyReference = legacyObservation(input.envelope, input.fixture);
  const pureNative = observation(input.envelope, input.fixture, "pure-native", executePureNativeProjectionV1({
    contract: input.envelope.projection.contract,
    sourceCase,
  }));
  const compatibilityEffectiveCandidate = observation(
    input.envelope,
    input.fixture,
    "compatibility-effective",
    executeCompatibilityEffectiveProjectionV1({ envelope: input.envelope, sourceCase })
  );
  const counterfactuals = executeDerivedRegistryCounterfactualsV1({ envelope: input.envelope, sourceCase })
    .map((result) => observation(input.envelope, input.fixture, "compatibility-counterfactual", result));
  const comparatorA = compareLegacyToCompatibilityEffective(legacyReference, compatibilityEffectiveCandidate);
  const comparatorB = comparePureNativeToCompatibilityEffective({ pureNative, compatibilityEffective: compatibilityEffectiveCandidate, counterfactuals });
  const content = {
    version: "domain-model-differential-report-v1" as const,
    legacyReference,
    pureNative,
    compatibilityEffectiveCandidate,
    counterfactuals,
    comparatorA,
    comparatorB,
  };
  return detachedFrozen({ ...content, reportHash: hashDifferentialReportContent(content) });
}
