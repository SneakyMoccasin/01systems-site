import type { DomainModelContractV1, SemanticHashVerifiedDomainModelContractV1, SemanticallyValidatedDomainModelContractV1 } from "./contractV1";
import type { ContractIssue } from "./contractV1Issues";
import { hashDomainModelContractSemanticIdentityV1 } from "./domainModelContractSemanticIdentityV1";
import { parseDomainModelContractV1Structure, parseDomainModelContractV1StructureJson } from "./parseDomainModelContractV1Structure";
import { validateDomainModelContractV1Semantics } from "./validateDomainModelContractV1Semantics";

export type DomainModelContractV1ParseResult = Readonly<{ok:true;value:SemanticHashVerifiedDomainModelContractV1}>|Readonly<{ok:false;issues:readonly ContractIssue[]}>;
export function verifyDomainModelContractSemanticHashV1(input:SemanticallyValidatedDomainModelContractV1):DomainModelContractV1ParseResult{
  const actual=hashDomainModelContractSemanticIdentityV1(input);
  if(actual!==input.identity.semanticPayloadHash)return Object.freeze({ok:false,issues:Object.freeze([Object.freeze({code:"semantic-payload-hash-mismatch",path:"/identity/semanticPayloadHash",message:"Declared semantic payload hash must match the canonical semantic identity projection."})])});
  return Object.freeze({ok:true,value:deepFreeze(structuredClone(input) as DomainModelContractV1) as SemanticHashVerifiedDomainModelContractV1});
}
export function parseDomainModelContractV1(input:unknown):DomainModelContractV1ParseResult{return compose(parseDomainModelContractV1Structure(input));}
export function parseDomainModelContractV1Json(input:string):DomainModelContractV1ParseResult{return compose(parseDomainModelContractV1StructureJson(input));}
function compose(structural:ReturnType<typeof parseDomainModelContractV1Structure>):DomainModelContractV1ParseResult{if(!structural.ok)return structural;const semantic=validateDomainModelContractV1Semantics(structural.value);if(!semantic.ok)return semantic;return verifyDomainModelContractSemanticHashV1(semantic.value);}
function deepFreeze<T>(root:T):T{const stack:object[]=[root as object];while(stack.length){const value=stack.pop()!;if(Object.isFrozen(value))continue;Object.freeze(value);for(const child of Object.values(value))if(child&&typeof child==="object")stack.push(child);}return root;}
