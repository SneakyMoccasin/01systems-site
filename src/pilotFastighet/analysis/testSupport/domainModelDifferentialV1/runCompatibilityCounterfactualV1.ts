import { isDeepStrictEqual } from "node:util";
import { hashLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/hashLegacyProfileProjectionEnvelopeV1";
import type { HashVerifiedLegacyProfileProjectionEnvelopeV1 } from "../domainModelContractV1/legacyProfileProjectionEnvelopeV1";
import {
  buildLegacyCompatibilityExecutionPlanV1,
  type NativeSourceCaseProjectionV1,
} from "./buildLegacyCompatibilityExecutionPlanV1";
import {
  collectDiscrepancies,
  compareCodeUnits,
  detachedFrozen,
  type ActionAdmissionAttributionResultV1,
  type CompatibilityAttributionV1,
  type DifferentialDiscrepancyV1,
  type DifferentialObservationV1,
  type FullCompatibilityComparatorV1,
} from "./differentialExecutionV1";
import {
  executeDerivedPropagationCounterfactualV1,
  executeDerivedRegistryCounterfactualsV1,
  type NativeExecutionResultV1,
} from "./executeVerifiedNativeProjectionV1";

function failure(path: string, left: unknown, right: unknown): DifferentialDiscrepancyV1 {
  return detachedFrozen({ path, left, right, classification: "compatibility-rule" as const });
}

function reportValue(value: unknown): unknown {
  return value === undefined ? { presence: "absent" as const } : value;
}

function isForbiddenAttributionPath(path: string): boolean {
  return ["/executionProvenance", "/compatibilityLedger", "/diagnostics", "/declarations", "/plannedSchedules"]
    .some((segment) => path.includes(segment));
}

function comparisonSurface(result: NativeExecutionResultV1, actionScoped: boolean): unknown {
  if (!actionScoped) return result.comparisonSurface;
  const surface = result.comparisonSurface as Readonly<{ scenarioA: unknown; scenarioB: unknown; baseline: unknown; comparison: unknown }>;
  return detachedFrozen({ scenarioA: surface.scenarioA, scenarioB: surface.scenarioB, baseline: surface.baseline, comparison: surface.comparison });
}

function expectedHashes(envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1) {
  return {
    sourceSemanticPayloadHash: envelope.source.semanticPayloadHash,
    projectedSemanticPayloadHash: envelope.projection.semanticPayloadHash,
    compatibilityDeclarationsHash: envelope.compatibility.declarationsHash,
    envelopeHash: hashLegacyProfileProjectionEnvelopeV1(envelope),
  };
}

function expectedCounterfactualObservation(
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1,
  sourceCase: NativeSourceCaseProjectionV1,
  result: NativeExecutionResultV1,
  actionScoped: boolean
): DifferentialObservationV1 {
  return detachedFrozen({
    version: "domain-model-differential-observation-v1" as const,
    kind: "compatibility-counterfactual" as const,
    profileId: envelope.source.identity.profileId,
    caseId: sourceCase.fixtureId,
    scenario: "combined" as const,
    hashes: expectedHashes(envelope),
    activatedDeclarationPaths: result.activatedDeclarationPaths,
    compatibilityLedger: result.compatibilityLedger,
    nativeStateHasCompatibilityProperties: false as const,
    comparisonSurface: comparisonSurface(result, actionScoped),
  });
}

export function verifyActionAttributionBindingV1(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  attribution: ActionAdmissionAttributionResultV1;
  effectiveActivatedDeclarationPaths: readonly string[];
  effectiveCompatibilityLedger: DifferentialObservationV1["compatibilityLedger"];
  occurrence: Readonly<{ sourceActionId: string; scheduledStep: number }>;
}>): readonly DifferentialDiscrepancyV1[] {
  const failures: DifferentialDiscrepancyV1[] = [];
  const entryIndex = input.envelope.compatibility.actionAdmission.entries.findIndex((entry) => entry.sourceActionId === input.occurrence.sourceActionId);
  const entry = input.envelope.compatibility.actionAdmission.entries[entryIndex];
  const expectedPath = `/compatibility/actionAdmission/entries/${entryIndex}`;
  if (!entry || entryIndex < 0) failures.push(failure("/actionAttributionBinding/sourceActionId", input.occurrence.sourceActionId, "declared action"));
  else {
    const expectedDisposition = entry.outputDisposition === "retained-native-effects-v1" ? "changed" : "unchanged";
    if (input.attribution.declarationPath !== expectedPath) failures.push(failure("/actionAttributionBinding/declarationPath", input.attribution.declarationPath, expectedPath));
    if (input.attribution.outputDisposition !== expectedDisposition) failures.push(failure("/actionAttributionBinding/outputDisposition", input.attribution.outputDisposition, expectedDisposition));
    if (!input.effectiveActivatedDeclarationPaths.includes(expectedPath)) failures.push(failure("/actionAttributionBinding/activatedDeclarationPaths", input.effectiveActivatedDeclarationPaths, expectedPath));
    const expectedLedger = {
      declarationPath: expectedPath,
      status: entry.retainedEffects.length === 0 ? "ignored" : "applied",
      mechanism: "legacy-action-admission-v1",
      sourceId: entry.sourceActionId,
      nativeId: entry.retainedEffects.length === 0 ? null : entry.sourceActionId,
      executionStep: input.occurrence.scheduledStep,
    };
    const actualLedger = input.effectiveCompatibilityLedger.filter((ledger) => ledger.declarationPath === expectedPath);
    failures.push(...collectDiscrepancies([expectedLedger], actualLedger, "compatibility-rule", "/actionAttributionBinding/compatibilityLedger"));
  }
  return detachedFrozen(failures.sort((left, right) => compareCodeUnits(left.path, right.path)));
}

export function comparePureNativeToCompatibilityEffective(input: Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  sourceCase: NativeSourceCaseProjectionV1;
  pureNative: DifferentialObservationV1;
  compatibilityEffective: DifferentialObservationV1;
  counterfactuals: readonly DifferentialObservationV1[];
  actionAttribution?: ActionAdmissionAttributionResultV1;
  actionOccurrence?: Readonly<{ sourceActionId: string; scheduledStep: number }>;
}>): FullCompatibilityComparatorV1 {
  const plan = buildLegacyCompatibilityExecutionPlanV1(input.envelope);
  const actionScoped = input.actionAttribution !== undefined || input.actionOccurrence !== undefined;
  const expectedResults = [
    executeDerivedPropagationCounterfactualV1({ envelope: input.envelope, sourceCase: input.sourceCase }),
    ...executeDerivedRegistryCounterfactualsV1({ envelope: input.envelope, sourceCase: input.sourceCase }),
  ];
  const expectedCounterfactuals = expectedResults
    .map((result) => expectedCounterfactualObservation(input.envelope, input.sourceCase, result, actionScoped))
    .filter((candidate) => collectDiscrepancies(input.pureNative.comparisonSurface, candidate.comparisonSurface, "compatibility-rule").length > 0);
  const expectedByPath = new Map(expectedCounterfactuals.map((entry) => [entry.activatedDeclarationPaths[0], entry]));
  const permitted = [...plan.declarationPaths].sort(compareCodeUnits);
  const primary = collectDiscrepancies(
    input.pureNative.comparisonSurface,
    input.compatibilityEffective.comparisonSurface,
    "compatibility-rule",
    "/comparisonSurface"
  ).sort((a, b) => compareCodeUnits(a.path, b.path));
  const primaryByPath = new Map(primary.map((entry) => [entry.path, entry]));
  const failures: DifferentialDiscrepancyV1[] = [];
  const attributions: CompatibilityAttributionV1[] = [];
  const attributedPaths = new Set<string>();

  const expectedContext = {
    version: "domain-model-differential-observation-v1",
    profileId: input.envelope.source.identity.profileId,
    caseId: input.sourceCase.fixtureId,
    scenario: "combined",
    hashes: expectedHashes(input.envelope),
    kind: "compatibility-counterfactual",
    nativeStateHasCompatibilityProperties: false,
  };

  if (input.counterfactuals.length !== expectedCounterfactuals.length) {
    failures.push(failure("/counterfactualBinding/count", input.counterfactuals.length, expectedCounterfactuals.length));
  }

  for (const counterfactual of input.counterfactuals) {
    if (counterfactual.activatedDeclarationPaths.length !== 1) {
      failures.push(failure("/counterfactual/activatedDeclarationPaths", counterfactual.activatedDeclarationPaths, "one internally derived declaration"));
      continue;
    }
    const declarationPath = counterfactual.activatedDeclarationPaths[0];
    if (!permitted.includes(declarationPath)) {
      failures.push(failure("/counterfactual/activatedDeclarationPaths/0", declarationPath, "effective declaration"));
      continue;
    }
    const expected = expectedByPath.get(declarationPath);
    if (!expected) {
      failures.push(failure("/counterfactualBinding/declarationPath", declarationPath, "output-bearing declaration from verified plan"));
      continue;
    }
    const actualContext = {
      version: counterfactual.version,
      profileId: counterfactual.profileId,
      caseId: counterfactual.caseId,
      scenario: counterfactual.scenario,
      hashes: counterfactual.hashes,
      kind: counterfactual.kind,
      nativeStateHasCompatibilityProperties: counterfactual.nativeStateHasCompatibilityProperties,
    };
    failures.push(...collectDiscrepancies(expectedContext, actualContext, "compatibility-rule", `/counterfactualBinding${declarationPath}`));
    failures.push(...collectDiscrepancies(expected.compatibilityLedger, counterfactual.compatibilityLedger, "compatibility-rule", `/counterfactualBinding${declarationPath}/compatibilityLedger`));
    failures.push(...collectDiscrepancies(expected.comparisonSurface, counterfactual.comparisonSurface, "compatibility-rule", `/counterfactualBinding${declarationPath}/comparisonSurface`));
    const isolated = collectDiscrepancies(
      input.pureNative.comparisonSurface,
      counterfactual.comparisonSurface,
      "compatibility-rule",
      "/comparisonSurface"
    ).sort((a, b) => compareCodeUnits(a.path, b.path));
    if (isolated.length === 0) {
      failures.push(failure("/counterfactual/effect", [], "observed output difference"));
      continue;
    }
    for (const discrepancy of isolated) {
      if (isForbiddenAttributionPath(discrepancy.path)) {
        failures.push(failure(discrepancy.path, discrepancy.path, "output-only attribution path"));
        continue;
      }
      const actual = primaryByPath.get(discrepancy.path);
      if (!actual || !isDeepStrictEqual(actual.left, discrepancy.left) || !isDeepStrictEqual(actual.right, discrepancy.right)) {
        failures.push(failure(
          discrepancy.path,
          actual ? { before: reportValue(actual.left), after: reportValue(actual.right) } : { presence: "absent-primary-difference" },
          { before: reportValue(discrepancy.left), after: reportValue(discrepancy.right) }
        ));
      } else {
        attributedPaths.add(discrepancy.path);
      }
    }
    const ledger = counterfactual.compatibilityLedger;
    if (ledger.length !== 1 || ledger[0].declarationPath !== declarationPath || ledger[0].status !== "applied") {
      failures.push(failure("/counterfactual/compatibilityLedger", ledger, "one matching applied entry"));
      continue;
    }
    attributions.push(detachedFrozen({
      declarationPaths: [declarationPath],
      profileId: input.pureNative.profileId,
      caseId: input.pureNative.caseId,
      scenario: "combined" as const,
      sourceId: ledger[0].sourceId,
      nativeId: ledger[0].nativeId,
      executionStep: ledger[0].executionStep,
      observedOutputPaths: isolated.map((entry) => entry.path),
      observedDifferences: isolated.map((entry) => ({
        path: entry.path,
        before: entry.left === undefined ? { presence: "absent" as const } : entry.left,
        after: entry.right === undefined ? { presence: "absent" as const } : entry.right,
      })),
      mechanismLedger: { admitted: [declarationPath], applied: [declarationPath], ignored: [], rejected: [] },
    }));
  }

  if (input.actionAttribution) {
    const action = input.actionAttribution;
    const occurrence = input.actionOccurrence;
    if (!occurrence) {
      failures.push(failure("/actionAttributionBinding/occurrence", { presence: "absent" }, "verified action occurrence"));
    } else {
      failures.push(...verifyActionAttributionBindingV1({
        envelope: input.envelope,
        attribution: action,
        effectiveActivatedDeclarationPaths: input.compatibilityEffective.activatedDeclarationPaths,
        effectiveCompatibilityLedger: input.compatibilityEffective.compatibilityLedger,
        occurrence,
      }));
    }
    if (action.status !== "pass") {
      failures.push(failure("/actionAttribution/consistency/status", action.status, "pass"));
      failures.push(...action.discrepancies);
      if (action.discrepancies.length === 0) failures.push(failure("/actionAttribution/consistency/discrepancies", [], "non-empty when status is fail"));
    } else if (action.discrepancies.length !== 0) {
      failures.push(failure("/actionAttribution/consistency/discrepancies", action.discrepancies, []));
    }
    if (action.outputDisposition === "unchanged" && action.attributedDifferences.length !== 0) {
      failures.push(failure("/actionAttribution/consistency/outputDisposition", { outputDisposition: action.outputDisposition, attributedDifferenceCount: action.attributedDifferences.length }, { outputDisposition: "unchanged", attributedDifferenceCount: 0 }));
    }
    if (action.outputDisposition === "changed" && action.attributedDifferences.length === 0) {
      failures.push(failure("/actionAttribution/consistency/outputDisposition", { outputDisposition: action.outputDisposition, attributedDifferenceCount: 0 }, { outputDisposition: "changed", attributedDifferenceCount: "at-least-one" }));
    }
    for (const difference of action.attributedDifferences) {
      if (isForbiddenAttributionPath(difference.path)) {
        failures.push(failure(difference.path, difference.path, "output-only attribution path"));
        continue;
      }
      const actual = primaryByPath.get(difference.path);
      if (!actual || !isDeepStrictEqual(actual.left, difference.before) || !isDeepStrictEqual(actual.right, difference.after)) {
        failures.push(failure(
          difference.path,
          actual ? { before: reportValue(actual.left), after: reportValue(actual.right) } : { presence: "absent-primary-difference" },
          { before: reportValue(difference.before), after: reportValue(difference.after) }
        ));
      } else {
        attributedPaths.add(difference.path);
      }
    }
    if (action.attributedDifferences.length > 0) {
      attributions.push(detachedFrozen({
        declarationPaths: [action.declarationPath],
        profileId: input.pureNative.profileId,
        caseId: input.pureNative.caseId,
        scenario: "combined" as const,
        sourceId: null,
        nativeId: null,
        executionStep: 0,
        observedOutputPaths: action.attributedDifferences.map((entry) => entry.path),
        observedDifferences: action.attributedDifferences,
        mechanismLedger: { admitted: [action.declarationPath], applied: [action.declarationPath], ignored: [], rejected: [] },
      }));
    }
  }

  const unattributed = primary.filter((entry) => !attributedPaths.has(entry.path));
  if (unattributed.length > 0) failures.push(failure("/attribution/unattributedOutputPaths", unattributed.map((entry) => entry.path), []));
  const duplicatePaths = attributions.flatMap((entry) => entry.observedOutputPaths).filter((path, index, all) => all.indexOf(path) !== index);
  if (duplicatePaths.length > 0) failures.push(failure("/attribution/duplicateOutputPaths", duplicatePaths, []));
  const discrepancies = failures.sort((a, b) => compareCodeUnits(a.path, b.path));
  return detachedFrozen({
    comparator: "pure-native-vs-full-compatibility-effective-v1",
    status: discrepancies.length === 0 ? "pass" as const : "fail" as const,
    primaryDifferences: primary.map((entry) => ({ path: entry.path, before: entry.left, after: entry.right })),
    attributions: discrepancies.length === 0 ? attributions : [],
    discrepancies,
  });
}
