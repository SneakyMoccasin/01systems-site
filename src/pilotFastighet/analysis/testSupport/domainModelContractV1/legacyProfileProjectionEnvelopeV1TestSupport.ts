import assert from "node:assert/strict";
import { hashLegacyCompatibilityIdentityV1, validateLegacyProfileProjectionEnvelopeV1 } from "./hashLegacyProfileProjectionEnvelopeV1";
import { hashDomainModelContractSemanticIdentityV1 } from "./domainModelContractSemanticIdentityV1";
import { parseLegacyProfileProjectionEnvelopeV1Structure } from "./parseLegacyProfileProjectionEnvelopeV1Structure";
import { expectedCompatibilityV1, expectedNativeContractV1, type LegacyProfileIdV1, validateLegacyProfileProjectionEnvelopeV1Semantics } from "./validateLegacyProfileProjectionEnvelopeV1Semantics";

const SOURCES={
  "legacy-real-estate-v1":{domainId:"realEstate",modelVersion:"pilot-fastighet-v0.4",calibrationVersion:"legacy-global-v1",semanticPayloadHash:"sha256:898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc"},
  "legacy-municipal-v1":{domainId:"municipal",modelVersion:"pilot-fastighet-v0.4",calibrationVersion:"transport-causal-subset-v2",semanticPayloadHash:"sha256:81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b"},
  "legacy-consulting-v1":{domainId:"consulting",modelVersion:"pilot-fastighet-v0.4",calibrationVersion:"legacy-global-v1",semanticPayloadHash:"sha256:b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7"},
} as const;

export function makeValidEnvelope(profile:LegacyProfileIdV1){
  const expectedContract=expectedNativeContractV1(profile),contract={...expectedContract,identity:{...expectedContract.identity}},source=SOURCES[profile];
  const raw={schemaVersion:"legacy-profile-projection-v1",adapterVersion:"legacy-domain-profile-adapter-v1",engineProtocolVersion:"pulse-domain-engine-protocol-v1",source:{identity:{domainId:source.domainId,profileId:profile,modelVersion:source.modelVersion,calibrationVersion:source.calibrationVersion},semanticPayloadVersion:"legacy-domain-profile-semantic-payload-v1",semanticPayloadHash:source.semanticPayloadHash},projection:{identity:structuredClone(contract.identity),semanticPayloadHashPolicy:"domain-model-contract-v1-semantic-payload-v1",semanticPayloadHash:contract.identity.semanticPayloadHash,contract},compatibility:{declarationsVersion:"legacy-compatibility-declarations-v1",declarationsHash:`sha256:${"0".repeat(64)}`,...expectedCompatibilityV1(profile)}};
  let structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);if(!structural.ok)throw new Error(JSON.stringify(structural.issues));assert.equal(structural.ok,true);
  let semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);if(!semantic.ok)throw new Error(JSON.stringify(semantic.issues));assert.equal(semantic.ok,true);
  const projectedHash=hashDomainModelContractSemanticIdentityV1(semantic.value.projection.contract);raw.projection.identity.semanticPayloadHash=projectedHash;raw.projection.semanticPayloadHash=projectedHash;raw.projection.contract.identity.semanticPayloadHash=projectedHash;
  structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);if(!structural.ok)throw new Error(JSON.stringify(structural.issues));assert.equal(structural.ok,true);semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);if(!semantic.ok)throw new Error(JSON.stringify(semantic.issues));assert.equal(semantic.ok,true);
  raw.compatibility.declarationsHash=hashLegacyCompatibilityIdentityV1(semantic.value);
  structural=parseLegacyProfileProjectionEnvelopeV1Structure(raw);if(!structural.ok)throw new Error(JSON.stringify(structural.issues));assert.equal(structural.ok,true);semantic=validateLegacyProfileProjectionEnvelopeV1Semantics(structural.value);if(!semantic.ok)throw new Error(JSON.stringify(semantic.issues));assert.equal(semantic.ok,true);const validated=validateLegacyProfileProjectionEnvelopeV1(structural.value);if(!validated.ok)throw new Error(JSON.stringify(validated.issues));assert.equal(validated.ok,true);
  return {raw,structural:structural.value,semantic:semantic.value,validated:validated.value};
}
