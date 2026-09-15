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

export const LEGACY_PROFILE_PROJECTION_V1_PROVENANCE_VERSION = "legacy-profile-projection-v1-provenance-v1" as const;

export const LEGACY_PROFILE_PROJECTION_V1_PROVENANCE = deepFreeze({
  version: LEGACY_PROFILE_PROJECTION_V1_PROVENANCE_VERSION,
  profiles: {
    "legacy-real-estate-v1": provenance("realEstate", "real-estate", "pilot-fastighet-v0.4", "legacy-global-v1", "sha256:898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc", "sha256:0b41416b3fa7078a80b939b115695e1c0836065383eb4f7b2f6d549a5ded2d99", "sha256:751fef9a3384efec184e0c83971b963efa3779b5d7aafeca1cae988223c70c50", "sha256:27576f25895e0189fc33ab38e1572c0324ec9a9365f87041eecc46f8f343d855"),
    "legacy-municipal-v1": provenance("municipal", "municipal", "pilot-fastighet-v0.4", "transport-causal-subset-v2", "sha256:81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b", "sha256:35f75ed34bc639755ce03090fabdbad9a2be57aa121b897132eabd981eebad99", "sha256:41e5d32fdc302fc39a432358692169464fe0b2b85537d9549ae4999832680de8", "sha256:d682421748ee83d20bee3b4562bb993b0bf17cef291d8cb4325e565af854fcbd"),
    "legacy-consulting-v1": provenance("consulting", "consulting", "pilot-fastighet-v0.4", "legacy-global-v1", "sha256:b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7", "sha256:570fd675a88ad9fd17305ddaab5a25ae768f9969b6f7cc997392776abe771529", "sha256:ec4d42c61c6a0fcb6862153319995f3fa290b7af769bdd47b7ac919f7c6b2395", "sha256:658381b072c2b0a82a8962ec7519376e997385ac5f02f5b7ee0cab6d7942cc6d"),
  },
} as const);

function provenance(sourceDomainId: string, projectedDomainId: string, modelVersion: string, calibrationVersion: string, sourceHash: `sha256:${string}`, projectedHash: `sha256:${string}`, compatibilityHash: `sha256:${string}`, envelopeHash: `sha256:${string}`) {
  const profileId = sourceDomainId === "realEstate" ? "legacy-real-estate-v1" : `legacy-${sourceDomainId}-v1`;
  return {
    source: { domainId: sourceDomainId, profileId, modelVersion, calibrationVersion, semanticPayloadVersion: "legacy-domain-profile-semantic-payload-v1", semanticPayloadHash: sourceHash },
    projected: { domainId: projectedDomainId, profileId: `${profileId}-domain-model-contract-v1`, modelVersion: `${modelVersion}-domain-model-contract-v1`, calibrationVersion: `${calibrationVersion}-domain-model-contract-v1`, semanticPayloadHash: projectedHash },
    compatibilityDeclarationsHash: compatibilityHash,
    envelopeHash,
    fixturePath: `src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/${profileId}.json`,
    schemaVersion: "legacy-profile-projection-v1",
    adapterVersion: "legacy-domain-profile-adapter-v1",
    engineProtocolVersion: "pulse-domain-engine-protocol-v1",
    semanticPayloadHashPolicy: "domain-model-contract-v1-semantic-payload-v1",
    declarationsVersion: "legacy-compatibility-declarations-v1",
  } as const;
}

function deepFreeze<T>(root: T): T {
  const pending: object[] = [root as object];
  while (pending.length) {
    const value = pending.pop()!;
    if (Object.isFrozen(value)) continue;
    Object.freeze(value);
    for (const child of Object.values(value)) if (child && typeof child === "object") pending.push(child);
  }
  return root;
}
