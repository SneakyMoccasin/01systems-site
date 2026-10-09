'use strict';
const fs = require('node:fs');
const path = require('node:path');
const P = require('./protocol.json');
function credentials(file) {
  const env = {};
  if (file && fs.existsSync(file)) for (const line of fs.readFileSync(file,'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?(OPENAI_API_KEY|OPENAI_MODEL|SKEPTICAL_READER_PROVIDER)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  const apiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || env.OPENAI_MODEL;
  const provider = process.env.SKEPTICAL_READER_PROVIDER || env.SKEPTICAL_READER_PROVIDER || 'openai';
  if (!apiKey) throw new Error('MISSING_CREDENTIAL: OPENAI_API_KEY');
  if (provider !== 'openai' || model !== P.requested_model) throw new Error('CONFIGURATION: requires priced OpenAI model gpt-5.6-terra; no silent model substitution');
  return {apiKey,model};
}
function atomicJSON(file, value) {
  const temp = `${file}.tmp`, fd = fs.openSync(temp,'w',0o600);
  try {fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
  fs.renameSync(temp,file);
}
function inputBound(body) { return Buffer.byteLength(JSON.stringify(body),'utf8') + P.input_framing_margin; }
function assertBound(body) {
  if (body.model !== P.requested_model || body.max_output_tokens !== P.max_output_tokens || body.service_tier !== 'default' || body.store !== false || body.tools?.length || body.previous_response_id || body.conversation || inputBound(body) > P.max_input_token_bound) throw new Error('REQUEST_BOUND: unpriced or oversized request');
}
function usageCost(usage) {
  if (!usage || !Number.isInteger(usage.input_tokens) || !Number.isInteger(usage.output_tokens)) return null;
  const cached = usage.input_tokens_details?.cached_tokens || 0;
  if (cached < 0 || cached > usage.input_tokens || usage.input_tokens < 0 || usage.output_tokens < 0) throw new Error('USAGE_INVALID');
  return {list_price_usd:((usage.input_tokens-cached)*P.rates_per_million.input+cached*P.rates_per_million.cached_input+usage.output_tokens*P.rates_per_million.output)/1e6,cache_write_upper_usd:((usage.input_tokens-cached)*P.rates_per_million.cache_write+cached*P.rates_per_million.cached_input+usage.output_tokens*P.rates_per_million.output)/1e6};
}
class OpenAIAdapter {
  constructor({directory,apiKey,fetchImpl=fetch}) {this.directory=directory;this.apiKey=apiKey;this.fetchImpl=fetchImpl;}
  async generate(id,body) {
    assertBound(body);
    const ledgerFile = path.join(this.directory,'ledger.json');
    const ledger = fs.existsSync(ledgerFile) ? JSON.parse(fs.readFileSync(ledgerFile)) : {version:'ce3-eval-budget/1',reservations:[]};
    if (ledger.reservations.some(r=>r.id===id)) throw new Error('ALREADY_RESERVED: no automatic retry after any dispatch or crash');
    if (ledger.reservations.length >= P.max_calls || (ledger.reservations.length+1)*P.reserved_usd_per_call > P.hard_budget_usd) throw new Error('BUDGET_STOP');
    const dir = path.join(this.directory,id);fs.mkdirSync(dir,{recursive:true});
    atomicJSON(path.join(dir,'request.json'),body); // Excludes all headers/credentials.
    const started = new Date().toISOString();
    ledger.reservations.push({id,started,reserved_usd:P.reserved_usd_per_call,input_token_upper_bound:inputBound(body)});
    atomicJSON(ledgerFile,ledger); // Durable full reservation BEFORE dispatch, never released.
    const start = performance.now();
    let raw, status, requestId, error;
    try {
      const response = await this.fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(P.timeout_ms)});
      status=response.status;requestId=response.headers.get('x-request-id');
      const text = (await response.text()).replaceAll(this.apiKey,'[REDACTED]');
      fs.writeFileSync(path.join(dir,'response.txt'),text,{mode:0o600});
      try {raw=JSON.parse(text);} catch {error='NON_JSON_HTTP_RESPONSE';}
      if (!response.ok) error=`HTTP_${response.status}`;
    } catch(e) {error=e.name==='TimeoutError'?'TIMEOUT':'TRANSPORT_ERROR';}
    const cost = usageCost(raw?.usage);
    const result = {id,started,elapsed_ms:Math.round(performance.now()-start),http_status:status??null,request_id:requestId??null,requested_model:body.model,returned_model:raw?.model??null,usage:raw?.usage??null,cost,reserved_usd:P.reserved_usd_per_call,error:error??null};
    if (!error && (raw?.status!=='completed' || raw?.incomplete_details)) result.error='INCOMPLETE_RESPONSE';
    if (!error && raw?.model!==body.model && !raw?.model?.startsWith(`${body.model}-`)) result.error='MODEL_MISMATCH';
    if (raw?.usage && (raw.usage.input_tokens > P.max_input_token_bound || raw.usage.output_tokens > P.max_output_tokens)) result.error='USAGE_BOUND_EXCEEDED';
    atomicJSON(path.join(dir,'metrics.json'),result);
    return {raw,metrics:result};
  }
}
module.exports={credentials,atomicJSON,inputBound,assertBound,usageCost,OpenAIAdapter};
