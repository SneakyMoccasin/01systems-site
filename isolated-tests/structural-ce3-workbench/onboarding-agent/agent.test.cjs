'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {Session,Store,Agent,describe}=require('./agent.cjs');
const P=require('./protocol.cjs');const {OfflineProvider,RecordedProvider,LocalCommandProvider,offline}=require('./providers.cjs');
const {createServer}=require('./server.cjs');
const full='Mål: Vi vill starta dag 5.\nStartläge: Provet är inte klart.\nBeslut: Beställ prov.\nBeslut: Starta verksamheten.\nBeroende: Provet måste vara klart innan starten.\nBesked: Kunden lämnar klartecken.\nTid: Klartecken lämnas dag 4.';
function fixture(t,provider=new OfflineProvider()) {const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ce3-agent-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const store=new Store(dir);return {dir,store,agent:new Agent(store,provider)};}
const cmd=(v,action,extra={})=>({id:v.id,snapshot:v.snapshot,checksum:v.checksum,action,...extra});
function accepted(v){assert.equal(v.last_attempt.status,'accepted',v.last_attempt.error);return v;}
function refsValid(p){for(const i of p.items)for(const r of i.refs){const s=p.sources.find(s=>s.id===r.source_id&&s.version===r.source_version);assert.equal(s.content.slice(r.start,r.end),r.quote);}}

test('free Swedish text becomes source-bound draft only, with all six roles and no SR or motor calls',async t=>{
  const {agent,store}=fixture(t);const v=accepted(await agent.dispatch({action:'create',text:full}));
  assert.equal(v.proposal.schema_version,'ce3-onboarding-proposal/1');assert.equal(v.proposal.items.filter(i=>i.kind==='plan').length,2);
  for(const role of ['goal','initial','decision','dependency','external','time'])assert(v.summary.find(x=>x.role===role).items.length);
  assert.equal(v.provenance.kind,'deterministic_offline');assert.equal(v.provenance.model_calls,0);assert.equal(v.statuses.review,'not_requested');
  assert.equal(v.session.archives&&Object.keys(v.session.archives).length,0);assert(!v.session.events.some(e=>/review|confirm|handoff/.test(e.op)));
  assert.equal(v.base_commit,P.BASE);refsValid(v.proposal);
  assert.deepEqual(describe(store,v.id).session,v.session);
  assert.throws(()=>store.load(v.id).session.createHandoff('forbidden'),/HANDOFF/);
});
test('missing information asks at most three prioritised questions, answers resolve only their own target',async t=>{
  const {agent}=fixture(t);let v=accepted(await agent.dispatch({action:'create',text:'Mål: Vi vill öppna en verkstad.'}));
  assert.equal(v.questions.length,3);assert(v.remaining_questions>=2);
  const q=v.questions[0],before=v.proposal.revision;v=accepted(await agent.dispatch(cmd(v,'answer',{question_id:q.id,text:'Vi kan besluta att beställa utrustning.'})));
  assert.equal(v.proposal.revision,before+1);assert.equal(v.answers.length,1);
  assert.equal(v.proposal.items.find(i=>i.id===q.target_ids[0]).status,'known');
  assert(v.proposal.items.find(i=>i.id===q.target_ids[0]).refs.some(r=>r.source_id===v.answers[0].source_id));
  assert(v.proposal.gaps.some(g=>g.status==='open'));refsValid(v.proposal);
});
test('unknown remains null and repeated uncertainty remains visible',async t=>{
  const {agent}=fixture(t);let v=accepted(await agent.dispatch({action:'create',text:full.replace('lämnas dag 4','är okänd')}));
  const q=v.questions[0];v=accepted(await agent.dispatch(cmd(v,'answer',{question_id:q.id,text:'Jag vet inte ännu.'})));
  assert.equal(v.proposal.items.find(i=>i.id===q.target_ids[0]).value,null);assert(v.questions.length>0);
});
test('explicit contradictory times preserved; unrelated activity times are not contradictions',async t=>{
  const {agent}=fixture(t);const v=accepted(await agent.dispatch({action:'create',text:full+'\nTid: Leveransen sker dag 2.\nTid: Leveransen sker dag 3.\nTid: Installationen sker dag 4.\nTid: installationen sker dag 4'}));
  const conflicts=v.proposal.items.filter(i=>i.status==='conflict');assert.equal(conflicts.length,2);assert(conflicts.every(i=>i.value===null));
  assert(v.proposal.gaps.some(g=>g.kind==='conflict'));assert(!v.proposal.items.find(i=>i.statement.includes('Installationen')).status.includes('conflict'));
});
test('unsupported resources are preserved and cannot be omitted by a provider',async t=>{
  const {agent}=fixture(t);const v=accepted(await agent.dispatch({action:'create',text:full+'\nBeroende: Två jobb delar samma resurs och får inte köras parallellt.'}));
  assert(v.proposal.gaps.some(g=>g.kind==='unsupported_profile'&&g.status==='open'));
  const malicious=new RecordedProvider([req=>{const r=offline(req);r.items=r.items.filter(i=>!i.statement.includes('Två jobb'));r.gaps=[];r.questions=[];return r;}]);
  const other=fixture(t,malicious);const failed=await other.agent.dispatch({action:'create',text:full+'\nBeroende: Två jobb delar samma resurs.'});
  assert.equal(failed.last_attempt.status,'rejected');assert.match(failed.last_attempt.error,/UNREPRESENTED/);assert.equal(failed.proposal,null);
});
test('proposed assumptions never become established facts',async t=>{
  const {agent}=fixture(t);const v=accepted(await agent.dispatch({action:'create',text:full+'\nTid: Antagande: provet tar två dagar.'}));
  const item=v.proposal.items.find(i=>i.statement.includes('Antagande'));assert.equal(item.type,'ai_proposal');assert(v.proposal.gaps.some(g=>g.item_ids.includes(item.id)&&g.status==='open'));
});
test('corrected answer preserves versions and cites current answer, without changing the goal',async t=>{
  const {agent}=fixture(t);let v=accepted(await agent.dispatch({action:'create',text:full.replace('lämnas dag 4','är okänd')}));const q=v.questions[0];
  v=accepted(await agent.dispatch(cmd(v,'answer',{question_id:q.id,text:'Klartecknet kommer dag 4.'})));const first=v.answers.at(-1),goal=v.proposal.analysis.question,old=v.session;
  v=accepted(await agent.dispatch(cmd(v,'answer',{question_id:q.id,text:'Jag skrev fel, klartecknet kommer dag 6.'})));
  assert.equal(v.answers.at(-1).replaces_answer_id,first.id);assert.equal(v.answers.at(-1).source_version,2);
  assert.equal(v.proposal.analysis.question,goal);assert.deepEqual(v.session.events.slice(0,old.events.length),old.events);
  assert(v.proposal.items.find(i=>i.id===q.target_ids[0]).refs.some(r=>r.source_version===2&&r.source_id===first.source_id));refsValid(v.proposal);
});
test('provider failure retains the new answer, stale draft and full immutable attempt',async t=>{
  const {agent,store}=fixture(t);let v=accepted(await agent.dispatch({action:'create',text:'Mål: Öppna verkstad.'}));const q=v.questions[0],previous=v.proposal;
  agent.provider=new RecordedProvider([()=>{throw Error('SYNTHETIC_FAILURE');}]);v=await agent.dispatch(cmd(v,'answer',{question_id:q.id,text:'Vi kan välja att beställa.'}));
  assert.equal(v.answers.length,1);assert.equal(v.pending_evidence,true);assert.deepEqual(v.proposal,previous);assert.equal(v.last_attempt.status,'rejected');
  const restored=describe(store,v.id);assert.equal(restored.last_attempt.error,'SYNTHETIC_FAILURE');assert.equal(restored.pending_evidence,true);
});
test('wrong request binding, fabricated quote, deleted item and forged producer are rejected',async t=>{
  const {agent}=fixture(t);let v=accepted(await agent.dispatch({action:'create',text:full}));const good=v.proposal;
  for(const mutate of [r=>r.request_digest='0'.repeat(64),r=>r.items[0].refs[0].quote='påhittat citat',r=>r.items.pop()]){
    agent.provider=new RecordedProvider([req=>{const r=offline(req);mutate(r);return r;}]);v=await agent.dispatch(cmd(v,'propose'));assert.equal(v.last_attempt.status,'rejected');assert.deepEqual(v.proposal,good);
  }
  agent.provider={identity:{kind:'scripted_test',id:'test'},generate:async req=>({response:offline(req),metadata:{kind:'local_model',id:'test'}})};
  v=await agent.dispatch(cmd(v,'propose'));assert.match(v.last_attempt.error,/PRODUCER_BINDING/);
});
test('scripted responses have explicit synthetic provenance; no detection-quality claim',async t=>{
  const {agent}=fixture(t,new RecordedProvider([req=>offline(req)]));const v=accepted(await agent.dispatch({action:'create',text:full}));
  assert.equal(v.provenance.kind,'scripted_test');assert.equal(v.provenance.model_calls,0);assert.match(v.provenance.label,/FÖRSKRIVNA/);
});
test('historical snapshot, stale tab and explicit pause preserve Session/2 history',async t=>{
  const {agent,store}=fixture(t);const v=accepted(await agent.dispatch({action:'create',text:full}));
  const newer=await agent.dispatch(cmd(v,'pause'));assert.equal(newer.lifecycle,'paused');
  await assert.rejects(agent.dispatch(cmd(v,'source',{text:'Ändring'})),/STALE_SNAPSHOT/);
  assert.equal(describe(store,v.id,v.snapshot).latest,false);assert.deepEqual(describe(store,v.id,v.snapshot).session,v.session);
  const r=await agent.dispatch(cmd(newer,'resume'));assert.equal(r.lifecycle,'active');
});
test('source correction supersedes old facts, keeps exact old source and new provenance',async t=>{
  const {agent}=fixture(t);let v=accepted(await agent.dispatch({action:'create',text:full}));const first=v.sources[0];
  v=accepted(await agent.dispatch(cmd(v,'source',{source_id:first.id,text:full.replace('dag 5','dag 6')})));
  assert.deepEqual(v.sources[0],first);assert.equal(v.sources.at(-1).version,2);assert(v.proposal.items.some(i=>i.status==='superseded'));
  assert(v.proposal.items.filter(i=>i.status!=='superseded'&&i.refs.length).every(i=>i.refs[0].source_version===2));
});
test('capabilities reject backend drift without adopting later motor information',t=>{
  const {dir}=fixture(t);const fake=path.join(dir,'fake');fs.mkdirSync(fake);
  for(const [file] of Object.entries(P.capabilities.files)){const dest=path.join(fake,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(__dirname,'../../..',file),dest);}
  assert.equal(P.verifyCapabilities(fake),P.C.digest(P.capabilities));fs.appendFileSync(path.join(fake,Object.keys(P.capabilities.files)[0]),' ');
  assert.throws(()=>P.verifyCapabilities(fake),/CAPABILITY_DRIFT/);assert.equal(require('./engine-information.json').adopted,false);
});
test('local process adapter protocol uses explicit identity, bounded JSON, no inherited credentials',async t=>{
  const {dir}=fixture(t);const file=path.join(dir,'local-stub.cjs');fs.writeFileSync(file,"let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{if(process.env.OPENAI_API_KEY)process.exit(9);console.log(JSON.stringify({request_digest:JSON.parse(s).digest,stub:true}));});");
  const provider=new LocalCommandProvider(process.execPath,[file],'SCRIPTED PROCESS STUB, NOT A MODEL');
  const out=await provider.generate({digest:'test'});assert.equal(out.response.request_digest,'test');assert.equal(out.metadata.kind,'local_model');
  // This proves subprocess transport only. The stub is explicitly not a real model.
});
function request(port,method,url,body,headers={}){return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,method,path:url,headers},res=>{let raw='';res.on('data',c=>raw+=c);res.on('end',()=>resolve({status:res.statusCode,raw,headers:res.headers}));});r.on('error',reject);r.end(body?JSON.stringify(body):undefined);});}
test('loopback HTTP flow, CSRF/Host guards, concurrent stale writes and reopening',async t=>{
  const {dir}=fixture(t);const server=createServer({data:path.join(dir,'http'),port:0});const {port}=await server.start();t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${port}`,headers={origin,'content-type':'application/json'};
  assert.equal((await request(port,'GET','/')).status,200);
  assert.equal((await request(port,'GET','/',null,{host:'evil.example'})).status,400);
  assert.equal((await request(port,'POST','/api/command',{action:'create',text:full},{...headers,origin:'https://evil.example'})).status,400);
  let r=await request(port,'POST','/api/command',{action:'create',text:full},headers);assert.equal(r.status,200);const v=accepted(JSON.parse(r.raw));
  const races=await Promise.all([request(port,'POST','/api/command',cmd(v,'pause'),headers),request(port,'POST','/api/command',cmd(v,'pause'),headers)]);
  assert.deepEqual(races.map(x=>x.status).sort(),[200,409]);
  r=await request(port,'GET','/api/session?id='+v.id);assert.equal(JSON.parse(r.raw).lifecycle,'paused');
  assert.throws(()=>createServer({data:path.join(dir,'http'),port:0}),/EEXIST/);
});
test('UI renders source text safely, source links, questions, historic controls and no run/confirm action',async t=>{
  const {parseHTML}=require('linkedom');const {agent}=fixture(t);const v=accepted(await agent.dispatch({action:'create',text:full+'\nÖvrigt: <img src=x onerror=alert(1)>'}));
  const {document}=parseHTML(fs.readFileSync(path.join(__dirname,'static/index.html'),'utf8'));
  const context=vm.createContext({document,crypto:require('node:crypto').webcrypto,fetch:async()=>({ok:true,json:async()=>({sessions:[],provider:{label:'TEST'}})}),setTimeout,URL,Blob});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'static/app.js'),'utf8'),context);context.value=v;vm.runInContext('show(value)',context);
  assert.equal(document.querySelectorAll('img').length,0);assert(document.getElementById('result').textContent.includes('<img src=x'));
  assert(document.getElementById('result').textContent.includes('version 1'));assert(document.getElementById('result').textContent.includes('Inte kompilerat'));
  const actions=[...document.querySelectorAll('#result button')].map(b=>b.textContent);assert(!actions.some(x=>/Bekräfta|Kör CE3|Granska med SR/.test(x)));
});

test('existing structured review and confirmation become stale on new user evidence, with archives retained',async t=>{
  const {agent,store}=fixture(t);let v=accepted(await agent.dispatch({action:'create',text:full}));
  const Archive=require('../onboarding-session/v2/archive.cjs'),{tapeFor}=require('../onboarding-sr/structured/test-tape.cjs');
  const s=store.load(v.id).session,job=s.requestReview('regression-review');
  const archive=await Archive.recorded(job.prepared,tapeFor(job.prepared));await s.receiveReview(job.id,archive);
  const view=s.view();s.confirm({id:'regression-confirm',proposal_digest:view.proposal_digest,evidence_digest:view.evidence_digest,context_digest:view.context_digest,review_binding:view.current_review.binding,by:'Syntetisk testperson',text:'Förskriven regression, inte faktisk kundbekräftelse.',scope_acknowledged:true});
  assert.equal(s.view().statuses.confirmation,'confirmed');store.save(s);v=describe(store,v.id);
  const before=v.session.archives;
  v=accepted(await agent.dispatch(cmd(v,'source',{source_id:'description',text:full.replace('dag 5','dag 8')})));
  assert.equal(v.statuses.review,'stale');assert.equal(v.statuses.confirmation,'stale');assert.deepEqual(v.session.archives,before);
  assert.throws(()=>store.load(v.id).session.createHandoff('still-forbidden'),/HANDOFF/);
});
test('local reopening rejects corrupted model receipt bytes and never re-invokes a provider',async t=>{
  const {agent,store}=fixture(t);const v=accepted(await agent.dispatch({action:'create',text:full}));
  agent.provider.generate=()=>{throw Error('MUST_NOT_CALL');};assert.equal(describe(store,v.id).provenance.kind,'deterministic_offline');
  const attempt=store.attempts(v.id)[0],file=path.join(store.directory(v.id),'attempts',attempt.id,'response.json');fs.appendFileSync(file,' ');
  assert.throws(()=>describe(store,v.id),/RESPONSE_INTEGRITY/);
});
