import { canonicalizeBaselineValueV1 } from "../baselineCanonicalizationV1";
import type { SemanticHashVerifiedDomainModelContractV1 } from "./contractV1";
import { sortContractIssues, type ContractIssue } from "./contractV1Issues";

export type IdentityCollisionResult=Readonly<{ok:true}>|Readonly<{ok:false;issues:readonly ContractIssue[]}>;
export function validateDomainModelContractIdentityCollisionsV1(inputs:readonly SemanticHashVerifiedDomainModelContractV1[]):IdentityCollisionResult{
  const groups=new Map<string,{hashes:Set<string>;paths:string[]}>();const issues:ContractIssue[]=[];
  inputs.forEach((input,index)=>{const tuple=canonicalizeBaselineValueV1([input.schemaVersion,input.engineProtocolVersion,input.identity.domainId,input.identity.profileId,input.identity.modelVersion,input.identity.calibrationVersion],"$domainModelContractIdentityTupleV1");const path=`/${index}/identity/semanticPayloadHash`;const group=groups.get(tuple);if(group){group.hashes.add(input.identity.semanticPayloadHash);group.paths.push(path);}else groups.set(tuple,{hashes:new Set([input.identity.semanticPayloadHash]),paths:[path]});});
  for(const group of groups.values())if(group.hashes.size>1)for(const path of group.paths)issues.push({code:"semantic-identity-hash-collision",path,message:"One semantic identity tuple must not bind different semantic payload hashes."});
  if(!issues.length)return Object.freeze({ok:true});return Object.freeze({ok:false,issues:Object.freeze(sortContractIssues(issues).map((issue) => Object.freeze(issue)))});
}
