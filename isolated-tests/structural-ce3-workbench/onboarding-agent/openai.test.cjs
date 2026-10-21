'use strict';
// All responses below are authored fixtures. No test measures language-model
// quality and no test contacts OpenAI, even when credentials exist in the shell.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const REAL_NOW=Date.now,CLOCK_START=REAL_NOW();Date.now=()=>Date.parse('2026-10-21T19:00:00Z')+REAL_NOW()-CLOCK_START;test.after(()=>{Date.now=REAL_NOW;});
const {OpenAIProvider,prepare,policy}=require('./openai-provider.cjs');
const {wireRequest,schemaFor,resolveResponse}=require('./openai-wire.cjs');
const {Session,Store,Agent}=require('./agent.cjs');
const {Journal}=require('../onboarding-transport/journal.cjs');
const P=require('./protocol.cjs');
const BRIEF='Vi vill samla lagerhanteringen i ett system. Leveranserna måste fortsätta varje dag. Vi använder två lagersystem. Kan flytten ske utan leveransavbrott?';
function sourceRef(source,quote=source.content){return {source_id:source.id,source_version:source.version,quote,occurrence:1};}
function item(role,statement,type,refs=[],known=true){return {id:role+'-main',kind:P.kinds[role],statement,type,status:known?'known':'unknown',value:known?statement:null,unit:null,refs,depends_on:[],supersedes:[],rationale:'FÖRSKRIVEN TESTTOLKNING – inte ett modellsvar eller en kvalitetsutvärdering.',scenario_choice:null};}
function fixtureResponse(req){
  const src=req.sources[0];
  const items=[item('goal','Samla lagerhanteringen i ett system.','goal',[sourceRef(src,'Vi vill samla lagerhanteringen i ett system.')]),
    item('requirement','Leveranserna måste fortsätta varje dag.','requirement',[sourceRef(src,'Leveranserna måste fortsätta varje dag.')]),
    item('initial','Två lagersystem används.','document_fact',[sourceRef(src,'Vi använder två lagersystem.')]),
    ...['decision','dependency','external','time'].map(r=>item(r,P.roles[r]+' behöver preciseras.','ai_proposal',[],false))];
  const answer=req.sources.filter(s=>s.kind==='answer').at(-1);
  if(answer)Object.assign(items.find(i=>i.id==='decision-main'),{statement:answer.content,type:'user_fact',status:'known',value:answer.content,refs:[sourceRef(answer)]});
  return {schema_version:'ce3-onboarding-model-response/1',request_digest:req.digest,analysis:{kind:'check',question:'Kan flytten ske utan leveransavbrott?',plan_ids:['decision-main'],criterion_ids:['goal-main','requirement-main'],changed_assumption_ids:[]},scope:{includes:['Lagerflytt med bibehållna leveranser.'],excludes:['Ingen körning eller SR-granskning.']},items,gaps:[],questions:answer?[]:[{key:'warehouse-actions',text:'Vilka åtgärder kan ni välja för att byta lagersystem medan leveranserna fortsätter?',target_ids:['decision-main'],priority:1,reason:'Åtgärderna anges inte i beskrivningen; leveranskravet är redan tydligt.'}]};
}
function envelope(response,extra={}){return {status:'completed',model:policy().price.model,service_tier:'default',usage:{input_tokens:1000,output_tokens:2000,total_tokens:3000},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(response)}]}],...extra};}
function setup(t,mutate=x=>x){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ce3-openai-fixture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const journalFile=path.join(dir,'budget.sqlite');prepare(journalFile);let calls=0;
  const make=()=>new OpenAIProvider({executeLive:true,apiKey:'synthetic-key-not-a-credential',journalFile,testTransport:async options=>{
    calls++;const body=JSON.parse(options.body),req=JSON.parse(body.input);
    assert.equal(body.service_tier,'default');assert.equal(body.truncation,'disabled');assert.equal(body.store,false);assert.equal(body.max_output_tokens,12000);assert(!body.tools&&!body.previous_response_id&&!body.conversation);
    return mutate({status:200,body:JSON.stringify(envelope(fixtureResponse(req)))},req);
  }});
  const provider=make();t.after(()=>provider.close());const store=new Store(path.join(dir,'sessions'));
  return {dir,journalFile,provider,store,agent:new Agent(store,provider),calls:()=>calls,make};
}
function request(text=BRIEF){const s=new Session('wire-test');s.registerSource({id:'description',text,replaces_version:null});return P.request(s);}
const command=(v,action,extra={})=>({id:v.id,snapshot:v.snapshot,checksum:v.checksum,action,...extra});
const accepted=v=>{assert.equal(v.last_attempt.status,'accepted',v.last_attempt.error);return v;};
test('scripted HTTP: warehouse roles, specific question, corrected answer, Session/2 and fourth-call stop',async t=>{
  const f=setup(t);let v=accepted(await f.agent.dispatch({action:'create',text:BRIEF}));
  assert.equal(v.provenance.kind,'scripted_test');assert.equal(v.provenance.model_calls,0);assert.equal(v.summary.find(g=>g.role==='requirement').items[0].type,'requirement');
  assert.equal(v.summary.find(g=>g.role==='initial').items[0].statement,'Två lagersystem används.');assert.equal(v.proposal.analysis.question,'Kan flytten ske utan leveransavbrott?');
  assert.match(v.questions[0].text,/byta lagersystem medan leveranserna fortsätter/);
  const q=v.questions[0];v=accepted(await f.agent.dispatch(command(v,'answer',{question_id:q.id,text:'Vi kan flytta ett lager i taget.'})));
  v=accepted(await f.agent.dispatch(command(v,'answer',{question_id:q.id,text:'Rättelse: Vi kan bara flytta båda samtidigt.'})));
  assert.equal(v.answers.length,2);assert.equal(v.answers[1].source_version,2);assert.equal(v.proposal.items.find(i=>i.id==='decision-main').refs[0].source_version,2);
  assert.equal(v.statuses.review,'not_requested');assert.throws(()=>f.store.load(v.id).session.createHandoff('blocked'),/HANDOFF/);
  v=await f.agent.dispatch(command(v,'propose'));assert.match(v.last_attempt.error,/LIVE_CALL_LIMIT/);assert.equal(f.calls(),3);
  assert.equal(f.provider.status().maximum_usd,1.062);assert.equal(f.provider.status().reserved_usd,1.062);
  prepare(f.journalFile);const reopened=f.make();assert.equal(reopened.status().dispatched,3);await assert.rejects(reopened.generate(request()),/LIVE_CALL_LIMIT/);reopened.close();
});
test('wire schema is strict, local refs resolve repeated Unicode quotes and reject hallucinated quotes',()=>{
  const req=request(BRIEF+' 🚚 samma 🚚 samma'),schema=schemaFor(req),r=fixtureResponse(req);
  const walk=x=>{if(!x||typeof x!=='object')return;if(x.type==='object'){assert.equal(x.additionalProperties,false);assert.deepEqual(x.required,Object.keys(x.properties));}assert(!x.$ref&&!x.$id&&!x.uniqueItems);Object.values(x).forEach(v=>Array.isArray(v)?v.forEach(walk):walk(v));};walk(schema);
  r.items[2].refs=[{source_id:'description',source_version:1,quote:'🚚 samma',occurrence:2}];const resolved=resolveResponse(req,r).items[2].refs[0];assert.equal(resolved.start,req.sources[0].content.lastIndexOf('🚚 samma'));assert.equal(req.sources[0].content.slice(resolved.start,resolved.end),'🚚 samma');
  r.items[2].refs[0].quote='påhittad';assert.throws(()=>resolveResponse(req,r),/CITATION_NOT_FOUND/);
  assert.match(wireRequest(req,policy()).instructions,/Ett leveranskrav är inte ett beslut/);
});
test('opt-in, credential, budget initialization and altered/expired price block before send',t=>{
  assert.throws(()=>new OpenAIProvider(),/LIVE_OPT_IN/);assert.throws(()=>new OpenAIProvider({executeLive:true}),/OPENAI_API_KEY/);
  assert.throws(()=>new OpenAIProvider({executeLive:true,apiKey:'synthetic-key',journalFile:path.join(os.tmpdir(),'missing-'+Date.now())}),/JOURNAL_MISSING/);
  const original=Date.now;try{Date.now=()=>Date.parse('2026-10-29T00:00:00Z');assert.throws(()=>policy(),/PRICE_EXPIRED/);}finally{Date.now=original;}
});
for(const [name,mutate,expected] of [
  ['HTTP rate limit',()=>({status:429,body:'{}'}),'OPENAI_HTTP_OR_NETWORK_ERROR'],
  ['network uncertainty',()=>({status:null,body:'',error_code:'NETWORK_ERROR'}),'OPENAI_HTTP_OR_NETWORK_ERROR'],
  ['incomplete',r=>({...r,body:JSON.stringify({...JSON.parse(r.body),status:'incomplete'})}),'OPENAI_INCOMPLETE'],
  ['refusal',r=>({...r,body:JSON.stringify({...JSON.parse(r.body),output:[{type:'message',content:[{type:'refusal',refusal:'synthetic'}]}]})}),'OPENAI_REFUSAL'],
  ['usage missing',r=>({...r,body:JSON.stringify({...JSON.parse(r.body),usage:null})}),'MISSING_OR_UNTRUSTED_USAGE'],
  ['model drift',r=>({...r,body:JSON.stringify({...JSON.parse(r.body),model:'another-model'})}),'MODEL_IDENTITY_MISMATCH'],
  ['tier drift',r=>({...r,body:JSON.stringify({...JSON.parse(r.body),service_tier:'priority'})}),'SERVICE_TIER_MISMATCH'],
  ['input bound',r=>({...r,body:JSON.stringify({...JSON.parse(r.body),usage:{input_tokens:400001,output_tokens:1,total_tokens:400002}})}),'BOUND_VIOLATION'],
  ['output bound',r=>({...r,body:JSON.stringify({...JSON.parse(r.body),usage:{input_tokens:1,output_tokens:12001,total_tokens:12002}})}),'BOUND_VIOLATION'],
  ['credential echo',()=>({status:200,body:'synthetic-key-not-a-credential'}),'CREDENTIAL_IN_RESPONSE'],
  ['bad source', (r,req)=>{const wire=fixtureResponse(req);wire.items[0].refs[0].quote='fabrication';return {...r,body:JSON.stringify(envelope(wire))};},'CITATION_NOT_FOUND']
])test('scripted HTTP failure stops without retry or refund: '+name,async t=>{
  const f=setup(t,mutate),v=await f.agent.dispatch({action:'create',text:BRIEF});assert.equal(v.last_attempt.status,'rejected');assert.equal(v.last_attempt.error,expected);assert.equal(v.proposal,null);assert.equal(v.sources.length,1);
  await assert.rejects(f.provider.generate(request()),/LIVE_STOPPED/);assert.equal(f.calls(),1);assert.equal(f.provider.status().reserved_usd,1.062);
  const j=new Journal(f.journalFile);assert(!JSON.stringify(j.snapshot()).includes('synthetic-key-not-a-credential'));j.close();
});
test('oversize and credential-containing input stop before dispatch',async t=>{
  const f=setup(t),req=request();req.previous_proposal={padding:'x'.repeat(240000)};
  await assert.rejects(f.provider.generate(req),/LIVE_REQUEST_TOO_LARGE/);req.previous_proposal={padding:'synthetic-key-not-a-credential'};
  await assert.rejects(f.provider.generate(req),/CREDENTIAL_IN_REQUEST/);assert.equal(f.calls(),0);
});
test('simultaneous provider calls use only one slot; persisted uncertain intent blocks restart',async t=>{
  const f=setup(t);const results=await Promise.allSettled([f.provider.generate(request()),f.provider.generate(request())]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.calls(),1);
  const j=new Journal(f.journalFile),p=policy();j.dispatch(p.id,'onboarding_draft','2',{body:'synthetic pre-crash intent'});j.close();
  const reopened=f.make();await assert.rejects(reopened.generate(request()),/LIVE_STOPPED/);reopened.close();assert.equal(f.calls(),1);
});
test('scripted unsupported resource and contradiction remain blocking in the original proposal contract',async t=>{
  const f=setup(t,(http,req)=>{const r=fixtureResponse(req),src=req.sources[0];r.items.push(item('other','Två jobb delar samma resurs.','requirement',[sourceRef(src,'Två jobb delar samma resurs.')]));
    const a=r.items.find(i=>i.id==='time-main');Object.assign(a,{statement:'Flytten anges både dag 2 och dag 3.',status:'conflict',refs:[sourceRef(src,'Flytten är dag 2.'),sourceRef(src,'Flytten är dag 3.')]});
    return {...http,body:JSON.stringify(envelope(r))};});
  const v=accepted(await f.agent.dispatch({action:'create',text:BRIEF+' Två jobb delar samma resurs. Flytten är dag 2. Flytten är dag 3.'}));
  assert(v.proposal.gaps.some(g=>g.kind==='unsupported_profile'&&g.status==='open'));assert(v.proposal.gaps.some(g=>g.kind==='conflict'));
});
test('reclassification preserves source and old item; deletion masquerading as reclassification fails',async t=>{
  const {OfflineProvider,offline}=require('./providers.cjs');const f=setup(t);f.agent.provider=new OfflineProvider();
  let v=accepted(await f.agent.dispatch({action:'create',text:'Beslut: Leveranserna ska fortsätta varje dag.'}));const s=f.store.load(v.id).session,req=P.request(s),r=offline(req),old=r.items.find(i=>i.id.startsWith('decision-')&&i.refs.length);
  const replacement={...structuredClone(old),id:'requirement-corrected',kind:'criterion',type:'requirement',supersedes:[old.id]};old.status='superseded';r.items.push(replacement);
  // Decision placeholder is still needed; no executable action was supplied.
  r.items.push(item('decision','Valbara åtgärder saknas.','ai_proposal',[],false));r.analysis.plan_ids=['decision-main'];r.analysis.criterion_ids.push(replacement.id);
  const built=P.build(s,req,r);s.submitProposal(built.proposal);assert(s.view().proposals.at(-1).items.some(i=>i.id===replacement.id));
  replacement.statement='Helt annan uppgift';assert.throws(()=>P.build(f.store.load(v.id).session,req,r),/aktuell uppgift/);
});

test('tampered policy blocks before any authorization or network',()=>{
  const original=fs.readFileSync;
  try{fs.readFileSync=function(file,...args){const bytes=original.call(this,file,...args);return String(file).endsWith('/live-policy.json')?Buffer.from(String(bytes).replace('354000000','1')):bytes;};
    assert.throws(()=>policy(),/LIVE_POLICY_CHANGED/);
  }finally{fs.readFileSync=original;}
});
test('timeout consumes one intent and stops; contract rejection also prevents further sends',async t=>{
  const f=setup(t),original=setTimeout;
  const hung=new OpenAIProvider({executeLive:true,apiKey:'synthetic-key',journalFile:f.journalFile,testTransport:()=>new Promise(()=>{})});
  try{global.setTimeout=(cb)=>original(cb,1);await assert.rejects(hung.generate(request()),/OPENAI_HTTP_OR_NETWORK_ERROR/);}finally{global.setTimeout=original;hung.close();}
  assert.equal(f.provider.status().dispatched,1);assert(f.provider.status().stopped);
  const other=setup(t,(http,req)=>{const r=fixtureResponse(req);r.request_digest='0'.repeat(64);return {...http,body:JSON.stringify(envelope(r))};});
  const v=await other.agent.dispatch({action:'create',text:BRIEF});assert.match(v.last_attempt.error,/MODEL_REQUEST_BINDING/);
  await assert.rejects(other.provider.generate(request()),/LIVE_STOPPED/);assert.equal(other.calls(),1);
});

test('stored 401 diagnostics explain invalid key safely without journal mutation or another send',async t=>{
  const {status}=require('./openai-provider.cjs');
  const f=setup(t,()=>({status:401,body:JSON.stringify({error:{type:'invalid_request_error',code:'invalid_api_key',message:'Incorrect API key provided: sk-partial****echo. Bearer secret-fragment'}})}));
  const v=await f.agent.dispatch({action:'create',text:BRIEF});assert.equal(v.last_attempt.error,'CREDENTIAL_IN_RESPONSE');
  const j=new Journal(f.journalFile),before=j.snapshot(),diagnostic=f.provider.status().last_failure;
  assert.deepEqual(require('./diagnostics.cjs').diagnosticForAttempt({...before.runs[0].attempts[0],error:'OPENAI_HTTP_OR_NETWORK_ERROR'}),diagnostic);
  assert.equal(diagnostic.http_status,401);assert.equal(diagnostic.api_code,'invalid_api_key');assert.match(diagnostic.message,/avvisade API-nyckeln/);
  assert(!JSON.stringify(diagnostic).includes('echo'));assert(!JSON.stringify(diagnostic).includes('secret-fragment'));
  assert.deepEqual(status(f.journalFile).last_failure,diagnostic);assert.deepEqual(j.snapshot(),before);j.close();
  assert.equal(f.provider.status().dispatched,1);assert.equal(f.provider.status().reserved_usd,1.062);assert(f.provider.status().stopped);assert.equal(f.calls(),1);
  const {parseHTML}=require('linkedom'),vm=require('node:vm');
  const {document}=parseHTML(fs.readFileSync(path.join(__dirname,'static/index.html'),'utf8'));
  const context=vm.createContext({document,fetch:async()=>({ok:true,json:async()=>({provider:{kind:'openai_live',label:'Test'},sessions:[],budget:f.provider.status()})})});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'static/app.js'),'utf8'),context);await vm.runInContext('list()',context);
  const notice=document.getElementById('provider').textContent;
  assert.match(notice,/1\/3 anrop/);assert.match(notice,/HTTP 401, invalid_api_key/);assert.match(notice,/Provet har stoppats/);assert(!notice.includes('secret-fragment'));
});
test('diagnostics distinguish HTTP failures from absent response and never echo unknown error fields',()=>{
  const {diagnosticForAttempt}=require('./diagnostics.cjs');
  const receipt=(status,code)=>({error:'OPENAI_HTTP_OR_NETWORK_ERROR',response:{status,body:JSON.stringify({error:{code,param:'secret',message:'do not display secret'}})}});
  assert.match(diagnosticForAttempt(receipt(429,'insufficient_quota')).message,/API-kvoten/);
  assert.match(diagnosticForAttempt(receipt(null,null)).message,/Inget fullständigt HTTP-svar/);
  assert.match(diagnosticForAttempt(receipt(400,'invalid_json_schema')).message,/invalid_json_schema/);
  assert.match(diagnosticForAttempt(receipt(503,null)).message,/serverfel/);
  const unknown=diagnosticForAttempt(receipt(400,'sk-never-display'));assert.equal(unknown.api_code,null);assert(!JSON.stringify(unknown).includes('secret'));assert(!JSON.stringify(unknown).includes('sk-never-display'));
  assert.equal(diagnosticForAttempt({state:'planned'}),null);assert.equal(diagnosticForAttempt({state:'settled'}),null);
});
