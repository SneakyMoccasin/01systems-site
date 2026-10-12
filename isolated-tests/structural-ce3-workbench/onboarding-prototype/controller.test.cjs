'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {create,act,gate,describe,Store}=require('./controller.cjs'),{cases,answer}=require('./scenario.cjs');
const {Session}=require('../onboarding-session/v2/session.cjs');
const originalFetch=global.fetch;
test.before(()=>{global.fetch=()=>assert.fail('No model or external network in prototype tests');});
test.after(()=>{global.fetch=originalFetch;});
async function reviewed(id){const c=cases.find(c=>c.id===id);let s=create(c.id,c.question,c.situation);s=await act(s,{action:'propose'});return act(s,{action:'review'});}
test('unclear case blocks confirmation, preserves finding after answer, and requires explicit proposal and new review',async()=>{
  let s=await reviewed('unclear'),before=s.serialize();
  assert.equal(gate(s).allowed,false);assert.deepEqual(s.serialize(),before);
  await assert.rejects(()=>act(s,{action:'confirm',by:'Testkund',acknowledged:true}),/CONFIRMATION_BLOCKED/);
  s=await act(s,{action:'answer',text:answer(2)});
  assert.equal(s.view().statuses.review,'stale');assert.equal(s.view().proposals.length,1);
  assert.equal(s.view().reviews[0].result.findings.length,1);assert.equal(s.view().effective_dispositions.length,0);
  assert.equal(gate(s).allowed,false);
  s=await act(s,{action:'propose'});assert.equal(s.view().proposals.length,2);assert.equal(gate(s).allowed,false);
  assert(describe(s).changes.some(c=>c.before==='Godkänt dag 2'&&c.after.includes('separat besked')));
  s=await act(s,{action:'review'});assert.equal(gate(s).allowed,true);
  s=await act(s,{action:'confirm',by:'Testkund',acknowledged:true});
  assert.equal(s.view().statuses.confirmation,'confirmed');
  assert.equal(s.view().transfers_v2[0].ce3_run_status,'not_run');
  assert(Object.values(s.serialize().archives).every(a=>a.producer.mode==='synthetic'));
});
test('clear case adds no unnecessary questions; later correction invalidates exact review, confirmation and transfer',async()=>{
  let s=await reviewed('clear');assert.equal(s.view().questions.length,0);assert.equal(gate(s).allowed,true);
  s=await act(s,{action:'confirm',by:'Testkund',acknowledged:true});const confirmed=s.serialize();
  s=await act(s,{action:'answer',text:answer(3)});const v=s.view();
  assert.equal(v.statuses.review,'stale');assert.equal(v.statuses.confirmation,'stale');assert.equal(v.transfers_v2[0].current,false);
  assert.equal(v.confirmations_v2.length,1);assert.equal(gate(s).allowed,false);
  s=await act(s,{action:'propose'});assert.equal(s.view().proposals.at(-1).items.find(i=>i.id==='target-day').value,3);
  s=await act(s,{action:'review'});assert.equal(s.view().statuses.confirmation,'stale');
  assert.equal(Session.restore(confirmed).view().statuses.confirmation,'confirmed');
});
test('free text is stored without invented proposal or automatic finding resolution',async()=>{
  const c=cases[0],custom=create(c.id,'Min egen fråga','Något helt annat');
  assert.equal(describe(custom).can_propose,false);assert.equal(custom.view().proposals.length,0);
  await assert.rejects(()=>act(custom,{action:'propose'}),/UNSCRIPTED_INPUT/);
  let s=await reviewed('unclear');s=await act(s,{action:'answer',text:'Jag vet inte ännu.'});
  assert.equal(s.view().answers.at(-1).text,'Jag vet inte ännu.');assert.equal(describe(s).can_propose,false);
  await assert.rejects(()=>act(s,{action:'propose'}),/UNSCRIPTED_INPUT/);
  s=await act(s,{action:'answer',text:answer(2)});assert.equal(s.view().answers.length,2);
  assert.equal(s.view().answers[1].replaces_answer_id,s.view().answers[0].id);
});
test('snapshots reopen exact session/2 archives and history; stale screens and tampering fail closed',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ce3-onboarding-ui-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const store=new Store(dir),s=await reviewed('clear'),first=store.save(s);
  const confirmed=await store.dispatch({action:'confirm',id:first.id,snapshot:first.snapshot,checksum:first.checksum,by:'Testkund',acknowledged:true});
  const reopened=new Store(dir).open(first.id,confirmed.snapshot);
  assert.deepEqual(reopened.technical,confirmed.technical);assert.equal(reopened.view.statuses.confirmation,'confirmed');
  const historical=store.open(first.id,first.snapshot);assert.equal(historical.latest,false);
  assert.deepEqual(historical.technical,first.technical);
  await assert.rejects(()=>store.dispatch({action:'answer',id:first.id,snapshot:first.snapshot,checksum:first.checksum,text:answer(3)}),/STALE_SCREEN/);
  const file=path.join(dir,first.id,confirmed.snapshot),bad=JSON.parse(fs.readFileSync(file));delete bad.archives[Object.keys(bad.archives)[0]];
  fs.writeFileSync(file,JSON.stringify(bad));assert.throws(()=>store.open(first.id));
  assert.deepEqual(store.open(first.id,first.snapshot).technical,first.technical);
});
