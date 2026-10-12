'use strict';
const C=require('../contracts/onboarding-v1/contract.cjs');
const {need,integer}=require('./price.cjs');
const METHOD='openai-responses-input-tokens/1';
// These are ALL model-input fields in the pinned SR provider's request.
// store, max_output_tokens and CE3's service_tier affect execution, not input.
function payload(raw) {
  const b=JSON.parse(raw);
  // Accept historical archives without a tier; new dispatches always use default.
  need(!Object.hasOwn(b,'service_tier') || b.service_tier==='default','INPUT_SERVICE_TIER');
  need(Object.keys(b).filter(k=>k!=='service_tier').sort().join(',')==='input,instructions,max_output_tokens,model,store,text','INPUT_REQUEST_FIELDS');
  need(typeof b.input==='string' && typeof b.instructions==='string' && b.text?.format?.type==='json_schema','INPUT_REQUEST_SHAPE');
  return {model:b.model,instructions:b.instructions,input:b.input,text:b.text};
}
function limitCheck(limit,profile) {
  need(integer(limit) && limit>0 && limit<=profile.input_token_bound,'INPUT_LIMIT');
  return limit;
}
function measurement(raw) {
  const value=payload(raw);
  return {request_sha256:C.hash(raw),count_payload_digest:C.digest(value),
    serialized_utf8_bytes:Buffer.byteLength(JSON.stringify(value)),
    // Bytes are diagnostics, NEVER an asserted billable token count.
    measurement_kind:'bytes_not_tokens'};
}
function validateCount(count,raw,mode) {
  const m=measurement(raw),model=payload(raw).model;
  need(count && count.method===(mode==='offline'?'synthetic-input-counter/1':METHOD),'INPUT_COUNT_PROVENANCE');
  need(count.model===model && count.request_sha256===m.request_sha256 && count.count_payload_digest===m.count_payload_digest,'INPUT_COUNT_BINDING');
  need(integer(count.input_tokens),'INPUT_COUNT_INVALID');
  return {...m,...count};
}
// Counting is a separate operation, not a new review stage. Do not assume
// that an undocumented tariff is zero. Live requires a selected fee ceiling.
function validateCountPrice(p,mode,digest=C.digest(p)) {
  need(p && p.schema_version==='ce3-input-count-price/1' && p.currency==='USD' && p.method===METHOD,'COUNT_PRICE_FORMAT');
  need(C.digest(p)===digest && integer(p.max_request_nusd),'COUNT_PRICE_BOUND');
  need(p.kind===(mode==='offline'?'synthetic':'verified-live'),'COUNT_PRICE_MODE');
  if(mode==='offline') need(p.source==='synthetic:input-count-test' && p.verification===null,'COUNT_PRICE_TEST_LABEL');
  else {
    const v=p.verification,u=new URL(p.source),start=Date.parse(v?.verified_at),end=Date.parse(v?.valid_until);
    need(u.protocol==='https:' && ['developers.openai.com','platform.openai.com'].includes(u.hostname) && !u.username && !u.password,'COUNT_PRICE_SOURCE');
    need(typeof v?.by==='string' && v.by.trim() && v.basis==='documented_maximum_fee_per_count_request' && typeof v.evidence==='string' && v.evidence.trim(),'COUNT_PRICE_UNVERIFIED');
    need(start<=Date.now() && Date.now()<=end && end-start<=7*86400000,'COUNT_PRICE_EXPIRED');
  }
  return p;
}
function validatePolicy(policy,profile,mode=profile.kind==='synthetic'?'offline':'live') {
  need(policy?.schema_version==='ce3-input-policy/1' && policy.method===METHOD,'INPUT_POLICY_VERSION');
  limitCheck(policy.token_limit,profile);
  validateCountPrice(policy.count_price,mode,policy.count_price_digest);
  need(typeof policy.count_price_digest==='string','COUNT_PRICE_DIGEST_REQUIRED');
  return policy;
}
function policy(tokenLimit,countPrice,priceDigest=C.digest(countPrice)) {
  return {schema_version:'ce3-input-policy/1',method:METHOD,token_limit:tokenLimit,count_price:structuredClone(countPrice),count_price_digest:priceDigest};
}
module.exports={METHOD,payload,limitCheck,measurement,validateCount,validatePolicy,validateCountPrice,policy};
