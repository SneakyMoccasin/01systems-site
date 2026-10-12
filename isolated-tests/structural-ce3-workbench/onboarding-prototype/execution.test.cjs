'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {create,act,Store}=require('./controller.cjs'),W=require('./warehouse.cjs'),E=require('./execution.cjs');
const vm=require('node:vm'),{parseHTML}=require('../../../node_modules/linkedom');
function checkPresentation(experiment) {
  const {document}=parseHTML('<html><body><main id="content"></main></body></html>');
  const ctx=vm.createContext({document,experiment});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'static/app.js'),'utf8').split("document.addEventListener('click'")[0],ctx);
  vm.runInContext('document.querySelector("#content").innerHTML=runResults(experiment)',ctx);
  const cards=[...document.querySelectorAll('.run-result')];assert.equal(cards.length,2);
  for(const [i,card] of cards.entries()){
    const observations=experiment.result.scenarios[i].observations,day=experiment.payload.assumptions.analysis_day;
    assert(card.textContent.includes(`genomfördes starten ${observations.every(o=>o.started_by_day)?'':'inte '}senast dag ${day}`));
    assert(card.textContent.includes(`Observerad start: dag ${observations[0].actual_start}`));
    const missing=observations.flatMap(o=>o.trace.filter(r=>r.kind==='attempt_blocked'&&r.step===day).flatMap(r=>r.failures.map(f=>f.field)));
    assert.equal(card.textContent.includes('funktionsprovet var inte klart'),missing.includes('test_done'));
    assert.equal(card.textContent.includes('beställarens klartecken hade inte kommit'),missing.includes('approval_received'));
  }
}
async function confirmed(day=2,condition=null) {
  const c=W.cases.find(c=>c.id===(condition===null?'warehouse':'warehousegap'));
  let s=create(c.id,c.question,c.situation);s=await act(s,{action:'propose'});s=await act(s,{action:'review'});
  if(condition!==null){s=await act(s,{action:'answer',text:W.conditionAnswers[condition]});s=await act(s,{action:'update'});}
  if(day===3){s=await act(s,{action:'answer',text:W.timingAnswers[1]});s=await act(s,{action:'analysis_choice',question_id:W.pendingChoice(s.view()).id,text:W.analysisOptions[0].text});s=await act(s,{action:'update'});}
  return act(s,{action:'confirm',by:'Offline test',acknowledged:true});
}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ce3-execution-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return new Store(dir);}
async function command(store,saved,action,extra={}){return store.dispatch({action,id:saved.id,snapshot:saved.snapshot,checksum:saved.checksum,...extra});}
for(const day of [2,3])test(`actual CE3 replay day ${day}: on-time/late, audit, binding and reopening`,async t=>{
  const store=setup(t),s=await confirmed(day),before=s.serialize(),saved=store.save(s);
  let v=await command(store,saved,'prepare_experiment',{finish_day:1});const experiment=v.execution.experiments.at(-1);
  assert.equal(experiment.result.status,'prepared');assert.equal(experiment.payload.assumptions.analysis_day,day);
  await assert.rejects(()=>command(store,v,'run_experiment',{experiment:experiment.id,acknowledged:false}),/ACKNOWLEDGEMENT_REQUIRED/);
  v=await command(store,v,'run_experiment',{experiment:experiment.id,acknowledged:true});
  const r=v.execution.experiments.at(-1);assert.equal(r.result.status,'complete');assert(r.current);
  checkPresentation(r);
  assert.deepEqual(v.technical,before); // neither conditions nor replay mutate confirmation or session/2
  for(const [index,result] of r.result.scenarios.entries()){
    assert.equal(result.audit.status,'PASS');
    for(const o of result.observations){
      assert.equal(o.started_by_day,index===0);assert.equal(o.actual_start,day+index);
      const attempted=o.trace.find(x=>x.action==='start'&&x.step===day);
      assert.equal(attempted.kind,index===0?'decision_executed':'attempt_blocked');
      if(index)assert.deepEqual(attempted.failures.map(f=>f.field),['approval_received']);
      else assert(o.trace.find(x=>x.action==='approval').index<attempted.index);
    }
  }
  assert.deepEqual(new Store(store.root).open(v.id).execution,v.execution);
  const firstRun=r.result.scenarios[0],inputFile=path.join(store.directory(v.id),'experiments',r.id,'projects',firstRun.project_id,'runs',firstRun.run_id,'input.json');
  const inputBytes=fs.readFileSync(inputFile),altered=JSON.parse(inputBytes);altered.model.initial.test_done=true;fs.writeFileSync(inputFile,JSON.stringify(altered));
  const damaged=store.open(v.id).execution.experiments[0];assert.equal(damaged.current,false);assert.match(damaged.error,/motorindata/);
  fs.writeFileSync(inputFile,inputBytes);
  await assert.rejects(()=>command(store,v,'run_experiment',{experiment:r.id,acknowledged:true}),/exists/);
  const changed=await command(store,v,'prepare_experiment',{finish_day:day+1});
  assert.equal(changed.execution.experiments[0].current,false);assert.equal(changed.execution.experiments[1].result.status,'prepared');
  await assert.rejects(()=>command(store,changed,'run_experiment',{experiment:r.id,acknowledged:true}),/historiska/);
  const next=await command(store,changed,'run_experiment',{experiment:changed.execution.experiments[1].id,acknowledged:true});
  checkPresentation(next.execution.experiments[1]);
  for(const result of next.execution.experiments[1].result.scenarios)for(const o of result.observations){
    assert.equal(o.started_by_day,false);assert.equal(o.actual_start,day+1);
    assert(o.trace.find(x=>x.action==='start'&&x.step===day).failures.some(f=>f.field==='test_done'));
    const finish=o.trace.find(x=>x.action==='test_done'&&x.kind==='event_applied');
    const retry=o.trace.find(x=>x.action==='start'&&x.step===day+1);
    assert.equal(finish.step,day+1);assert.equal(retry.kind,'decision_executed');assert(finish.index<retry.index);
    const {document}=parseHTML('<main id="content"></main>'),context=vm.createContext({document,view:next});
    vm.runInContext(fs.readFileSync(path.join(__dirname,'static/app.js'),'utf8').split("document.addEventListener('click'")[0],context);
    vm.runInContext('current=view;document.querySelector("#content").innerHTML=experimentView()',context);
    assert.match(document.querySelector('#test-finish').lastElementChild.textContent,/efter första startförsöket, före det andra samma dag/);
  }
  const corrected=await command(store,next,'answer',{text:W.timingAnswers[1]});
  assert.equal(corrected.execution.availability.allowed,false);assert(corrected.execution.experiments.every(x=>!x.current));
  await assert.rejects(()=>command(store,corrected,'prepare_experiment',{finish_day:1}),/Aktuell kundbekräftelse/);
  await assert.rejects(()=>command(store,corrected,'run_experiment',{experiment:changed.execution.experiments[1].id,acknowledged:true}),/Aktuell kundbekräftelse/);
  assert(store.open(saved.id,saved.snapshot).execution.experiments.every(x=>!x.current));
  await assert.rejects(()=>command(store,saved,'prepare_experiment',{finish_day:1}),/STALE_SCREEN/);
});
test('explicit yes/no controls only the approval guard; unknown never becomes a runnable boolean',async t=>{
  const store=setup(t);
  for(const answer of [0,1]){
    const s=await confirmed(2,answer),saved=store.save(s),prepared=await command(store,saved,'prepare_experiment',{finish_day:2});
    const result=await command(store,prepared,'run_experiment',{experiment:prepared.execution.experiments[0].id,acknowledged:true});
    const e=result.execution.experiments[0];assert.equal(e.result.status,'complete');
    checkPresentation(e);
    assert(e.result.scenarios[0].observations.every(o=>o.started_by_day));
    assert(e.result.scenarios[1].observations.every(o=>o.started_by_day===(answer===1)));
    assert.equal(e.result.scenarios[0].observations.length,2); // simultaneous independent events, all orders
  }
  await assert.rejects(()=>confirmed(2,2),/CONFIRMATION_BLOCKED/);
  const c=W.cases[0],s=create(c.id,c.question,c.situation);assert.equal(E.available(s).allowed,false);
});
test('input validation, interrupted runs and corrupted archives fail closed',async t=>{
  const store=setup(t),s=await confirmed(),saved=store.save(s);
  for(const finish_day of [0,4,1.2,'1',null])await assert.rejects(()=>command(store,saved,'prepare_experiment',{finish_day}),/hel dag/);
  const p=await command(store,saved,'prepare_experiment',{finish_day:1}),id=p.execution.experiments[0].id;
  const folder=path.join(store.directory(saved.id),'experiments',id),file=path.join(folder,'request.json');
  // Lost/mutated request cannot show a current result or execute.
  const raw=fs.readFileSync(file,'utf8'),bad=JSON.parse(raw);bad.payload.assumptions.function_test_finish=2;fs.writeFileSync(file,JSON.stringify(bad));
  assert.match(store.open(saved.id).execution.experiments[0].error,/integritet/);
  await assert.rejects(()=>command(store,p,'run_experiment',{experiment:id,acknowledged:true}),/integritet/);
  fs.writeFileSync(file,raw);
  // A process interruption after exclusive marker, before any core result.
  const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
  const digest=require('node:crypto').createHash('sha256').update(JSON.stringify(sort(JSON.parse(raw).payload))+'\n').digest('hex');
  fs.writeFileSync(path.join(folder,'attempt.json'),JSON.stringify({payload_digest:digest,assumptions_acknowledged:true,projects:[]}));
  const interrupted=store.open(saved.id).execution.experiments[0];assert.equal(interrupted.result.status,'incomplete');
  assert(interrupted.result.scenarios.every(x=>x.status==='INCOMPLETE'));
  await assert.rejects(()=>command(store,p,'run_experiment',{experiment:id,acknowledged:true}),/exists/);
  fs.renameSync(file,file+'.missing');assert.equal(store.open(saved.id).execution.experiments[0].current,false);
});
