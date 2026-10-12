'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const R=require('./runner.cjs'),Input=require('./input.cjs'),Price=require('./price.cjs'),{Journal}=require('./journal.cjs'),profile=require('./synthetic-price.json'),{fixture}=require('./fixtures.cjs');
const C=require('../contracts/onboarding-v1/contract.cjs'),Archive=require('../onboarding-session/v2/archive.cjs');
const {setup}=require('../onboarding-session/v2/demo.cjs');
const countPrice={schema_version:'ce3-input-count-price/1',kind:'synthetic',currency:'USD',method:Input.METHOD,max_request_nusd:1000000,source:'synthetic:input-count-test',verification:null};
function context(t,limit=1000000,prepared=setup().requestReview('r').prepared) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ce3-input-gate-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const journal=path.join(dir,'budget.sqlite'),inputPolicy=Input.policy(limit,countPrice),plan=R.plan(profile,'offline',{inputPolicy});
  Journal.create(journal,{schema_version:'ce3-budget/1',currency:'USD',mode:'offline',total_limit_nusd:plan.maximum_nusd*2,per_run_limit_nusd:plan.maximum_nusd}).close();
  return {journal,plan,prepared,options:{journal,mode:'offline',runId:'input-test',profile,inputPolicy,prepared}};
}
function execute(x,options={}) {return R.run({...x.options,fixture:fixture(x.prepared,profile,options)});}
function sent(out) {return out.run.attempts.filter(a=>a.request);}
function counted(out) {return out.run.attempts.filter(a=>a.input_count);}
function reopen(x,out) {const j=new Journal(x.journal);try{assert.deepEqual(j.snapshot(),out.journal);}finally{j.close();}}
test('count payload includes complete instructions, data and JSON schema, with Unicode and repair contents intact',()=>{
  const b={model:profile.model,store:false,max_output_tokens:8000,instructions:'schema åäö 🤔',input:'original sources / draft / register / previous output / <invalid_result>bad</invalid_result>',text:{format:{type:'json_schema',strict:true,name:'skeptical_reader_grounded_claim_extraction_v01',schema:{$defs:{one:{type:'string',description:'all schema content'}},type:'object'}}}};
  const raw=JSON.stringify(b),p=Input.payload(raw);assert.deepEqual(p,{model:b.model,instructions:b.instructions,input:b.input,text:b.text});
  assert.equal(Input.measurement(raw).measurement_kind,'bytes_not_tokens');
  assert.throws(()=>Input.payload(JSON.stringify({...b,tools:[]})),/INPUT_REQUEST_FIELDS/);
  const count={method:'synthetic-input-counter/1',model:b.model,...Input.measurement(raw),input_tokens:10};
  Input.validateCount(count,raw,'offline');
  const standardRaw=JSON.stringify({...b,service_tier:'default'});
  assert.deepEqual(Input.payload(standardRaw),p);
  // An old count cannot authorize changed wire bytes, even with identical input.
  assert.throws(()=>Input.validateCount(count,standardRaw,'offline'),/INPUT_COUNT_BINDING/);
  for(const tier of ['auto','priority','fast','flex',null]) assert.throws(()=>Input.payload(JSON.stringify({...b,service_tier:tier})),/INPUT_SERVICE_TIER/);
  for(const changed of ['instructions','input','text']) assert.throws(()=>Input.validateCount(count,JSON.stringify({...b,[changed]:changed==='text'?{format:{...b.text.format,schema:{}}}:'changed'}),'offline'),/INPUT_COUNT_BINDING/);
  assert.throws(()=>Input.validateCount(count,raw,'live'),/PROVENANCE/);
  assert.throws(()=>Input.validateCount({...count,model:'wrong'},raw,'offline'),/BINDING/);
});
test('plan/2 separates experiment limit from unchanged price profile and reserves every count and repair',t=>{
  const x=context(t,65536);assert.equal(profile.input_token_bound,1000000);
  assert.equal(x.plan.schema_version,'ce3-transport-plan/2');assert.equal(x.plan.maximum_calls,6);assert.equal(x.plan.maximum_count_calls,6);assert.equal(x.plan.maximum_http_calls,12);
  assert.equal(x.plan.maximum_output_tokens,66000);assert.equal(x.plan.maximum_input_tokens,65536*6);
  assert.equal(x.plan.maximum_nusd,Price.cost(profile,65536*6,66000)+countPrice.max_request_nusd*6);
  assert.throws(()=>R.plan(profile,'offline',{inputPolicy:Input.policy(1000001,countPrice)}),/INPUT_LIMIT/);
});
test('oversized first input blocks generation before dispatch and retains rejected request and count',async t=>{
  const x=context(t,1),out=await execute(x);
  assert.equal(out.status,'not_completed');assert.equal(out.error,'INPUT_LIMIT_EXCEEDED');assert.equal(sent(out).length,0);assert.equal(counted(out).length,1);
  assert.equal(out.journal.liability_nusd,countPrice.max_request_nusd);
  assert(out.run.attempts[0].input_count.count.input_tokens>1);
  assert.equal(out.run.attempts[0].state,'not_sent');assert.notEqual(out.run.result.original_sr_result.status,'complete');
  await assert.rejects(()=>R.archiveFor(out),/NO_COMPLETED/);reopen(x,out);
});
test('later oversized input stops without truncating or losing earlier usage and original SR stage results',async t=>{
  const base=context(t),complete=await execute(base),first=counted(complete)[0].input_count.count.input_tokens;
  assert(counted(complete)[1].input_count.count.input_tokens>first);
  const x=context(t,first,base.prepared),out=await execute(x);
  assert.equal(out.error,'INPUT_LIMIT_EXCEEDED');assert.equal(sent(out).length,1);assert.equal(counted(out).length,2);
  assert.equal(out.run.attempts[0].usage.input_tokens,200);
  assert.deepEqual(out.run.result.original_sr_result.stages[0].raw,complete.run.result.original_sr_result.stages[0].raw);
  assert.equal(counted(out)[1].input_count.request.body,counted(complete)[1].input_count.request.body);
  assert.equal(out.journal.liability_nusd,Price.cost(profile,200,300)+2*countPrice.max_request_nusd);reopen(x,out);
});
test('all internal repairs are counted; oversized repair at each stage stops before that HTTP generation',async t=>{
  const base=context(t),complete=await execute(base,{repairs:[0,1,2]}),attempts=counted(complete);
  assert.equal(attempts.length,6);
  for(const stage of [0,1,2]) {
    const target=stage*2+1,limit=attempts[target].input_count.count.input_tokens-1;
    assert(attempts.slice(0,target).every(a=>a.input_count.count.input_tokens<=limit));
    const x=context(t,limit,base.prepared),out=await execute(x,{repairs:[0,1,2]});
    assert.equal(out.error,'INPUT_LIMIT_EXCEEDED');assert.equal(sent(out).length,target);
    assert.equal(counted(out).length,target+1);assert.equal(counted(out).at(-1).attempt,'repair');
    assert.match(counted(out).at(-1).input_count.request.body,/<invalid_result>/);
    assert.equal(counted(out).at(-1).input_count.request.body,attempts[target].input_count.request.body);
    assert.equal(out.journal.liability_nusd,Price.cost(profile,200,300)*target+countPrice.max_request_nusd*(target+1));reopen(x,out);
  }
});
test('count error, timeout, missing or invalid count fail closed and retain counting fee without retry',async t=>{
  for(const bad of [{timeout:true},{throw:true},{body:'{}'},{body:'not json'},{body:'{"object":"response.input_tokens","input_tokens":-1}'},{body:'{"object":"response.input_tokens","input_tokens":1.5}'},{status:429,body:'{"error":"limit"}'}]) {
    const x=context(t),f=fixture(x.prepared,profile);f.counts=[{input_tokens:200},bad];
    const out=await R.run({...x.options,fixture:f});assert.equal(out.error,'INPUT_COUNT_UNAVAILABLE');
    assert.equal(sent(out).length,1);assert.equal(counted(out).length,2);assert.equal(counted(out).at(-1).input_count.state,'uncertain');
    assert.equal(out.journal.liability_nusd,Price.cost(profile,200,300)+countPrice.max_request_nusd*2);reopen(x,out);
  }
});
test('missing generation usage after a passed count keeps generation and counting reservation uncertain',async t=>{
  const x=context(t,40000),f=fixture(x.prepared,profile),body=JSON.parse(f.responses[0].body);delete body.usage;f.responses[0].body=JSON.stringify(body);
  const out=await R.run({...x.options,fixture:f});assert.equal(out.run.attempts[0].state,'uncertain');assert.equal(out.journal.liability_nusd,x.plan.slots[0].reservation_nusd);
  assert.equal(sent(out).length,1);assert.equal(counted(out).length,1);reopen(x,out);
});
test('count response credential echoes are redacted before persistence',async t=>{
  const x=context(t),f=fixture(x.prepared,profile);f.counts=[{body:'{"error":"Bearer test-secret sk-example123 {{FAKE_CREDENTIAL}}"}'}];
  const out=await R.run({...x.options,fixture:f});assert.equal(sent(out).length,0);
  assert(!JSON.stringify(out).includes('ce3-fake-credential-DO-NOT-ARCHIVE'));assert(!JSON.stringify(out).includes('sk-example123'));assert.equal(out.error,'INPUT_COUNT_UNAVAILABLE');
});
test('budget includes counting fees before even the first count dispatch',async t=>{
  const x=context(t),larger=Input.policy(x.plan.input_policy.token_limit,{...countPrice,max_request_nusd:x.plan.maximum_nusd});
  const out=await R.run({...x.options,inputPolicy:larger,fixture:fixture(x.prepared,profile)});
  assert.equal(out.error,'BUDGET_STOP_BEFORE_CALL');assert.equal(out.run,null);assert.equal(out.journal.liability_nusd,0);
});
test('live cannot use synthetic count pricing or omit a verified fee ceiling',async()=>{
  assert.throws(()=>Input.validateCountPrice(countPrice,'live'),/COUNT_PRICE_MODE/);
  assert.throws(()=>Input.validateCountPrice({...countPrice,kind:'verified-live',max_request_nusd:null},'live'),/COUNT_PRICE_BOUND/);
  assert.throws(()=>Input.validateCountPrice(countPrice,'offline','wrong'),/COUNT_PRICE_BOUND/);
  assert.throws(()=>Input.validatePolicy({...Input.policy(100,countPrice),count_price_digest:null},profile),/COUNT_PRICE_BOUND/);
});
test('journal dispatch cannot bypass exact request count binding',t=>{
  const x=context(t),j=new Journal(x.journal);j.begin('bound',profile,x.plan,x.prepared.digest);
  try {assert.throws(()=>j.dispatch('bound',x.plan.slots[0].stage,'initial',{body:'{}',body_sha256:C.hash('{}')}),/INPUT_COUNT_REQUIRED/);}finally{j.close();}
});
test('both unmodified frozen cases exercise every counted stage and repair through actual SR with test doubles',async t=>{
  for(const item of require('../onboarding-sr/structured/diagnostic.cjs').inputs()) {
    const prepared=Archive.prepare(item.request,undefined,{draftText:item.draftText}),x=context(t,1000000,prepared),out=await execute(x,{repairs:[0,1,2]});
    assert.equal(out.status,'finished');assert.equal(out.run.result.original_sr_result.status,'complete');
    assert.equal(sent(out).length,6);assert.equal(counted(out).length,6);
    for(const a of sent(out)) {
      const original=JSON.parse(a.request.body),count=JSON.parse(a.input_count.request.body);
      assert.equal(original.service_tier,'default');
      assert.equal(a.request.body_sha256,C.hash(a.request.body));
      assert.equal(a.input_count.count.request_sha256,a.request.body_sha256);
      assert(!Object.hasOwn(count,'service_tier'));
      const srStage=out.run.result.original_sr_result.stages.find(s=>s.stage===a.stage);
      assert.equal(original.instructions,srStage.instructions);
      if(a.attempt==='initial') assert.equal(original.input,srStage.input);
      else assert(original.input.startsWith(srStage.input+'\n\nRepair only'));
      assert.deepEqual(count,Input.payload(a.request.body));assert.equal(count.instructions,original.instructions);assert.equal(count.input,original.input);assert.deepEqual(count.text,original.text);
      assert.equal(a.input_count.count.method,'synthetic-input-counter/1');
    }
    const archive=await R.archiveFor(out);assert.equal(archive.receipt.prepared.input.draft.text,item.draftText);reopen(x,out);
  }
});
test('interruption during counting retains reservations and cannot automatically replay on reopen',async t=>{
  const x=context(t),f=fixture(x.prepared,profile);f.counts=[{crash:true}];
  const out=await R.run({...x.options,fixture:f});
  assert.equal(out.status,'interrupted');assert.equal(sent(out).length,0);assert.equal(counted(out).length,1);
  assert.equal(counted(out)[0].input_count.state,'uncertain');assert.equal(out.journal.liability_nusd,x.plan.maximum_nusd);reopen(x,out);
  const retry=await execute(x);assert.equal(retry.error,'RUN_ALREADY_EXISTS_NO_AUTOMATIC_RESEND');assert.equal(retry.journal.runs.length,1);
});
test('over-limit stop cannot replace an existing session review or remove blockers',async t=>{
  const session=setup(),job=session.requestReview('first'),x=context(t,1000000,job.prepared);
  const first=await execute(x,{problems:[{target:'approval',field:'type',classification:'incorrect'}]});
  await R.attach(session,job.id,first);
  const pending=session.requestReview('pending'),before=session.serialize(),y=context(t,1,pending.prepared),out=await execute(y);
  await assert.rejects(()=>R.attach(session,pending.id,out),/NO_COMPLETED/);
  assert.deepEqual(session.serialize(),before);assert.throws(()=>session.createHandoff('no'));
});
test('native token counting sends once to the fixed counting endpoint without retry, redirect or extra headers in archive',async()=>{
  const https=require('node:https'),{EventEmitter}=require('node:events'),{httpsCount,COUNT_ENDPOINT}=require('./transport.cjs'),old=https.request;
  let calls=0;
  https.request=(url,options,callback)=>{
    calls++;assert.equal(url,COUNT_ENDPOINT);assert.equal(options.agent,false);
    const req=new EventEmitter();req.destroy=()=>{};req.end=()=>{const res=new EventEmitter();res.statusCode=429;res.headers={Authorization:'DO NOT SAVE'};res.setEncoding=()=>{};callback(res);res.emit('data','{"error":"rate limited"}');res.emit('end');};return req;
  };
  try{const result=await httpsCount({body:'{}',apiKey:'fake-key-for-counting',signal:new AbortController().signal});assert.equal(calls,1);assert.equal(result.status,429);assert(!Object.hasOwn(result,'headers'));}finally{https.request=old;}
});
test('old live command lacks required input/count-price arguments and cannot execute',()=>{
  const {argumentsFor}=require('./live.cjs');
  const old=['--execute-live','--journal','j','--output','o','--profile','p','--price-digest','d','--currency','USD','--total-usd','132','--per-run-usd','66','--cases','c3-r1,clear','--run-prefix','old'];
  assert.throws(()=>argumentsFor(old),/EXPLICIT_LIVE_CONFIGURATION_REQUIRED/);
  const selected=argumentsFor([...old,'--input-token-limit','2066','--count-price','c','--count-price-digest','cd']);
  assert.deepEqual(selected.cases,['c3-r1','clear']);
});
