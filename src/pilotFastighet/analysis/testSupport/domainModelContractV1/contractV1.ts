export type StableId = string;
export type JsonNumber = number;

export type MaterializationBand = Readonly<{
  minimumInclusive: JsonNumber;
  maximumExclusive?: JsonNumber;
  maximumInclusive?: JsonNumber;
}>;
export type OrdinalLevel = Readonly<{ levelId: StableId; rank: number; anchor: JsonNumber; materialization: MaterializationBand }>;
export type OrdinalScale = Readonly<{ scaleId: StableId; levels: readonly OrdinalLevel[] }>;
export type DriverImpact = Readonly<{ dimensionId: StableId; direction: "increase" | "decrease"; curveId: StableId }>;
export type DriverDefinition = Readonly<{
  driverId: StableId; scaleId: StableId;
  initial: Readonly<{ levelId: StableId; score: JsonNumber }>;
  numericRange: Readonly<{ minimum: JsonNumber; maximum: JsonNumber }>;
  adverseLevelIds: readonly StableId[];
  impacts: readonly DriverImpact[];
}>;
export type ActionEffect = Readonly<{ driverId: StableId; delta: JsonNumber }>;
export type ActionDefinition = Readonly<{ actionId: StableId; effects: readonly ActionEffect[] }>;
export type PropagationEdge = Readonly<{
  edgeId: StableId; sourceDriverId: StableId; targetDriverId: StableId;
  triggerLevelIds: readonly StableId[]; propagatedLevelId: StableId;
}>;
export type PropagationDefinition = Readonly<{
  edges: readonly PropagationEdge[]; cyclePolicy: "reject"; selfEdgePolicy: "reject"; duplicateEdgePolicy: "reject";
}>;
export type DimensionDefinition = Readonly<{ dimensionId: StableId; neutralValue: JsonNumber }>;
export type CurveDefinition =
  | Readonly<{ curveId: StableId; type: "linear"; amplitudeByLevel: Readonly<Record<StableId, JsonNumber>> }>
  | Readonly<{ curveId: StableId; type: "exponential"; exponent: JsonNumber; amplitudeByLevel: Readonly<Record<StableId, JsonNumber>> }>
  | Readonly<{ curveId: StableId; type: "logistic"; k: JsonNumber; x0: JsonNumber; amplitudeByLevel: Readonly<Record<StableId, JsonNumber>> }>;
export type ConstraintLifecycle = "inactive" | "active" | "recovering";
export type Predicate =
  | Readonly<{ kind: "measure-below"; measureId: StableId; threshold: JsonNumber }>
  | Readonly<{ kind: "driver-at-level"; driverId: StableId; levelIds: readonly StableId[] }>
  | Readonly<{ kind: "all" | "any"; predicates: readonly Predicate[] }>;
export type ConstraintDefinition = Readonly<{
  constraintId: StableId; initialLifecycle: ConstraintLifecycle; activation: Predicate;
  sustain: Predicate | Readonly<{ kind: "until-explicit-transition" }>;
  deactivation: Predicate | Readonly<{ kind: "none" }>;
  allowedTransitions: readonly Readonly<{ from: ConstraintLifecycle; to: ConstraintLifecycle }>[];
  activeEffects: readonly Readonly<{ dimensionId: StableId; operation: "multiply"; value: JsonNumber }>[];
}>;
export type SupportedProtocolSignalId = "base-dimension-pressure-sum-v1";
export type MeasureSource =
  | Readonly<{ kind: "dimension"; dimensionId: StableId; stage: "base" | "after-constraints" }>
  | Readonly<{ kind: "aggregate-driver-pressure"; driverIds: readonly StableId[] }>
  | Readonly<{ kind: "current-measure-value" }>
  | Readonly<{ kind: "measure"; measureId: StableId }>
  | Readonly<{ kind: "protocol-signal"; signalId: SupportedProtocolSignalId }>;
export type MeasureTransform = "identity" | "deviation-from-neutral" | "positive-deviation-from-neutral" | "inverse-from-neutral";
export type MeasureTerm = Readonly<{ termId: StableId; source: MeasureSource; transform: MeasureTransform; weight: JsonNumber }>;
export type NamedMeasureDefinition = Readonly<{
  measureId: StableId; kind: "weighted-signal-aggregate-v1";
  updateOperator: "subtract-terms-add-recovery-v1"; initialValue: JsonNumber;
  terms: readonly MeasureTerm[]; recovery: Readonly<{ targetValue: JsonNumber; pull: JsonNumber }>;
  range: Readonly<{ minimum: JsonNumber; maximum: JsonNumber }>;
  escalationRules: readonly Readonly<{
    whenBelow: JsonNumber; driverId: StableId;
    transitions: readonly Readonly<{ fromLevelId: StableId; toLevelId: StableId }>[];
  }>[];
}>;
export type DomainModelContractV1 = Readonly<{
  schemaVersion: "domain-model-contract-v1";
  engineProtocolVersion: "pulse-domain-engine-protocol-v1";
  identity: Readonly<{ domainId: StableId; profileId: StableId; modelVersion: string; calibrationVersion: string; semanticPayloadHash: `sha256:${string}` }>;
  semanticPayload: Readonly<{
    scales: readonly OrdinalScale[]; drivers: readonly DriverDefinition[]; actions: readonly ActionDefinition[];
    propagation: PropagationDefinition; dimensions: readonly DimensionDefinition[]; curves: readonly CurveDefinition[];
    constraints: readonly ConstraintDefinition[]; measures: readonly NamedMeasureDefinition[];
  }>;
  metadata?: Readonly<{ name?: string; description?: string; labels?: Readonly<Record<string, string>> }>;
}>;

declare const structurallyValidatedBrand: unique symbol;
export type StructurallyValidatedDomainModelContractV1 = DomainModelContractV1 & Readonly<{
  [structurallyValidatedBrand]: "structurally-validated-domain-model-contract-v1";
}>;
