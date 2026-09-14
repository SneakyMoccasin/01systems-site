import { DOMAIN_ACTIONS } from "../../actionEffects";
import {
  resolveExecutableDomainProfile,
  type ExecutableDomainProfile,
  type ExecutableProfileId,
} from "../../executableDomainProfile";

export const LEGACY_DOMAIN_PROFILE_SEMANTIC_PAYLOAD_VERSION =
  "legacy-domain-profile-semantic-payload-v1" as const;

export type LegacyDomainProfileSemanticPayloadV1 = Readonly<{
  schemaVersion: typeof LEGACY_DOMAIN_PROFILE_SEMANTIC_PAYLOAD_VERSION;
  identity: Readonly<{
    domainId: string;
    profileId: string;
    modelVersion: string;
    calibrationVersion: string;
  }>;
  applicableDrivers: readonly string[];
  defaultState: Readonly<Record<string, string>>;
  actions: readonly Readonly<{
    actionId: string;
    driverDeltas: Readonly<Record<string, number>>;
  }>[];
  supportedActionIds: readonly string[];
  propagationRelationships: readonly Readonly<{
    source: string;
    targets: readonly Readonly<{ target: string; level: string }>[];
  }>[];
  constraints: Readonly<{
    refinancingEnabled: boolean;
    refinancingMarginThreshold: number;
    activeEffects: Readonly<Record<string, Readonly<Record<string, number>>>>;
  }>;
  marginEscalationRules: readonly Readonly<{
    marginBelow: number;
    driver: string;
    lowTarget: string;
    moderateTarget: string;
  }>[];
  impactContract: readonly Readonly<{
    key: string;
    impacts: readonly Readonly<{
      dimension: string;
      direction: string;
      curve: string;
    }>[];
  }>[];
  curveConfiguration: Readonly<Record<string, Readonly<{
    curve: string;
    amplitude: Readonly<{
      base: number;
      low: number;
      high: number;
      severe: number;
    }>;
  }>>>;
  clampPolicy: Readonly<{ minimum: number; maximum: number }>;
}>;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function projectResolvedProfile(
  profile: ExecutableDomainProfile
): LegacyDomainProfileSemanticPayloadV1 {
  const actions = Object.entries(profile.actionEffects)
    .map(([actionId, driverDeltas]) => ({
      actionId,
      driverDeltas: structuredClone(driverDeltas),
    }))
    .sort((left, right) => compareText(left.actionId, right.actionId));

  const payload = {
    schemaVersion: LEGACY_DOMAIN_PROFILE_SEMANTIC_PAYLOAD_VERSION,
    identity: {
      domainId: profile.domainId,
      profileId: profile.profileId,
      modelVersion: profile.modelVersion,
      calibrationVersion: profile.calibrationVersion,
    },
    applicableDrivers: [...profile.applicableDrivers],
    defaultState: structuredClone(profile.defaultState),
    actions,
    supportedActionIds: [...DOMAIN_ACTIONS[profile.domainId]].sort(compareText),
    propagationRelationships: Object.entries(profile.propagationRules).map(
      ([source, targets]) => ({
        source,
        targets: targets.map(({ target, level }) => ({ target, level })),
      })
    ),
    constraints: structuredClone(profile.constraints),
    marginEscalationRules: profile.marginEscalationRules.map((rule) => ({ ...rule })),
    impactContract: profile.impactContract.map(({ key, impacts }) => ({
      key,
      impacts: impacts.map(({ dimension, direction, curve }) => ({
        dimension,
        direction,
        curve,
      })),
    })),
    curveConfiguration: structuredClone(profile.curveConfiguration),
    clampPolicy: { ...profile.clampPolicy },
  } satisfies LegacyDomainProfileSemanticPayloadV1;

  return deepFreeze(payload);
}

export function projectLegacyDomainProfileSemanticPayloadV1(
  profileId: ExecutableProfileId
): LegacyDomainProfileSemanticPayloadV1 {
  return projectResolvedProfile(resolveExecutableDomainProfile(profileId));
}
