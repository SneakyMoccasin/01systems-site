import type {
  DomainModelContractV1,
  SemanticHashVerifiedDomainModelContractV1,
  SemanticallyValidatedDomainModelContractV1,
  StableId,
  StructurallyValidatedDomainModelContractV1,
} from "./contractV1";

export type PrefixedSha256 = `sha256:${string}`;

export type LegacySourceIdentityV1 = Readonly<{
  domainId: string;
  profileId: string;
  modelVersion: string;
  calibrationVersion: string;
}>;

export type ProjectedLegacyIdentityV1 = DomainModelContractV1["identity"];

export type IgnoredUnknownDriverDeltaV1 = Readonly<{
  sourceProfileId: string;
  sourceActionId: string;
  sourceDriverId: string;
  delta: number;
}>;

export type CompatibilityOnlyActionV1 = Readonly<{
  kind: "legacy-compatibility-only-action-v1";
  sourceProfileId: string;
  sourceActionId: string;
  projectedNativeAction: "omitted-because-no-modeled-effects";
  admission: "legacy-adapter-only";
  ignoredEffects: readonly Readonly<{ driverId: string; delta: number }>[];
}>;

export type LegacyDriverIdMappingV1 = Readonly<{
  sourceDriverId: string;
  projectedDriverId: StableId;
}>;

export type LegacySustainThresholdOverrideV1 = Readonly<{
  kind: "legacy-risk-state-number-overrides-constraint-threshold-v1";
  sourceField: "sustainThreshold";
  constraintId: "refinancing-constraint";
  acceptedRuntimeType: "number-including-non-finite";
  comparison: "margin-strictly-below-threshold";
  applicability: "this-envelope-source-only";
}>;

export type LegacyPropagationEvaluationOrderEntryV1 = Readonly<{
  sourcePosition: number;
  edgePosition: number;
  sourceLegacyDriverId: string;
  targetLegacyDriverId: string;
  projectedOrCompatibilityEdgeId: StableId;
}>;

export type LegacyCompatibilityOnlyPropagationEdgeV1 = Readonly<{
  sourcePosition: number;
  edgePosition: number;
  occurrencePosition: number;
  sourceLegacySourceDriverId: string;
  sourceLegacyTargetDriverId: string;
  adapterLocalSourceDriverId: StableId;
  adapterLocalTargetDriverId: StableId;
  compatibilityEdgeId: StableId;
  sourcePropagatedLevelId: string;
  projectedPropagatedLevelId: StableId;
  implicitSourceNodeId: "liquidityPressure";
  adapterLocalImplicitNodeId: "liquidity-pressure";
  missingReadDefaultLevelId: "low";
  materializeOnRaise: true;
  hasScore: false;
  hasImpacts: false;
}>;

export type LegacyPropagationCompatibilityV1 = Readonly<{
  edgeEvaluationOrder: "legacy-source-and-target-insertion-order-v1";
  sourceEvaluationOrder: readonly LegacyPropagationEvaluationOrderEntryV1[];
  compatibilityOnlyEdges: readonly LegacyCompatibilityOnlyPropagationEdgeV1[];
}>;

export type ExcludedSourceValueV1 = Readonly<{
  kind: "provably-unreachable-public-execution-v1";
  sourcePath: string;
  sourceValueHash: PrefixedSha256;
  reasonCode: "profile-constraint-disabled" | "no-public-activation-transition" | "inert-global-registry-member";
}>;

export type LegacyCurveFallbackDeclarationV1 = Readonly<{
  policyId: "legacy-neutral-multiplier-v1";
  appliesTo: readonly ["missing-curve-configuration", "unsupported-curve-discriminant"];
  neutralMultiplier: 1;
  evidenceStatus: "deferred-to-m1e";
}>;

export type RawLegacyProfileProjectionEnvelopeV1 = Readonly<{
  schemaVersion: "legacy-profile-projection-v1";
  adapterVersion: "legacy-domain-profile-adapter-v1";
  engineProtocolVersion: "pulse-domain-engine-protocol-v1";
  source: Readonly<{
    identity: LegacySourceIdentityV1;
    semanticPayloadVersion: "legacy-domain-profile-semantic-payload-v1";
    semanticPayloadHash: PrefixedSha256;
  }>;
  projection: Readonly<{
    identity: ProjectedLegacyIdentityV1;
    semanticPayloadHashPolicy: "domain-model-contract-v1-semantic-payload-v1";
    semanticPayloadHash: PrefixedSha256;
    contract: DomainModelContractV1;
  }>;
  compatibility: Readonly<{
    declarationsVersion: "legacy-compatibility-declarations-v1";
    declarationsHash: PrefixedSha256;
    ignoredUnknownDriverDeltas: readonly IgnoredUnknownDriverDeltaV1[];
    compatibilityOnlyActions: readonly CompatibilityOnlyActionV1[];
    driverIdMappings: readonly LegacyDriverIdMappingV1[];
    excludedUnsupportedActionIds: readonly string[];
    sustainThresholdOverride: LegacySustainThresholdOverrideV1 | null;
    propagation: LegacyPropagationCompatibilityV1;
    excludedSourceValues: readonly ExcludedSourceValueV1[];
    curveFallbackDeclaration: LegacyCurveFallbackDeclarationV1;
  }>;
}>;

type LegacyProfileProjectionEnvelopeWithContractV1<TContract extends DomainModelContractV1> = Readonly<
  Omit<RawLegacyProfileProjectionEnvelopeV1, "projection"> & {
    projection: Readonly<
      Omit<RawLegacyProfileProjectionEnvelopeV1["projection"], "contract"> & {
        contract: TContract;
      }
    >;
  }
>;

export type DerivedLegacyProjectionDiagnosticV1 = Readonly<{
  code:
    | "legacy-ignored-unknown-driver-delta"
    | "legacy-compatibility-only-action"
    | "legacy-sustain-threshold-override-declared"
    | "legacy-propagation-evaluation-order-declared"
    | "legacy-propagation-only-edge"
    | "legacy-source-value-excluded"
    | "legacy-curve-fallback-deferred-to-m1e";
  path: string;
  message: string;
}>;

declare const structuralBrand: unique symbol;
export type StructurallyValidatedLegacyProfileProjectionEnvelopeV1 =
  LegacyProfileProjectionEnvelopeWithContractV1<StructurallyValidatedDomainModelContractV1> & Readonly<{
    [structuralBrand]: "structurally-validated-legacy-profile-projection-envelope-v1";
  }>;

declare const semanticBrand: unique symbol;
export type SemanticallyValidatedLegacyProfileProjectionEnvelopeV1 =
  StructurallyValidatedLegacyProfileProjectionEnvelopeV1 &
  LegacyProfileProjectionEnvelopeWithContractV1<SemanticallyValidatedDomainModelContractV1> & Readonly<{
    [semanticBrand]: "semantically-validated-legacy-profile-projection-envelope-v1";
  }>;

declare const hashBrand: unique symbol;
export type HashVerifiedLegacyProfileProjectionEnvelopeV1 =
  SemanticallyValidatedLegacyProfileProjectionEnvelopeV1 &
  LegacyProfileProjectionEnvelopeWithContractV1<SemanticHashVerifiedDomainModelContractV1> & Readonly<{
    [hashBrand]: "hash-verified-legacy-profile-projection-envelope-v1";
  }>;

export type ValidatedLegacyProfileProjectionEnvelopeV1 = Readonly<{
  envelope: HashVerifiedLegacyProfileProjectionEnvelopeV1;
  diagnostics: readonly DerivedLegacyProjectionDiagnosticV1[];
}>;
