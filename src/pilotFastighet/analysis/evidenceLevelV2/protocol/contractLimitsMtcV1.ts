export const CONTRACT_LIMITS_MTC_V1 = Object.freeze({
  maxInitiativeTypes: 256,
  maxEligibilityRulesPerInitiative: 64,
  maxResources: 128,
  maxConstraints: 128,
  maxEntitlements: 128,
  maxEvidenceDeclarations: 512,
  maxObservationNodes: 512,
  maxObservationEdges: 2_048,
  maxObservationDepth: 64,
  maxDisplayStringBytes: 512,
} as const);
