// Exercises the actual UI functions with audited fixtures, including hidden rows.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('../../../node_modules/linkedom');
const P=require('../static/presentation.js'),C=require('../static/comparison.js');
const fixtures=JSON.parse(fs.readFileSync('/tmp/ce3-comparison-fixtures.json'));
const {document,window}=parseHTML('<html><body><main id="content"></main><div id="notice"></div></body></html>');
window.HTMLElement.prototype.scrollIntoView=function(){};
let nextId=0;
const context=vm.createContext({document,window,CE3Presentation:P,CE3Comparison:C,console,crypto:{randomUUID:()=> 'test-copy-'+(++nextId)}});
vm.runInContext(fs.readFileSync(__dirname+'/../static/app.js','utf8').split("document.addEventListener('click'")[0],context);
const run=s=>vm.runInContext(s,context);
function selects(){for(const el of document.querySelectorAll('select'))Object.defineProperty(el,'value',{configurable:true,writable:true,value:el.querySelector('[selected]')?.value??el.querySelector('option')?.value??''});}
function render(){run('render()');selects();}
function setup(f){context.f=structuredClone(f);run("useProject(f.project);S.planId=f.result.record.plan_id;S.result=f.result;S.path=f.paths[f.result.reference];S.runs=[f.result.record];S.config={limits:{max_paths:1000},profile:{}};S.tab='plans';S.time=f.project.model.clock.horizon");render();}
(async()=>{
 for(const f of fixtures){
  setup(f);const before=JSON.stringify(context.f.project);
  assert.equal(document.querySelector('#show-all-weeks').hasAttribute('checked'),false);
  run('syncForm()');assert.equal(JSON.stringify(context.f.project),before);
  run('S.showAllWeeks=true');render();assert(document.querySelectorAll('.step-group').length<=12);
  run('syncForm();S.weekPage=1');render();run('syncForm()');
  assert.equal(JSON.stringify(context.f.project),before,'week pagination must preserve all operational rows and presentation');
  await run("changePlanPane('result')");selects();
  const summary=document.querySelector('#run-result').textContent;
  assert.match(summary,/Genomförda beslutsförsök/);assert.match(summary,/Blockerade beslutsförsök/);
  assert.equal(document.querySelector('#run-timeline').hasAttribute('open'),false);
  await run("changePlanPane('edit')");selects();run('syncForm()');
  assert.equal(JSON.stringify(context.f.project),before,'tabs must not change inputs');
 }
 setup(fixtures[0]);
 const source=JSON.parse(run('JSON.stringify(currentPlan().script)'));
 // Editing a week changes sorting; subsequent keystrokes must still target the
 // original DOM row rather than a newly sorted index.
 const step=document.querySelector('[data-row="0"][data-field="step"]');
 step.value='2';run('syncForm()');step.value='21';run('syncForm()');
 assert.equal(run("currentPlan().script.steps['21'][0].decision"),source.steps['0'][0].decision);
 assert.equal(run('entries().length'),Object.values(source.steps).flat().length);
 assert.equal(run('sameRunInput(S.result)'),false,'week edit alone makes result stale');
 setup(fixtures[0]);document.querySelector('[data-outcome]').value='rejected';run('syncForm()');
 const draft=run('JSON.stringify(currentPlan())');
 await run("changePlanPane('result')");selects();assert.match(document.querySelector('#run-result').textContent,/Inaktuellt resultat/);
 assert.match(document.querySelector('.result-outcomes').textContent,/färdigställs/,'saved result must retain its own outcomes');
 await run("changePlanPane('edit')");selects();run('syncForm()');assert.equal(run('JSON.stringify(currentPlan())'),draft);
 assert.equal(document.querySelector('[data-outcome]').value,'rejected');
 // Explicit controls retain attempts and their within-step order.
 setup(fixtures[0]);const rowsBefore=run('JSON.stringify(entries())');
 run("move(2,1);move(3,-1)");assert.equal(run('JSON.stringify(entries())'),rowsBefore);
 run("actions['add-row']()");assert.equal(run('entries().length'),14);
 run("actions.remove({dataset:{index:'13'}})");assert.equal(run('JSON.stringify(entries())'),rowsBefore);
 run('actions.duplicate()');assert.equal(run('entries().length'),13);assert.equal(run('S.planPane'),'edit');
 run("actions['new-plan']()");selects();run('syncForm()');assert.equal(run('entries().length'),0,'empty plan must not inherit editor snapshot');
 // Nonzero starts and a million-step horizon never generate a million rows.
 setup(fixtures[0]);run('S.p.model.clock.start=5;S.p.model.clock.horizon=1000005;S.showAllWeeks=true;S.weekPage=83333');render();
 assert(document.querySelectorAll('.step-group').length<=12);assert.match(document.querySelector('.step-group').getAttribute('aria-label'),/1000001/);
 // Group timeline by week without changing saved event/attempt order.
 setup(fixtures.find(f=>f.family==='same_parking'&&f.outcome==='ready'&&f.result.record.plan_name.startsWith('Plan B')));
 run("S.planPane='result';S.timelineOpen=true");render();
 const tw=[...document.querySelectorAll('.timeline-week')].find(el=>el.querySelector('h3').textContent==='Vecka 12');
 assert(tw);const expected=context.f.paths[context.f.result.reference].history.filter(r=>r.step===12&&['decision_executed','attempt_blocked','script_skip','event_applied','event_inapplicable'].includes(r.kind));
 assert.deepEqual([...tw.querySelectorAll('[data-action="inspect-row"]')].map(el=>Number(el.dataset.index)),expected.map(r=>r.index));
 assert(tw.querySelector('.timeline-event'));assert(tw.querySelector('.timeline-attempt'));
 // Failed/incomplete results never masquerade as a complete budget summary.
 for(const status of ['INCOMPLETE','FAIL']){run(`S.result.audit.status='${status}';S.result.status='${status}';S.result.complete=false`);render();assert.match(document.querySelector('#run-result').textContent,/Inget fullständigt granskat resultat/);assert.equal(document.querySelectorAll('#run-result .metric').length,0);}
 console.log('PASS: 11 audited fixtures; tabs, draft outcomes, stale provenance, hidden rows, multi-keystroke week edits, explicit movement/add/remove/duplicate, empty plan, million-step horizon, timeline order, incomplete/failed audit.');
})().catch(e=>{console.error(e);process.exitCode=1;});
