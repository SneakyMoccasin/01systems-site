import type { DomainKey } from "@/src/i18n/pulseLanguage";
import { ACTION_EFFECTS, type ActionEffectsMap, type ActionKey } from "./actionEffects";
import { PARAMETER_CURVE_CONFIG, type ParameterCurveConfig } from "./curveConfig";
import type { RiskLevel, ParameterKey } from "./impactContract";
import { REAL_ESTATE_IMPACT_CONTRACT } from "./impactContract";
import { defaultRiskState } from "./presetRiskMapping";
import { RISK_PROPAGATION } from "./riskPropagation";
import type { ExecutableImpactParameter } from "./computeDimensionMultipliers";

export type ExecutableProfileId =
  | "legacy-real-estate-v1"
  | "legacy-municipal-v1"
  | "legacy-consulting-v1";

export type ExecutableConstraintPolicy = Readonly<{
  refinancingEnabled: boolean;
  refinancingMarginThreshold: number;
  activeEffects: Readonly<
    Record<"RefinancingConstraint" | "LiquidityConstraint" | "CovenantConstraint", Readonly<{
      load?: number;
      cost?: number;
      recovery?: number;
    }>>
  >;
}>;

export type ExecutableMarginEscalationRule = Readonly<{
  marginBelow: number;
  driver: ParameterKey;
  lowTarget: RiskLevel;
  moderateTarget: RiskLevel;
}>;

export type ExecutableDomainProfile = Readonly<{
  profileId: ExecutableProfileId;
  domainId: DomainKey;
  modelVersion: "pilot-fastighet-v0.4";
  calibrationVersion:
    | "legacy-global-v1"
    | "transport-causal-subset-v2";
  applicableDrivers: readonly ParameterKey[];
  defaultState: Readonly<Record<string, RiskLevel>>;
  actionEffects: Readonly<Record<ActionKey, Readonly<ActionEffectsMap>>>;
  propagationRules: Readonly<
    Record<string, readonly Readonly<{ target: string; level: RiskLevel }>[]>
  >;
  constraints: ExecutableConstraintPolicy;
  marginEscalationRules: readonly ExecutableMarginEscalationRule[];
  impactContract: readonly ExecutableImpactParameter[];
  curveConfiguration: Readonly<Record<string, Readonly<ParameterCurveConfig>>>;
  clampPolicy: Readonly<{ minimum: number; maximum: number }>;
}>;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

const LEGACY_EXECUTABLE_CONTRACT = deepFreeze({
  applicableDrivers: REAL_ESTATE_IMPACT_CONTRACT.map((parameter) => parameter.key),
  defaultState: structuredClone(defaultRiskState),
  actionEffects: structuredClone(ACTION_EFFECTS),
  propagationRules: structuredClone(RISK_PROPAGATION),
  constraints: {
    refinancingEnabled: true,
    refinancingMarginThreshold: 0.8,
    activeEffects: {
      RefinancingConstraint: { cost: 1.15, recovery: 0.8 },
      LiquidityConstraint: { cost: 1.1, load: 1.05 },
      CovenantConstraint: { recovery: 0.6 },
    },
  },
  marginEscalationRules: [
    {
      marginBelow: -1,
      driver: "interestRateExposureRisk",
      lowTarget: "MODERATE",
      moderateTarget: "HIGH",
    },
  ],
  impactContract: REAL_ESTATE_IMPACT_CONTRACT.map(({ key, impacts }) => ({
    key,
    impacts: structuredClone(impacts),
  })),
  curveConfiguration: structuredClone(PARAMETER_CURVE_CONFIG),
  clampPolicy: { minimum: -3, maximum: 3 },
} as const);

function createLegacyProfile(
  profileId: ExecutableProfileId,
  domainId: DomainKey,
  overrides?: Readonly<{
    calibrationVersion?: ExecutableDomainProfile["calibrationVersion"];
    constraints?: ExecutableConstraintPolicy;
    marginEscalationRules?: readonly ExecutableMarginEscalationRule[];
    propagationRules?: ExecutableDomainProfile["propagationRules"];
  }>
): ExecutableDomainProfile {
  return deepFreeze({
    profileId,
    domainId,
    modelVersion: "pilot-fastighet-v0.4",
    calibrationVersion: "legacy-global-v1",
    ...LEGACY_EXECUTABLE_CONTRACT,
    ...overrides,
  }) as ExecutableDomainProfile;
}

const MUNICIPAL_APPROVED_PROPAGATION_EDGES = new Set([
  "accessibility->demandRisk",
  "budget_pressure->capitalCommitmentRigidityRisk",
  "operationalEfficiencyRisk->maintenanceIntensityRisk",
]);

const MUNICIPAL_PROPAGATION_RULES = deepFreeze(
  Object.fromEntries(
    Object.entries(LEGACY_EXECUTABLE_CONTRACT.propagationRules)
      .map(([source, effects]) => [
        source,
        effects.filter(
          ({ target }) =>
            MUNICIPAL_APPROVED_PROPAGATION_EDGES.has(`${source}->${target}`)
        ),
      ] as const)
      .filter(([, effects]) => effects.length > 0)
  )
) as ExecutableDomainProfile["propagationRules"];

const PROFILES = deepFreeze({
  "legacy-real-estate-v1": createLegacyProfile("legacy-real-estate-v1", "realEstate"),
  "legacy-municipal-v1": createLegacyProfile("legacy-municipal-v1", "municipal", {
    calibrationVersion: "transport-causal-subset-v2",
    constraints: {
      ...LEGACY_EXECUTABLE_CONTRACT.constraints,
      refinancingEnabled: false,
    },
    marginEscalationRules: [],
    propagationRules: MUNICIPAL_PROPAGATION_RULES,
  }),
  "legacy-consulting-v1": createLegacyProfile("legacy-consulting-v1", "consulting"),
} satisfies Record<ExecutableProfileId, ExecutableDomainProfile>);

const DOMAIN_PROFILE_IDS = deepFreeze({
  realEstate: "legacy-real-estate-v1",
  municipal: "legacy-municipal-v1",
  consulting: "legacy-consulting-v1",
} satisfies Record<DomainKey, ExecutableProfileId>);

export const LEGACY_COMPATIBILITY_PROFILE_ID: ExecutableProfileId =
  "legacy-real-estate-v1";

export function getExecutableProfileIdForDomain(domainId: DomainKey): ExecutableProfileId {
  const profileId = DOMAIN_PROFILE_IDS[domainId];
  if (!profileId) throw new Error(`Unknown executable domain: ${String(domainId)}`);
  return profileId;
}

export function resolveExecutableDomainProfile(
  profileId: ExecutableProfileId,
  expectedDomainId?: DomainKey
): ExecutableDomainProfile {
  const profile = PROFILES[profileId];
  if (!profile) throw new Error(`Unknown executable profile: ${String(profileId)}`);
  if (expectedDomainId && profile.domainId !== expectedDomainId) {
    throw new Error(
      `Executable profile ${profileId} does not match domain ${expectedDomainId}.`
    );
  }
  return profile;
}

/** Explicit compatibility path for historical/profile-less analysis inputs. */
export function resolveLegacyCompatibilityProfile(): ExecutableDomainProfile {
  return resolveExecutableDomainProfile(LEGACY_COMPATIBILITY_PROFILE_ID);
}
