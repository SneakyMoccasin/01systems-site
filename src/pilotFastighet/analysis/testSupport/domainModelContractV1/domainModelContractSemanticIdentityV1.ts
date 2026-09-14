import { canonicalizeBaselineValueV1, hashBaselineValueV1 } from "../baselineCanonicalizationV1";
import type { DomainModelContractV1, SemanticallyValidatedDomainModelContractV1 } from "./contractV1";
import { projectCanonicalPredicateV1 } from "./canonicalPredicateV1";

type Payload = DomainModelContractV1["semanticPayload"];
export type DomainModelContractSemanticIdentityProjectionV1 = Readonly<{
  schemaVersion: DomainModelContractV1["schemaVersion"];
  engineProtocolVersion: DomainModelContractV1["engineProtocolVersion"];
  identity: Readonly<Pick<DomainModelContractV1["identity"], "domainId" | "profileId" | "modelVersion" | "calibrationVersion">>;
  semanticPayload: Payload;
}>;

export function projectDomainModelContractSemanticIdentityV1(input: SemanticallyValidatedDomainModelContractV1): DomainModelContractSemanticIdentityProjectionV1 {
  const payload = structuredClone(input.semanticPayload) as Mutable<Payload>;
  payload.scales.sort(by("scaleId")); payload.scales.forEach((scale) => scale.levels.sort((a, b) => a.rank - b.rank || compare(a.levelId, b.levelId)));
  payload.drivers.sort(by("driverId")); payload.drivers.forEach((driver) => { driver.adverseLevelIds.sort(compare); driver.impacts.sort((a,b)=>compare(a.dimensionId,b.dimensionId) || compare(a.direction,b.direction) || compare(a.curveId,b.curveId)); });
  payload.actions.sort(by("actionId")); payload.actions.forEach((action) => action.effects.sort(by("driverId")));
  payload.propagation.edges.sort((a,b)=>compare(a.sourceDriverId,b.sourceDriverId) || compare(a.targetDriverId,b.targetDriverId) || compare(a.propagatedLevelId,b.propagatedLevelId) || compare(a.edgeId,b.edgeId));
  payload.propagation.edges.forEach((edge) => edge.triggerLevelIds.sort(compare));
  payload.dimensions.sort(by("dimensionId")); payload.curves.sort(by("curveId"));
  payload.constraints.sort(by("constraintId")); payload.constraints.forEach((constraint) => {
    constraint.activation = projectCanonicalPredicateV1(constraint.activation);
    if (constraint.sustain.kind !== "until-explicit-transition") constraint.sustain = projectCanonicalPredicateV1(constraint.sustain);
    if (constraint.deactivation.kind !== "none") constraint.deactivation = projectCanonicalPredicateV1(constraint.deactivation);
    constraint.allowedTransitions.sort((a,b)=>compare(a.from,b.from) || compare(a.to,b.to)); constraint.activeEffects.sort(by("dimensionId"));
  });
  payload.measures.sort(by("measureId")); payload.measures.forEach((measure) => {
    measure.terms.sort(by("termId")); measure.terms.forEach((term) => { if (term.source.kind === "aggregate-driver-pressure") term.source.driverIds.sort(compare); });
    measure.escalationRules.sort((a,b)=>compare(a.driverId,b.driverId) || compare(canonicalizeBaselineValueV1(a.whenBelow),canonicalizeBaselineValueV1(b.whenBelow)));
    measure.escalationRules.forEach((rule) => rule.transitions.sort((a,b)=>compare(a.fromLevelId,b.fromLevelId)));
  });
  return deepFreeze({ schemaVersion: input.schemaVersion, engineProtocolVersion: input.engineProtocolVersion,
    identity: { domainId: input.identity.domainId, profileId: input.identity.profileId, modelVersion: input.identity.modelVersion, calibrationVersion: input.identity.calibrationVersion },
    semanticPayload: payload as Payload });
}

export function canonicalizeDomainModelContractSemanticIdentityV1(input: SemanticallyValidatedDomainModelContractV1): string {
  return canonicalizeBaselineValueV1(projectDomainModelContractSemanticIdentityV1(input), "$domainModelContractSemanticIdentityV1");
}
export function hashDomainModelContractSemanticIdentityV1(input: SemanticallyValidatedDomainModelContractV1): `sha256:${string}` {
  return `sha256:${hashBaselineValueV1(projectDomainModelContractSemanticIdentityV1(input))}`;
}

type Mutable<T> = T extends readonly (infer U)[]
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
function by<K extends string>(key: K) { return <T extends Record<K,string>>(a:T,b:T) => compare(a[key],b[key]); }
function compare(a:string,b:string):number{return a<b?-1:a>b?1:0;}
function deepFreeze<T>(root:T):T{const stack:object[]=[root as object];while(stack.length){const value=stack.pop()!;if(Object.isFrozen(value))continue;Object.freeze(value);for(const child of Object.values(value))if(child&&typeof child==="object")stack.push(child);}return root;}
