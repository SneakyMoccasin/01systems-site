'use strict';
const C = require('../contracts/onboarding-v1/contract.cjs');
const need = (v, code) => { if (!v) throw new Error(code); };
const integer = v => Number.isSafeInteger(v) && v >= 0;
const keys = (v, names) => need(v && C.digest(Object.keys(v).sort()) === C.digest(names.sort()), 'PRICE_FIELDS');
function validate(p, mode, digest = C.digest(p)) {
  keys(p, ['schema_version', 'kind', 'currency', 'provider', 'model', 'input_token_bound', 'input_nusd_per_token', 'output_nusd_per_token', 'source', 'model_source', 'dated', 'verification']);
  need(p.schema_version === 'ce3-price-profile/1' && p.currency === 'USD' && p.provider === 'openai', 'PRICE_VERSION_CURRENCY_PROVIDER');
  need(p.kind === (mode === 'offline' ? 'synthetic' : 'verified-live') && ['offline', 'live'].includes(mode), 'PRICE_MODE');
  need(typeof p.model === 'string' && /^[A-Za-z0-9._-]+$/.test(p.model), 'PRICE_MODEL');
  for (const key of ['input_token_bound', 'input_nusd_per_token', 'output_nusd_per_token']) need(integer(p[key]) && p[key] > 0, 'PRICE_BOUND_RATE');
  need(C.digest(p) === digest, 'PRICE_DIGEST');
  need(typeof p.dated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.dated) && Number.isFinite(Date.parse(p.dated)), 'PRICE_DATE');
  if (mode === 'offline') need(p.source.startsWith('synthetic:') && p.model_source.startsWith('synthetic:') && p.verification === null, 'SYNTHETIC_PRICE_LABEL');
  else {
    const v = p.verification;
    keys(v, ['by', 'verified_at', 'valid_until', 'rate_basis', 'input_bound_basis', 'model_identity', 'structured_output_supported']);
    need(typeof v.by === 'string' && v.by.trim() && v.model_identity === p.model && v.structured_output_supported === true, 'PRICE_ATTESTATION');
    need(v.rate_basis === 'upper_bound_all_input_and_output_tiers' && v.input_bound_basis === 'documented_maximum_billable_input_tokens', 'PRICE_UPPER_BOUND_REQUIRED');
    const start = Date.parse(v.verified_at), end = Date.parse(v.valid_until);
    need(Number.isFinite(start) && Number.isFinite(end) && start <= Date.now() && Date.now() <= end && end - start <= 7 * 86400000 && Date.parse(p.dated) <= start && start - Date.parse(p.dated) < 8 * 86400000, 'PRICE_EXPIRED_OR_UNVERIFIED');
    for (const source of [p.source, p.model_source]) { const u = new URL(source); need(u.protocol === 'https:' && ['developers.openai.com', 'platform.openai.com', 'openai.com'].includes(u.hostname) && !u.username && !u.password, 'PRICE_OFFICIAL_SOURCE'); }
    need(!/synthetic|fixture|test-double|offline-scripted/i.test(p.model), 'LIVE_PRICE_TEST_MODEL');
  }
  return structuredClone(p);
}
function cost(p, input, output) {
  need(integer(input) && integer(output), 'USAGE_INTEGER');
  const value = input * p.input_nusd_per_token + output * p.output_nusd_per_token;
  need(integer(value), 'COST_OVERFLOW'); return value;
}
function limits(config) {
  return ['grounded_claim_extraction', 'grounded_support_assessment', 'grounded_adjudication'].flatMap(stage => ['initial', 'repair'].map(attempt => ({ stage, attempt, output_tokens: config.maxOutputTokens[stage][attempt] })));
}
function plan(p, config, inputPolicy = null) {
  if(inputPolicy) require('./input.cjs').validatePolicy(inputPolicy,p);
  const input = inputPolicy?.token_limit ?? p.input_token_bound;
  const fee = inputPolicy?.count_price.max_request_nusd ?? 0;
  const slots = limits(config).map(x => ({ ...x, input_tokens: input,
    ...(inputPolicy ? {count_reservation_nusd:fee} : {}), reservation_nusd: cost(p, input, x.output_tokens)+fee }));
  const maximum_nusd = slots.reduce((n, x) => n + x.reservation_nusd, 0); need(integer(maximum_nusd), 'COST_OVERFLOW');
  return { schema_version: inputPolicy ? 'ce3-transport-plan/2' : 'ce3-transport-plan/1', ...(inputPolicy ? {input_policy:structuredClone(inputPolicy),maximum_count_calls:slots.length,maximum_http_calls:slots.length*2} : {}), currency: 'USD', slots, maximum_calls: slots.length, maximum_input_tokens: slots.reduce((n,x) => n+x.input_tokens,0), maximum_output_tokens: slots.reduce((n,x) => n+x.output_tokens,0), maximum_nusd };
}
function usd(value) { need(typeof value === 'string' && /^\d+(\.\d{1,9})?$/.test(value), 'EXPLICIT_USD_AMOUNT_REQUIRED'); const [a,b=''] = value.split('.'); const n = Number(BigInt(a) * 1000000000n + BigInt(b.padEnd(9,'0'))); need(integer(n) && n > 0, 'BUDGET_AMOUNT'); return n; }
module.exports = { validate, cost, plan, usd, integer, need };
