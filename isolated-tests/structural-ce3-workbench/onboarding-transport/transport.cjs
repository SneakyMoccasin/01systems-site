'use strict';
const C = require('../contracts/onboarding-v1/contract.cjs');
const { cost, integer, need } = require('./price.cjs');
const Input=require('./input.cjs');
const ENDPOINT = 'https://api.openai.com/v1/responses';
const COUNT_ENDPOINT=ENDPOINT+'/input_tokens';
const MAX_BYTES = 8 * 1024 * 1024;
function redact(raw, secret) {
  let value=String(raw);
  for(const token of [secret, JSON.stringify(secret).slice(1,-1), encodeURIComponent(secret)].filter(Boolean)) value=value.split(token).join('[credential redacted]');
  return value.replace(/Bearer\s+[^\s"\\]+/gi,'Bearer [credential redacted]').replace(/\bsk-[A-Za-z0-9_-]+\b/g,'[credential redacted]');
}
// One native HTTPS request, fresh connection, no SDK, redirect, retry, or proxy.
// Credentials exist only in memory and the outgoing Authorization header.
function httpsRequest(endpoint,{body, signal, apiKey}) {
  const https=require('node:https');
  return new Promise(resolve=>{
    let text='', status=null, finished=false;
    const finish=error_code=>{if(!finished){finished=true; resolve({status,body:text,error_code});}};
    const req=https.request(endpoint,{method:'POST',agent:false,signal,headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{
      status=res.statusCode; res.setEncoding('utf8');
      res.on('data',chunk=>{text+=chunk; if(Buffer.byteLength(text)>MAX_BYTES){text=text.slice(0,MAX_BYTES); finish('RESPONSE_TOO_LARGE');req.destroy();}});
      res.on('end',()=>finish(null)); res.on('error',()=>finish('NETWORK_ERROR'));
    });
    req.on('error',()=>finish(signal?.aborted?'ABORTED_OR_TIMEOUT':'NETWORK_ERROR')); req.end(body);
  });
}
function httpsSend(options) {return httpsRequest(ENDPOINT,options);}
function httpsCount(options) {return httpsRequest(COUNT_ENDPOINT,options);}
function withAbort(promise,signal) {
  return new Promise(resolve=>{
    const abort=()=>done({status:null,body:'',error_code:'ABORTED_OR_TIMEOUT'});
    const done=value=>{signal?.removeEventListener('abort',abort);resolve(value);};
    if(signal?.aborted) return abort();
    signal?.addEventListener('abort',abort,{once:true});
    promise.then(done,()=>done({status:null,body:'',error_code:'TRANSPORT_ERROR'}));
  });
}
function usageOf(body,profile,slot) {
  const u=body?.usage;
  if(body?.model && body.model!==profile.model)return {usage:null,usage_cost_upper_nusd:null,error:'MODEL_IDENTITY_MISMATCH'};
  if(!u || !integer(u.input_tokens) || !integer(u.output_tokens) || !integer(u.total_tokens) || u.total_tokens!==u.input_tokens+u.output_tokens || body.model!==profile.model) return {usage:null,usage_cost_upper_nusd:null,error:'MISSING_OR_UNTRUSTED_USAGE'};
  let priced;try{priced=cost(profile,u.input_tokens,u.output_tokens);}catch{return {usage:{input_tokens:u.input_tokens,output_tokens:u.output_tokens,total_tokens:u.total_tokens},usage_cost_upper_nusd:null,error:'BOUND_VIOLATION'};}
  return {usage:{input_tokens:u.input_tokens,output_tokens:u.output_tokens,total_tokens:u.total_tokens},usage_cost_upper_nusd:priced,error:u.input_tokens>slot.input_tokens || u.output_tokens>slot.output_tokens?'BOUND_VIOLATION':null};
}
function fetchBoundary({journal,runId,profile,plan,apiKey,send,countSend,mode='offline'}) {
  const counts=new Map();
  let inputStopped=false;
  return async (url,options)=>{
    need(!inputStopped,'INPUT_RUN_STOPPED');
    need(url===ENDPOINT && options?.method==='POST','HTTP_BOUNDARY');
    need(options.headers?.Authorization===`Bearer ${apiKey}` && Object.keys(options.headers).sort().join(',')==='Authorization,Content-Type','HEADER_BOUNDARY');
    need(typeof options.body==='string' && Buffer.byteLength(options.body)<=MAX_BYTES,'REQUEST_SIZE');
    need(redact(options.body,apiKey)===options.body,'CREDENTIAL_IN_REQUEST');
    const body=JSON.parse(options.body);
    need(Object.keys(body).sort().join(',')==='input,instructions,max_output_tokens,model,store,text' && body.model===profile.model && body.store===false && typeof body.input==='string' && typeof body.instructions==='string','REQUEST_BODY');
    const stage=plan.slots.map(s=>s.stage).find(s=>body.text?.format?.name===`skeptical_reader_${s}_v01`);
    need(stage && body.text.format.type==='json_schema' && body.text.format.strict===true,'REQUEST_STAGE');
    const index=counts.get(stage)??0; need(index<2,'NO_THIRD_ATTEMPT');
    const attempt=index===0?'initial':'repair', slot=plan.slots.find(x=>x.stage===stage && x.attempt===attempt);
    need(body.max_output_tokens===slot.output_tokens,'OUTPUT_BOUND_CHANGED');
    need(!options.signal?.aborted,'ABORTED_BEFORE_DISPATCH');
    if(plan.input_policy) {
      Input.validatePolicy(plan.input_policy,profile,mode);
      need(typeof countSend==='function','INPUT_COUNTER_REQUIRED');
      // Snapshot all relevant fields. The unchanged original raw body below
      // is the only generation request that this count may authorize.
      const raw=options.body,countBody=JSON.stringify(Input.payload(raw)),measured=Input.measurement(raw);
      journal.countDispatch(runId,stage,attempt,{endpoint:COUNT_ENDPOINT,body:countBody,body_sha256:C.hash(countBody),...measured,automatic_retries:0});
      const countStart=performance.now();
      const response=await withAbort(Promise.resolve().then(()=>{
        need(!options.signal?.aborted,'ABORTED_BEFORE_COUNT_SEND');
        return countSend({body:countBody,signal:options.signal,apiKey});
      }),options.signal);
      const rawResponse=typeof response.body==='string'?response.body.slice(0,MAX_BYTES):'',safe=redact(rawResponse,apiKey);
      let data=null;try{data=JSON.parse(rawResponse);}catch{}
      const valid=!response.error_code && response.status>=200 && response.status<300 && safe===rawResponse && data?.object==='response.input_tokens' && integer(data.input_tokens);
      const count=valid?Input.validateCount({method:mode==='offline'?'synthetic-input-counter/1':Input.METHOD,model:body.model,request_sha256:measured.request_sha256,count_payload_digest:measured.count_payload_digest,input_tokens:data.input_tokens},raw,mode):null;
      const error=!valid?'INPUT_COUNT_UNAVAILABLE':count.input_tokens>slot.input_tokens?'INPUT_LIMIT_EXCEEDED':null;
      journal.countSettle(runId,stage,attempt,{state:valid?'observed':'uncertain',count,error,response:{status:Number.isInteger(response.status)?response.status:null,body:safe,body_sha256:C.hash(safe),redacted:safe!==rawResponse,duration_ms:Math.round(performance.now()-countStart)}});
      if(error){inputStopped=true;throw new Error(error);}
      need(options.body===raw,'INPUT_CHANGED_AFTER_COUNT');
      need(!options.signal?.aborted,'ABORTED_BEFORE_DISPATCH');
    }
    journal.dispatch(runId,stage,attempt,{endpoint:ENDPOINT,body:options.body,body_sha256:C.hash(options.body),automatic_retries:0}); counts.set(stage,index+1);
    const start=performance.now();
    let response;
    try { response=await withAbort(Promise.resolve().then(()=>{need(!options.signal?.aborted,'ABORTED_BEFORE_SEND');return send({body:options.body,signal:options.signal,apiKey});}),options.signal); }
    catch { response={status:null,body:'',error_code:'TRANSPORT_ERROR'}; }
    // Never persist response headers, request options, raw exceptions, or stacks.
    const raw=typeof response.body==='string'?response.body.slice(0,MAX_BYTES):'', safe=redact(raw,apiKey);
    let parsed=null;try{parsed=JSON.parse(raw);}catch{}
    const usage=usageOf(parsed,profile,slot), status=Number.isInteger(response.status)?response.status:null;
    const transportError=['ABORTED_OR_TIMEOUT','NETWORK_ERROR','RESPONSE_TOO_LARGE','TRANSPORT_ERROR'].includes(response.error_code)?response.error_code:response.error_code?'TRANSPORT_ERROR':null;
    const error=['BOUND_VIOLATION','MODEL_IDENTITY_MISMATCH'].includes(usage.error)?usage.error:safe!==raw?'CREDENTIAL_IN_RESPONSE':transportError || usage.error || (status===null || status<200 || status>=300?'HTTP_ERROR':null);
    journal.settle(runId,stage,attempt,{response:{status,body:safe,body_sha256:C.hash(safe),redacted:safe!==raw,duration_ms:Math.round(performance.now()-start)},...usage,error,transport_error:transportError,usage_error:usage.error});
    // Missing usage and any transport/credential anomaly are fail-closed; valid
    // but incomplete/schema-invalid responses still reach SR's real checks.
    if(error) throw new Error('BUDGETED_TRANSPORT_FAILED');
    return {ok:status>=200 && status<300,status,json:async()=>JSON.parse(raw),text:async()=>raw};
  };
}
module.exports={ENDPOINT,COUNT_ENDPOINT,MAX_BYTES,redact,httpsSend,httpsCount,fetchBoundary};
