export const LEGACY_PROFILE_PROJECTION_V1_SOURCE_FIELD_ACCOUNTING = Object.freeze({
  schemaVersion: "structurally-irrelevant-version-binding",
  identity: "projected-native-and-source-binding",
  applicableDrivers: "projected-native",
  defaultState: "projected-native",
  actions: "projected-native-or-compatibility-or-explicitly-excluded",
  supportedActionIds: "projected-native-admission-or-explicitly-excluded",
  propagationRelationships: "projected-native-or-compatibility-declaration",
  constraints: "projected-native-or-explicitly-excluded",
  marginEscalationRules: "projected-native",
  impactContract: "projected-native",
  curveConfiguration: "projected-native",
  clampPolicy: "projected-native",
} as const);
export type LegacyProfileProjectionV1SourceField = keyof typeof LEGACY_PROFILE_PROJECTION_V1_SOURCE_FIELD_ACCOUNTING;
export type LegacyProfileProjectionV1SourceFieldDisposition = (typeof LEGACY_PROFILE_PROJECTION_V1_SOURCE_FIELD_ACCOUNTING)[LegacyProfileProjectionV1SourceField];

export const LEGACY_PROFILE_PROJECTION_V1_NESTED_FIELD_SHAPES = Object.freeze({
  identity: ["calibrationVersion", "domainId", "modelVersion", "profileId"],
  action: ["actionId", "driverDeltas"],
  propagationRelationship: ["source", "targets"],
  propagationTarget: ["level", "target"],
  constraints: ["activeEffects", "refinancingEnabled", "refinancingMarginThreshold"],
  marginEscalationRule: ["driver", "lowTarget", "marginBelow", "moderateTarget"],
  impactContractEntry: ["impacts", "key"],
  impact: ["curve", "dimension", "direction"],
  curveConfigurationEntry: ["amplitude", "curve"],
  amplitude: ["base", "high", "low", "severe"],
  clampPolicy: ["maximum", "minimum"],
} as const);
