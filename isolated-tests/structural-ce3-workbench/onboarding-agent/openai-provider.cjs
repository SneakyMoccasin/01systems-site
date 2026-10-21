'use strict';
const fs=require('node:fs'),path=require('node:path');
const {C,need,verifyCapabilities}=require('./protocol.cjs');
const Price=require('../onboarding-transport/price.cjs');
const {Journal}=require('../onboarding-transport/journal.cjs');
const {httpsSend,redact,ENDPOINT}=require('../onboarding-transport/transport.cjs');
const {wireRequest,resolveResponse}=require('./openai-wire.cjs');
const {diagnosticForAttempt}=require('./diagnostics.cjs');
const POLICY_SHA='f6c0db3c00312727afaad65ccbafbde6c046c75b5fdde11372ee0ac457df1f86';
const defaultJournal=path.join(__dirname,'../local-data/onboarding-agent-first-live/budget.sqlite');
function policy(){
  const raw=fs.readFileSync(path.join(__dirname,'live-policy.json'));
  need(C.hash(raw)===POLICY_SHA,'LIVE_POLICY_CHANGED_REVIEW_REQUIRED');
  const p=JSON.parse(raw);Price.validate(p.price,'live');verifyCapabilities();
  need(Price.cost(p.price,p.price.input_token_bound,p.output_tokens)===p.per_call_nusd&&p.per_call_nusd*p.maximum_calls===p.total_nusd,'LIVE_POLICY_COST');
  return p;
}
function config(p){return {schema_version:'ce3-budget/1',currency:'USD',mode:'live',total_limit_nusd:p.total_nusd,per_run_limit_nusd:p.total_nusd};}
function plan(p){return {schema_version:'ce3-transport-plan/1',currency:'USD',maximum_calls:p.maximum_calls,maximum_nusd:p.total_nusd,
  slots:Array.from({length:p.maximum_calls},(_,i)=>({stage:'onboarding_draft',attempt:String(i+1),input_tokens:p.price.input_token_bound,output_tokens:p.output_tokens,reservation_nusd:p.per_call_nusd}))};}
function checkJournal(j,p){const s=j.snapshot();need(s.runs.length===1&&s.runs[0].id===p.id&&s.runs[0].profile_digest===C.digest(p.price)&&C.digest(s.runs[0].plan)===C.digest(plan(p))&&s.runs[0].prepared_digest===C.digest(p),'LIVE_JOURNAL_BINDING');return s;}
function prepare(file=defaultJournal){
  const p=policy();fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  if(fs.existsSync(file)){const j=new Journal(file,config(p));try{checkJournal(j,p);}finally{j.close();}return {journal:file,already_prepared:true,maximum_usd:p.total_nusd/1e9};}
  const j=Journal.create(file,config(p));
  try{j.begin(p.id,p.price,plan(p),C.digest(p),{purpose:'CE3 onboarding draft only',count_calls:0,policy_sha256:POLICY_SHA});}finally{j.close();}
  return {journal:file,already_prepared:false,maximum_usd:p.total_nusd/1e9};
}
function status(file=defaultJournal){
  const p=policy();
  if(!fs.existsSync(file))return {prepared:false,journal:file,maximum_calls:p.maximum_calls,maximum_usd:p.total_nusd/1e9,network_calls:0};
  const j=new Journal(file,config(p));try{return budgetStatus(j,p);}finally{j.close();}
}
function budgetStatus(j,p){
  const s=checkJournal(j,p),a=s.runs[0].attempts,dispatched=a.filter(t=>t.request!==null).length;
  return {prepared:true,maximum_calls:p.maximum_calls,dispatched,maximum_usd:p.total_nusd/1e9,reserved_usd:s.liability_nusd/1e9,maximum_count_calls:0,
    last_failure:diagnosticForAttempt([...a].reverse().find(t=>t.error||t.state==='uncertain')),
    stopped:s.frozen||s.events.some(e=>e.detail?.code==='DRAFT_REJECTED')||a.some(t=>t.error||t.state==='uncertain')||dispatched===p.maximum_calls,valid_until:p.price.verification.valid_until};
}
class OpenAIProvider {
  #key;#journal;#send;#test;
  constructor({executeLive=false,apiKey,journalFile=defaultJournal,testTransport}={}){
    need(executeLive===true,'LIVE_OPT_IN_REQUIRED');
    const p=policy();need(typeof apiKey==='string'&&apiKey.length>=8&&!/[\s\r\n]/.test(apiKey),'OPENAI_API_KEY_REQUIRED');
    this.#key=apiKey;this.#test=typeof testTransport==='function';this.#send=testTransport??httpsSend;
    this.#journal=new Journal(journalFile,config(p));
    try{checkJournal(this.#journal,p);}catch(e){this.#journal.close();throw e;}
    this.identity={kind:this.#test?'scripted_test':'openai_live',id:'openai-responses-draft/1',model:p.price.model,policy_digest:C.digest(p),
      label:this.#test?'FÖRSKRIVNA HTTP-TESTSVAR – INGEN MODELLKÖRNING':`OpenAI ${p.price.model} · betald språkmodell · högst ${p.maximum_calls} anrop, ${p.total_nusd/1e9} USD för hela provet`};
  }
  close(){this.#journal.close();}
  status(){return budgetStatus(this.#journal,policy());}
  rejectDraft(){this.#journal.note(policy().id,'DRAFT_REJECTED');}
  async generate(req){
    const p=policy(),s=checkJournal(this.#journal,p),attempts=s.runs[0].attempts;
    need(!s.frozen&&!s.events.some(e=>e.detail?.code==='DRAFT_REJECTED')&&!attempts.some(t=>t.error||t.state==='uncertain'),'LIVE_STOPPED_UNCERTAIN_OR_FAILED');
    const slot=attempts.find(t=>t.state==='planned');need(slot,'LIVE_CALL_LIMIT');
    const raw=JSON.stringify(wireRequest(req,p));
    need(Buffer.byteLength(raw)<=p.maximum_wire_bytes,'LIVE_REQUEST_TOO_LARGE_NO_TRUNCATION');
    need(redact(raw,this.#key)===raw,'CREDENTIAL_IN_REQUEST');
    // SQLite BEGIN IMMEDIATE makes this slot single-use across processes. The
    // full three-slot liability was fsynced at prepare, before any network use.
    this.#journal.dispatch(p.id,slot.stage,slot.attempt,{endpoint:ENDPOINT,body:raw,body_sha256:C.hash(raw),automatic_retries:0,request_digest:req.digest});
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),p.timeout_ms);
    let received;
    try{
      received=await new Promise(resolve=>{
        const aborted=()=>resolve({status:null,body:'',error_code:'TIMEOUT'});
        controller.signal.addEventListener('abort',aborted,{once:true});
        Promise.resolve().then(()=>this.#send({body:raw,apiKey:this.#key,signal:controller.signal})).then(resolve,()=>resolve({status:null,body:'',error_code:'NETWORK_ERROR'})).finally(()=>controller.signal.removeEventListener('abort',aborted));
      });
    }finally{clearTimeout(timer);}
    // No raw errors, headers or secrets are persisted. Failed/uncertain calls
    // retain the entire reservation and stop the experiment; never retry.
    const body=typeof received?.body==='string'?received.body:'',safe=redact(body,this.#key);
    let data=null,error=null,response=null;
    try{
      need(safe===body,'CREDENTIAL_IN_RESPONSE');
      need(!received.error_code&&received.status===200,'OPENAI_HTTP_OR_NETWORK_ERROR');
      data=JSON.parse(body);
      need(data.model===p.price.model,'MODEL_IDENTITY_MISMATCH');
      const u=data.usage;
      need(u&&[u.input_tokens,u.output_tokens,u.total_tokens].every(Price.integer)&&u.input_tokens+u.output_tokens===u.total_tokens,'MISSING_OR_UNTRUSTED_USAGE');
      need(u.input_tokens<=p.price.input_token_bound&&u.output_tokens<=p.output_tokens,'BOUND_VIOLATION');
      need(data.service_tier==='default','SERVICE_TIER_MISMATCH');
      need(data.status==='completed'&&!data.error&&!data.incomplete_details,'OPENAI_INCOMPLETE');
      need(Array.isArray(data.output),'OPENAI_OUTPUT');
      const content=data.output.filter(x=>x.type==='message').flatMap(x=>x.content??[]);
      need(!content.some(x=>x.type==='refusal'),'OPENAI_REFUSAL');
      const texts=content.filter(x=>x.type==='output_text');
      need(texts.length===1&&typeof texts[0].text==='string','OPENAI_OUTPUT');
      response=resolveResponse(req,JSON.parse(texts[0].text));
    }catch(e){error=/^[A-Z][A-Z0-9_]+$/.test(e.message)?e.message:'OPENAI_INVALID_RESPONSE';}
    const usage=data?.usage&&safe===body?{input_tokens:data.usage.input_tokens??null,output_tokens:data.usage.output_tokens??null,total_tokens:data.usage.total_tokens??null}:null;
    this.#journal.settle(p.id,slot.stage,slot.attempt,{state:error?'uncertain':'settled',response:{status:Number.isInteger(received?.status)?received.status:null,body:safe,body_sha256:C.hash(safe)},usage,usage_cost_upper_nusd:null,error});
    need(!error,error);
    return {response,metadata:{...this.identity,model_calls:this.#test?0:1,scripted_http_calls:this.#test?1:0,run_id:p.id,attempt:slot.attempt,
      request_sha256:C.hash(raw),response_sha256:C.hash(safe),usage,reserved_nusd:slot.reservation_nusd,usage_cost_upper_nusd:Price.cost(p.price,usage.input_tokens,usage.output_tokens)}};
  }
}
module.exports={OpenAIProvider,prepare,policy,defaultJournal,plan,status};
