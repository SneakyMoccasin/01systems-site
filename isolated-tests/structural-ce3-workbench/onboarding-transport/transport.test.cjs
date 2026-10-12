'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const {Journal}=require('./journal.cjs'),R=require('./runner.cjs'),Price=require('./price.cjs'),profile=require('./synthetic-price.json'),{fixture}=require('./fixtures.cjs');
const C=require('../contracts/onboarding-v1/contract.cjs'),Archive=require('../onboarding-session/v2/archive.cjs');
const {setup,confirm}=require('../onboarding-session/v2/demo.cjs');
const {argumentsFor}=require('./live.cjs');
const {fetchBoundary,ENDPOINT}=require('./transport.cjs');
const originalFetch=global.fetch;
test.before(()=>{global.fetch=()=>assert.fail('External fetch forbidden in tests');});
test.after(()=>{global.fetch=originalFetch;});
function context(t,multiplier=2) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ce3-transport-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'budget.sqlite'),plan=R.plan(profile),session=setup(),job=session.requestReview('review');
  const budget={schema_version:'ce3-budget/1',currency:'USD',mode:'offline',total_limit_nusd:plan.maximum_nusd*multiplier,per_run_limit_nusd:plan.maximum_nusd};
  if(multiplier>0)Journal.create(file,budget).close();
  return {dir,file,plan,session,job,budget,options:{journal:file,mode:'offline',profile,runId:'r1',prepared:job.prepared}};
}
async function execute(x,options={}) {return R.run({...x.options,fixture:fixture(x.job.prepared,profile,options)});}
test('inventory uses actual pinned SR caps: three initial plus three internal repairs',t=>{
  const x=context(t);assert.equal(x.plan.maximum_calls,6);assert.equal(x.plan.maximum_output_tokens,66000);
  assert.equal(x.plan.maximum_input_tokens,6000000);assert.equal(x.plan.maximum_nusd,61320000);
  assert.deepEqual(x.plan.slots.map(s=>s.output_tokens),[8000,8000,20000,20000,5000,5000]);
});
test('insufficient total or per-run budget stops before first HTTP call',async t=>{
  for(const limit of ['total_limit_nusd','per_run_limit_nusd']) {
    const x=context(t,0),budget={...x.budget,total_limit_nusd:x.plan.maximum_nusd,per_run_limit_nusd:x.plan.maximum_nusd};
    budget[limit]--;if(limit==='total_limit_nusd')budget.per_run_limit_nusd--;
    Journal.create(x.file,budget).close(); const out=await execute(x);
    assert.equal(out.error,'BUDGET_STOP_BEFORE_CALL');assert.equal(out.run,null);assert.equal(out.journal.liability_nusd,0);
    assert.equal(out.journal.events.at(-1).detail.code,'BUDGET_STOP_BEFORE_CALL');assert.equal(x.session.view().statuses.review,'pending');
  }
});
test('all real SR provider repairs are separately reserved, captured and reconciled',async t=>{
  const x=context(t),out=await execute(x,{repairs:[0,1,2]});
  assert.equal(out.status,'finished');assert.equal(out.run.result.original_sr_result.status,'complete');
  assert.equal(out.run.attempts.filter(a=>a.state==='settled').length,6);
  assert(out.run.attempts.filter(a=>a.attempt==='repair').every(a=>a.request.body.includes('<invalid_result>')));
  assert(out.run.attempts.every(a=>a.request.automatic_retries===0 && a.usage.input_tokens===200 && a.usage.output_tokens===300));
  assert(out.run.attempts.every(a=>JSON.parse(a.request.body).service_tier==='default'));
  assert.equal(out.journal.liability_nusd,48000);assert.equal(out.run.result.original_sr_result.grounded.metadata.usage.apiCalls,6);
  assert.equal(out.run.result.original_sr_result.grounded.metadata.diagnostics.repairs.length,3);
});
test('HTTP dispatch explicitly requests Standard for all six slots and preserves provider input',async t=>{
  const x=context(t),j=new Journal(x.file),sent=[];
  j.begin('standard',profile,x.plan,x.job.prepared.digest);
  const boundary=fetchBoundary({journal:j,runId:'standard',profile,plan:x.plan,apiKey:'test-key',send:async({body})=>{
    sent.push(body);assert.equal(JSON.parse(body).service_tier,'default');
    return {status:200,body:JSON.stringify({model:profile.model,usage:{input_tokens:1,output_tokens:1,total_tokens:2}})};
  }});
  try {
    for(const slot of x.plan.slots) {
      const b={model:profile.model,store:false,instructions:'unchanged instructions',input:slot.attempt==='repair'?'unchanged <invalid_result>':'unchanged original',max_output_tokens:slot.output_tokens,text:{format:{type:'json_schema',strict:true,name:`skeptical_reader_${slot.stage}_v01`,schema:{type:'object'}}}};
      const options={method:'POST',headers:{Authorization:'Bearer test-key','Content-Type':'application/json'},body:JSON.stringify(b)};
      await boundary(ENDPOINT,options);
      assert.equal(options.body,JSON.stringify(b));
      const {service_tier,...wire}=JSON.parse(sent.at(-1));assert.deepEqual(wire,b);
    }
    assert.equal(sent.length,6);
    assert.deepEqual(j.read().runs.find(r=>r.id==='standard').attempts.map(a=>a.request.body),sent);
  } finally {j.close();}
});
test('unused repair reservations release only on explicit normal run completion',async t=>{
  const x=context(t),out=await execute(x);assert.equal(out.run.attempts.filter(a=>a.state==='not_sent').length,3);
  assert.equal(out.journal.liability_nusd,24000);assert.equal(out.run.attempts.filter(a=>a.request).length,3);
});
test('parallel processes cannot over-reserve the same persistent budget',async t=>{
  const x=context(t,1);
  const script=`const {Journal}=require(process.argv[1]);const j=new Journal(process.argv[2]);try{j.begin(process.argv[3],JSON.parse(process.argv[4]),JSON.parse(process.argv[5]),'fixture');process.stdout.write('reserved');}catch{process.stdout.write('blocked');}finally{j.close();}`;
  const children=Array.from({length:4},(_,i)=>new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['-e',script,path.join(__dirname,'journal.cjs'),x.file,`parallel-${i}`,JSON.stringify(profile),JSON.stringify(x.plan)],{stdio:['ignore','pipe','ignore']});
    let text='';child.stdout.on('data',d=>text+=d);child.once('error',reject);child.once('exit',code=>code===0?resolve(text):reject(Error('child failed')));
  }));
  const results=await Promise.all(children);assert.equal(results.filter(r=>r==='reserved').length,1);
  const journal=new Journal(x.file);try{assert.equal(journal.snapshot().liability_nusd,x.plan.maximum_nusd);}finally{journal.close();}
});
test('timeout, network failure, and missing usage preserve uncertain possible cost',async t=>{
  for(const kind of ['timeout','throw','missing']) {
    const x=context(t),f=fixture(x.job.prepared,profile);
    if(kind==='missing'){const body=JSON.parse(f.responses[0].body);delete body.usage;f.responses[0].body=JSON.stringify(body);}else f.responses[0]={[kind]:true};
    const out=await R.run({...x.options,fixture:f}),a=out.run.attempts[0];
    assert.equal(out.run.result.original_sr_result.status,'failed');assert.equal(a.state,'uncertain');
    assert.equal(a.liability_nusd,a.reservation_nusd);assert.equal(a.usage_cost_upper_nusd,null);assert.equal(out.run.attempts.filter(a=>a.request).length,1);
    if(kind==='timeout')assert.equal(a.transport_error,'ABORTED_OR_TIMEOUT');
    const journal=new Journal(x.file);try{assert.equal(journal.snapshot().liability_nusd,a.reservation_nusd);}finally{journal.close();}
  }
});
test('process SIGKILL after dispatch survives reopen and never automatically resends',async t=>{
  const x=context(t,1),f=fixture(x.job.prepared,profile);f.responses[0]={crash:true};
  const out=await R.run({...x.options,fixture:f});assert.equal(out.status,'interrupted');
  assert.equal(out.run.state,'running');assert.equal(out.run.attempts[0].state,'uncertain');assert.equal(out.journal.liability_nusd,x.plan.maximum_nusd);
  assert.deepEqual(out.run.request_context,x.job.prepared);
  assert.equal(out.run.attempts.filter(a=>a.state==='planned').length,5);
  const same=await execute(x);assert.equal(same.error,'RUN_ALREADY_EXISTS_NO_AUTOMATIC_RESEND');
  const different=await R.run({...x.options,runId:'new',fixture:fixture(x.job.prepared,profile)});assert.equal(different.error,'BUDGET_STOP_BEFORE_CALL');
  assert.equal(different.journal.runs.length,1);
});
test('API errors do not trigger automatic HTTP retries and raw failed body is retained safely',async t=>{
  const x=context(t),f=fixture(x.job.prepared,profile);f.responses[0]={status:429,body:JSON.stringify({error:{message:'Rate limited'}})};
  const out=await R.run({...x.options,fixture:f});assert.equal(out.run.attempts.filter(a=>a.request).length,1);
  assert.equal(out.run.attempts[0].response.status,429);assert.match(out.run.attempts[0].response.body,/Rate limited/);assert.equal(out.run.attempts[0].state,'uncertain');
});
test('actual usage reconciles even incomplete output; no response does not mean zero spend',async t=>{
  const x=context(t),f=fixture(x.job.prepared,profile),body=JSON.parse(f.responses[0].body);body.status='incomplete';body.incomplete_details={reason:'max_output_tokens'};f.responses[0].body=JSON.stringify(body);
  const out=await R.run({...x.options,fixture:f});assert.equal(out.run.result.original_sr_result.status,'failed');assert.equal(out.journal.liability_nusd,8000);
  assert.equal(out.run.attempts[0].state,'settled');assert.equal(out.run.attempts.filter(a=>a.request).length,1);
});
test('usage exceeding verified token bounds freezes journal before further calls',async t=>{
  const x=context(t),f=fixture(x.job.prepared,profile),body=JSON.parse(f.responses[0].body);body.usage={input_tokens:profile.input_token_bound+1,output_tokens:0,total_tokens:profile.input_token_bound+1};f.responses[0].body=JSON.stringify(body);
  const out=await R.run({...x.options,fixture:f});assert.equal(out.journal.frozen,true);assert.equal(out.run.attempts[0].error,'BOUND_VIOLATION');assert.equal(out.run.attempts.filter(a=>a.request).length,1);
});
test('credential echoes and thrown header/error objects never reach journal, bundle, or SR archive',async t=>{
  for(const kind of ['body','exception']) {
    const x=context(t),f=fixture(x.job.prepared,profile);
    f.responses[0]=kind==='body'?{status:500,body:'{"error":{"Authorization":"Bearer {{FAKE_CREDENTIAL}}","message":"{{FAKE_CREDENTIAL}}"}}'}:{throw:true};
    const out=await R.run({...x.options,fixture:f}),text=JSON.stringify(out);
    assert(!text.includes('ce3-fake-credential-DO-NOT-ARCHIVE'));assert(!text.includes('headers'));assert.equal(out.run.result.original_sr_result.status,'failed');
    const bytes=fs.readFileSync(x.file);assert(!bytes.includes(Buffer.from('ce3-fake-credential-DO-NOT-ARCHIVE')));
  }
});
test('session/2 gets honest synthetic archive; original provider trace remains separately bound',async t=>{
  const x=context(t),out=await execute(x,{repairs:[0]}),link=await R.attach(x.session,x.job.id,out),bundle=R.bundle(x.session,out,link);
  assert.equal(x.session.view().current_review.binding.producer.mode,'synthetic');
  assert.equal(out.run.result.original_sr_result.producer.name,'openai');assert.equal(out.mode,'offline');
  assert.deepEqual(R.restore(bundle).serialize(),x.session.serialize());
  assert.equal(bundle.session.archives[link.archive_digest].receipt.test_tape.label,'SYNTHETIC TEST DOUBLE — NOT AI DETECTION');
  const bad=structuredClone(bundle);bad.outcome.run.result.original_sr_result.assessments=[];const {digest,...body}=bad;bad.digest=C.digest(body);assert.throws(()=>R.restore(bad));
  confirm(x.session,'c');assert.equal(x.session.createHandoff('allowed').status,'ready_for_separate_compilation_and_validation');
});
test('complete coverage with transported blocker still denies handoff',async t=>{
  const x=context(t),out=await execute(x,{problems:[{target:'approval',field:'type',classification:'incorrect'}]});await R.attach(x.session,x.job.id,out);confirm(x.session,'c');
  assert.equal(x.session.view().statuses.review,'current');assert.throws(()=>x.session.createHandoff('blocked'),/BLOCKING_FINDING/);
});
test('transport failure cannot replace prior blockers with a complete review',async t=>{
  const x=context(t),first=await execute(x,{problems:[{target:'approval',field:'type',classification:'incorrect'}]});await R.attach(x.session,x.job.id,first);
  const second=x.session.requestReview('second'),f=fixture(second.prepared,profile);f.responses[0]={timeout:true};
  const out=await R.run({...x.options,runId:'r2',prepared:second.prepared,fixture:f});await R.attach(x.session,second.id,out);
  assert.equal(x.session.view().statuses.review,'incomplete');assert.equal(x.session.view().reviews[0].result.findings.length,1);assert.throws(()=>confirm(x.session,'bad'));
});
test('live conversion is forbidden for offline tapes and live CLI rejects implicit selections',()=>{
  assert.throws(()=>R.tapeFrom({mode:'live',profile:{kind:'verified-live'},result:{mode:'live'}}),/NO_LIVE_RELABEL/);
  assert.throws(()=>Price.validate(profile,'live'),/PRICE_MODE/);assert.throws(()=>argumentsFor([]),/EXPLICIT_LIVE_CONFIGURATION_REQUIRED/);
  assert.throws(()=>argumentsFor(['--execute-live','--cases','c3-r1']),/EXPLICIT_LIVE_CONFIGURATION_REQUIRED/);
});
test('price profiles require exact selection, current verification, source, model and bounds',()=>{
  assert.throws(()=>Price.validate(profile,'offline','0'.repeat(64)),/PRICE_DIGEST/);
  const p={...profile,kind:'verified-live',model:'verified-model-snapshot',source:'https://developers.openai.com/api/docs/pricing',model_source:'https://developers.openai.com/api/docs/models/example',verification:{by:'UNIT FORMAT FIXTURE ONLY',verified_at:new Date(Date.now()-1000).toISOString(),valid_until:new Date(Date.now()+100000).toISOString(),rate_basis:'upper_bound_all_input_and_output_tiers',input_bound_basis:'documented_maximum_billable_input_tokens',model_identity:'verified-model-snapshot',structured_output_supported:true},dated:new Date().toISOString().slice(0,10)};
  assert.equal(Price.validate(p,'live').model,p.model);
  assert.throws(()=>Price.validate({...p,verification:{...p.verification,valid_until:'2000-01-01'}},'live'),/PRICE_EXPIRED/);
  assert.throws(()=>Price.validate({...p,input_token_bound:0},'live'),/PRICE_BOUND_RATE/);
});
test('budget configuration cannot be topped up on reopen and corruption is detected',t=>{
  const x=context(t);assert.throws(()=>new Journal(x.file,{...x.budget,total_limit_nusd:x.budget.total_limit_nusd+1}),/BUDGET_RECONFIGURATION/);
  const {DatabaseSync}=require('node:sqlite'),db=new DatabaseSync(x.file);db.exec("UPDATE journal SET digest='bad'");db.close();assert.throws(()=>new Journal(x.file),/JOURNAL_DIGEST/);
});
test('frozen c3-r1 and clear run through the real provider without reading gold or editing inputs',async t=>{
  const {inputs}=require('../onboarding-sr/structured/diagnostic.cjs');
  for(const item of inputs()) {
    const x=context(t),p=Archive.prepare(item.request,undefined,{draftText:item.draftText}),f=fixture(p,profile);
    const out=await R.run({...x.options,prepared:p,fixture:f});assert.equal(out.run.result.original_sr_result.status,'complete');
    const archive=await R.archiveFor(out);assert.equal(archive.receipt.prepared.input.draft.text,item.draftText);
    assert.equal(archive.receipt.result.status,item.name==='c3-r1'?'partial':'complete');
  }
});
test('AbortSignal beats a non-cooperative transport and retains reservation',async t=>{
  const x=context(t),journal=new Journal(x.file);journal.begin('abort',profile,x.plan,x.job.prepared.digest);
  try {
    const secret='only-a-fake-key-for-abort-test',controller=new AbortController();let calls=0;
    const boundary=fetchBoundary({journal,runId:'abort',profile,plan:x.plan,apiKey:secret,send:async()=>{calls++;return new Promise(()=>{});}});
    const pending=boundary(ENDPOINT,{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({model:profile.model,store:false,instructions:'fixture',input:'fixture',max_output_tokens:8000,text:{format:{type:'json_schema',strict:true,name:'skeptical_reader_grounded_claim_extraction_v01',schema:{}}}})});
    await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(()=>pending,/BUDGETED_TRANSPORT_FAILED/);
    assert.equal(calls,1);assert.equal(journal.snapshot().runs[0].attempts[0].state,'uncertain');assert.equal(journal.snapshot().liability_nusd,x.plan.maximum_nusd);
  } finally{journal.close();}
});
test('HTTP response model mismatch freezes the journal without a model fallback',async t=>{
  const x=context(t),f=fixture(x.job.prepared,profile),b=JSON.parse(f.responses[0].body);b.model='another-model';f.responses[0].body=JSON.stringify(b);
  const out=await R.run({...x.options,fixture:f});assert.equal(out.journal.frozen,true);assert.equal(out.run.attempts[0].error,'MODEL_IDENTITY_MISMATCH');assert.equal(out.run.attempts.filter(a=>a.request).length,1);
});
test('a failed internal format repair is recorded and never gets a third attempt',async t=>{
  const x=context(t),f=fixture(x.job.prepared,profile,{repairs:[0]});f.responses[1]=structuredClone(f.responses[0]);
  const out=await R.run({...x.options,fixture:f});assert.equal(out.run.result.original_sr_result.status,'failed');assert.equal(out.run.attempts.filter(a=>a.request).length,2);assert.equal(out.journal.liability_nusd,16000);
  assert(out.run.attempts[1].request.body.includes('<invalid_result>'));
});
test('native HTTPS transport makes one request with redirects/retries absent and no pooled agent',async()=>{
  const https=require('node:https'),{EventEmitter}=require('node:events'),{httpsSend}=require('./transport.cjs'),old=https.request;
  let calls=0;
  https.request=(url,options,callback)=>{
    calls++;assert.equal(url,ENDPOINT);assert.equal(options.agent,false);assert.equal(options.method,'POST');
    const req=new EventEmitter();req.destroy=()=>{};
    req.end=()=>{const res=new EventEmitter();res.statusCode=302;res.headers={location:'https://not-followed.invalid',Authorization:'DO NOT ARCHIVE HEADERS'};res.setEncoding=()=>{};callback(res);res.emit('data','redirect fixture');res.emit('end');};return req;
  };
  try{const result=await httpsSend({body:'{}',apiKey:'fake-transport-key',signal:new AbortController().signal});assert.equal(calls,1);assert.equal(result.status,302);assert.equal(result.body,'redirect fixture');assert(!Object.hasOwn(result,'headers'));}finally{https.request=old;}
});
