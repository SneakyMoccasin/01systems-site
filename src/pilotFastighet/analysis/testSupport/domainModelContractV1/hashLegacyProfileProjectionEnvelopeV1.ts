import { canonicalizeBaselineValueV1, hashBaselineValueV1 } from "../baselineCanonicalizationV1";
import { canonicalizeDomainModelContractSemanticIdentityV1, hashDomainModelContractSemanticIdentityV1, projectDomainModelContractSemanticIdentityV1 } from "./domainModelContractSemanticIdentityV1";
import { sortContractIssues, type ContractIssue } from "./contractV1Issues";
import type { DerivedLegacyProjectionDiagnosticV1, HashVerifiedLegacyProfileProjectionEnvelopeV1, RawLegacyProfileProjectionEnvelopeV1, SemanticallyValidatedLegacyProfileProjectionEnvelopeV1, ValidatedLegacyProfileProjectionEnvelopeV1 } from "./legacyProfileProjectionEnvelopeV1";
import { verifyDomainModelContractSemanticHashV1 } from "./parseDomainModelContractV1";
import { validateLegacyProfileProjectionEnvelopeV1Semantics } from "./validateLegacyProfileProjectionEnvelopeV1Semantics";

export const LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_HASH_ISSUE_CODES=Object.freeze(["compatibility-declarations-hash-mismatch","projected-contract-hash-mismatch","projected-identity-hash-mismatch","projected-projection-hash-mismatch"] as const);
export type LegacyProfileProjectionEnvelopeV1HashIssueCode=(typeof LEGACY_PROFILE_PROJECTION_ENVELOPE_V1_HASH_ISSUE_CODES)[number];
export type LegacyProfileProjectionEnvelopeV1HashResult=Readonly<{ok:true;value:HashVerifiedLegacyProfileProjectionEnvelopeV1}>|Readonly<{ok:false;issues:readonly ContractIssue[]}>;
export type LegacyProfileProjectionEnvelopeV1ValidationResult=Readonly<{ok:true;value:ValidatedLegacyProfileProjectionEnvelopeV1}>|Readonly<{ok:false;issues:readonly ContractIssue[]}>;
export type LegacyCompatibilityIdentityProjectionV1=Readonly<Omit<RawLegacyProfileProjectionEnvelopeV1["compatibility"],"declarationsHash">>;

export function projectLegacyCompatibilityIdentityV1(input:SemanticallyValidatedLegacyProfileProjectionEnvelopeV1):LegacyCompatibilityIdentityProjectionV1{const {declarationsHash:ignored,...projection}=structuredClone(input.compatibility);void ignored;return freeze(projection);}
export function canonicalizeLegacyCompatibilityIdentityV1(input:SemanticallyValidatedLegacyProfileProjectionEnvelopeV1):string{return canonicalizeBaselineValueV1(projectLegacyCompatibilityIdentityV1(input),"$legacyCompatibilityIdentityV1");}
export function hashLegacyCompatibilityIdentityV1(input:SemanticallyValidatedLegacyProfileProjectionEnvelopeV1):`sha256:${string}`{return `sha256:${hashBaselineValueV1(projectLegacyCompatibilityIdentityV1(input))}`;}
export function verifyLegacyProfileProjectionEnvelopeV1Hashes(input:SemanticallyValidatedLegacyProfileProjectionEnvelopeV1):LegacyProfileProjectionEnvelopeV1HashResult{
  const issues:ContractIssue[]=[];const actual=hashDomainModelContractSemanticIdentityV1(input.projection.contract);
  if(input.projection.contract.identity.semanticPayloadHash!==actual)issues.push(issue("projected-contract-hash-mismatch","/projection/contract/identity/semanticPayloadHash"));
  if(input.projection.identity.semanticPayloadHash!==actual)issues.push(issue("projected-identity-hash-mismatch","/projection/identity/semanticPayloadHash"));
  if(input.projection.semanticPayloadHash!==actual)issues.push(issue("projected-projection-hash-mismatch","/projection/semanticPayloadHash"));
  if(input.compatibility.declarationsHash!==hashLegacyCompatibilityIdentityV1(input))issues.push(issue("compatibility-declarations-hash-mismatch","/compatibility/declarationsHash"));
  if(issues.length)return Object.freeze({ok:false,issues:Object.freeze(sortContractIssues(issues))});
  const nested=verifyDomainModelContractSemanticHashV1(input.projection.contract);if(!nested.ok)return Object.freeze({ok:false,issues:Object.freeze(nested.issues.map(x=>({code:"projected-contract-hash-mismatch",path:`/projection/contract${x.path}`,message:x.message})))});
  const value:RawLegacyProfileProjectionEnvelopeV1={...structuredClone(input),projection:{...structuredClone(input.projection),contract:nested.value}};return Object.freeze({ok:true,value:freeze(value) as HashVerifiedLegacyProfileProjectionEnvelopeV1});
}
export function projectLegacyProfileProjectionEnvelopeHashV1(input:HashVerifiedLegacyProfileProjectionEnvelopeV1):HashVerifiedLegacyProfileProjectionEnvelopeV1{return freeze(structuredClone(input));}
export function canonicalizeLegacyProfileProjectionEnvelopeV1(input:HashVerifiedLegacyProfileProjectionEnvelopeV1):string{return canonicalizeBaselineValueV1(projectLegacyProfileProjectionEnvelopeHashV1(input),"$legacyProfileProjectionEnvelopeV1");}
export function hashLegacyProfileProjectionEnvelopeV1(input:HashVerifiedLegacyProfileProjectionEnvelopeV1):`sha256:${string}`{return `sha256:${hashBaselineValueV1(projectLegacyProfileProjectionEnvelopeHashV1(input))}`;}
export function validateLegacyProfileProjectionEnvelopeV1(input:Parameters<typeof validateLegacyProfileProjectionEnvelopeV1Semantics>[0]):LegacyProfileProjectionEnvelopeV1ValidationResult{const semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(input);if(!semantic.ok)return semantic;const verified=verifyLegacyProfileProjectionEnvelopeV1Hashes(semantic.value);if(!verified.ok)return verified;return Object.freeze({ok:true,value:freeze({envelope:verified.value,diagnostics:deriveLegacyProfileProjectionDiagnosticsV1(verified.value)})});}
export function deriveLegacyProfileProjectionDiagnosticsV1(input:HashVerifiedLegacyProfileProjectionEnvelopeV1):readonly DerivedLegacyProjectionDiagnosticV1[]{const out:DerivedLegacyProjectionDiagnosticV1[]=[];const c=input.compatibility;
  c.actionAdmission.entries.forEach((x,i)=>out.push(d("legacy-action-admission-declared",`/compatibility/actionAdmission/entries/${i}`,`legacy-action-admission-declared:${x.sourceProfileId}:${x.sourceActionId}:${x.outputDisposition}`)));
  c.ignoredUnknownDriverDeltas.forEach((x,i)=>out.push(d("legacy-ignored-unknown-driver-delta",`/compatibility/ignoredUnknownDriverDeltas/${i}`,`legacy-ignored-unknown-driver-delta:${x.sourceProfileId}:${x.sourceActionId}:${x.sourceDriverId}:${x.delta}`)));
  c.compatibilityOnlyActions.forEach((x,i)=>out.push(d("legacy-compatibility-only-action",`/compatibility/compatibilityOnlyActions/${i}`,`legacy-compatibility-only-action:${x.sourceActionId}:omitted-from-native-actions`)));
  if(c.sustainThresholdOverride)out.push(d("legacy-sustain-threshold-override-declared","/compatibility/sustainThresholdOverride","legacy-sustain-threshold-override-declared:not-covered-by-m0b-engine-goldens"));
  out.push(d("legacy-propagation-execution-semantics-declared","/compatibility/propagation/executionSemantics",`legacy-propagation-execution-semantics-declared:${c.propagation.executionSemantics.algorithm}`));
  out.push(d("legacy-propagation-evaluation-order-declared","/compatibility/propagation/sourceEvaluationOrder",`legacy-propagation-evaluation-order-declared:${c.propagation.edgeEvaluationOrder}`));
  c.propagation.compatibilityOnlyEdges.forEach((x,i)=>out.push(d("legacy-propagation-only-edge",`/compatibility/propagation/compatibilityOnlyEdges/${i}`,`legacy-propagation-only-edge:${x.compatibilityEdgeId}`)));
  c.excludedSourceValues.forEach((x,i)=>out.push(d("legacy-source-value-excluded",`/compatibility/excludedSourceValues/${i}`,`legacy-source-value-excluded:${x.reasonCode}:${x.sourcePath}`)));
  c.legacyRegistryProjection.entries.forEach((x,i)=>out.push(d("legacy-registry-output-materialization-declared",`/compatibility/legacyRegistryProjection/entries/${i}`,`legacy-registry-output-materialization-declared:${x.sourceProfileId}:${x.sourceRegistryKey}`)));
  out.push(d("legacy-curve-fallback-deferred-to-m1e","/compatibility/curveFallbackDeclaration",`legacy-curve-fallback-deferred-to-m1e:${c.curveFallbackDeclaration.policyId}`));
  return freeze(out.sort((a,b)=>compare(a.code,b.code)||compare(a.path,b.path)||compare(a.message,b.message)));
}
export {projectDomainModelContractSemanticIdentityV1,canonicalizeDomainModelContractSemanticIdentityV1,hashDomainModelContractSemanticIdentityV1};
function d(code:DerivedLegacyProjectionDiagnosticV1["code"],path:string,message:string):DerivedLegacyProjectionDiagnosticV1{return {code,path,message};}function issue(code:LegacyProfileProjectionEnvelopeV1HashIssueCode,path:string):ContractIssue{return {code,path,message:"Declared hash must match its named canonical identity projection."};}function compare(a:string,b:string):number{return a<b?-1:a>b?1:0;}function freeze<T>(root:T):T{const stack:object[]=[root as object];while(stack.length){const x=stack.pop()!;if(Object.isFrozen(x))continue;Object.freeze(x);for(const y of Object.values(x))if(y&&typeof y==="object")stack.push(y);}return root;}
