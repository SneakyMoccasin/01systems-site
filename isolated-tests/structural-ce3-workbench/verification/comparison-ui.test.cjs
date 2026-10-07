const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('../../../node_modules/linkedom');
const C=require('../static/comparison.js'),P=require('../static/presentation.js');
const fixtures=JSON.parse(fs.readFileSync('/tmp/ce3-comparison-fixtures.json','utf8'));
const original=JSON.stringify(fixtures);
const observe=f=>f.paths.map(path=>C.analyse(f.project.model,path,f.project.presentation[f.project.model_identity].comparison));
for(const outcome of ['ready','rejected','absent']){
 const [af,bf]=fixtures.filter(f=>f.family==='same_parking'&&f.outcome===outcome);
 for(const a of observe(af))for(const b of observe(bf)){
  const model=af.project.model,focus=C.focus(model,a,b),reverse=C.focus(model,b,a);
  assert.deepEqual([focus.left,focus.right],outcome==='ready'?[20,12]:[null,null]);
  assert.deepEqual([reverse.left,reverse.right],[focus.right,focus.left]);
  assert.deepEqual([a.remaining,b.remaining],[1,1]);
  assert.deepEqual([a.spent,b.spent],[29,29]);
  assert.deepEqual([a.gaps[0].anchor,b.gaps[0].anchor],[14,14]);
  assert.equal(a.gaps[0].total,outcome==='ready'?6:12);
  assert.equal(b.gaps[0].total,outcome==='ready'?0:12);
  assert.equal(a.gaps[1].total,2);assert.equal(b.gaps[1].total,0);
  assert.equal(a.gaps[0].periods[0].ongoing,outcome!=='ready');
  assert.equal(a.gaps[0].periods[0].end,outcome==='ready'?20:null);
  const blocked=a.decisions.find(d=>d.id==='T7').blocked[0];
  assert.equal(blocked.step,12);
  assert.deepEqual(blocked.failures.map(f=>[f.field,f.met]),[['depot_ready',16],['charger_installed',18],['grid',outcome==='ready'?20:null]]);
  const failedIndices=a.decisions.flatMap(d=>d.blocked.map(r=>r.index));
  assert(a.payments.every(p=>!failedIndices.includes(p.index)));
 }
}
const delayed=observe(fixtures.find(f=>f.family==='delayed'))[0];
assert.equal(delayed.decisions.find(d=>d.id==='T7').ready,20);
assert.deepEqual(delayed.decisions.find(d=>d.id==='T7').executed,[22]);
const factory=fixtures.filter(f=>f.family==='factory').map(f=>observe(f)[0]);
assert.equal(C.focus(fixtures.find(f=>f.family==='factory').project.model,...factory).id,'D8');
assert.deepEqual(factory.map(x=>x.decisions.find(d=>d.id==='D8').executed[0]),[12,13]);
assert(factory.every(x=>x.gaps.length===0&&x.spec.note.includes('saknas')));
for(const f of fixtures.filter(f=>f.family==='imported')){
 const o=observe(f)[0];assert.equal(o.gaps.length,0);assert.match(o.spec.note,/saknas/);
 assert.match(P.view(f.project).name('D8','decisions'),/ID: D8/);
}
// Reopening, same-step intervals and horizon censoring must not be mistaken for
// one permanently achieved milestone. This synthetic fixture exercises only observations.
const model={clock:{start:0,horizon:8},budget:null,domains:{after:{enum:[false,true]},ready:{enum:[false,true]}},initial:{after:false,ready:false},decisions:{}};
const spec={gaps:[{name:'Deklarerat glapp',after:{field:'after',op:'eq',value:true},until:{field:'ready',op:'eq',value:true}}]};
const rows=[[0,false,false],[1,true,false],[3,true,true],[5,true,false],[8,true,false]].map(([step,after,ready],index)=>({step,index,kind:'step_end',before:{phase:'ended',state:{after,ready},taken:[]},after:{phase:'ended',state:{after,ready},taken:[]}}));
assert.deepEqual(C.analyse(model,{history:rows},spec).gaps[0].periods,[{start:1,end:3,length:2,ongoing:false},{start:5,end:null,length:3,ongoing:true}]);
const atHorizon=structuredClone(rows);atHorizon.at(-1).after.state.ready=true;
assert.equal(C.analyse(model,{history:atHorizon},spec).gaps[0].periods.at(-1).ongoing,false);
assert.equal(C.analyse(model,{history:rows},null).spent,null);
// Actual renderer: hierarchy, payment rows, cautions and reversal follow the observations.
const {document}=parseHTML('<html><body><main id="content"></main></body></html>');
const ctx=vm.createContext({document,CE3Presentation:P,CE3Comparison:C,console,window:{},crypto:{},structuredClone});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../static/app.js'),'utf8').split("document.addEventListener('click'")[0],ctx);
function render(fa,fb){
 ctx.project=fa.project;ctx.comparison={left:fa.result,right:fb.result,pathA:fa.paths[fa.result.reference],pathB:fb.paths[fb.result.reference],indexA:fa.result.reference,indexB:fb.result.reference,time:fa.project.model.clock.horizon};
 vm.runInContext("S.p=project;S.tab='compare';document.querySelector('#content').innerHTML=comparisonStory(comparison)",ctx);
 return document.querySelector('#content');
}
const [a,b]=fixtures.filter(f=>f.family==='same_parking'&&f.outcome==='ready');
let content=render(a,b);
assert.deepEqual([...content.querySelectorAll(':scope > section > .eyebrow')].map(e=>e.textContent),['01 · HUVUDSKILLNADEN','02 · KONSEKVENSEN','03 · VARFÖR','04 · UTGIFTERNA','05 · FÖRUTSÄTTNINGARNA']);
assert.match(content.querySelector('.story-main').textContent,/8 veckor tidigare/);
assert.match(content.querySelector('.story-main').textContent,/vecka 20/i);
assert.equal(content.querySelectorAll('.payments tbody tr').length,20);
assert.match(content.querySelector('.story-spending').textContent,/1 miljon/);
assert(!content.querySelector('.story-spending').textContent.includes('Mkr'));
content=render(b,a);assert.match(content.querySelector('.story-lead').textContent,/Plan B.*8 veckor tidigare.*Plan A/);
const negative=fixtures.filter(f=>f.family==='same_parking'&&f.outcome==='rejected');
content=render(...negative);assert.match(content.querySelector('.story-main').textContent,/Inget senare datum/);
assert.match(content.querySelector('.story-consequence').textContent,/Minst 12 veckor/);
content=render(a,negative[1]);assert.match(content.querySelector('.story-main').textContent,/Olika externa besked/);
render(a,b);ctx.comparison.time=14;
vm.runInContext("document.querySelector('#content').innerHTML=comparisonStory(comparison)",ctx);
assert.match(document.querySelector('.story-main').textContent,/Välj analysens slut för senare observationer/);
assert(!document.querySelector('.story-main').textContent.includes('är inte känt'));
const importedBase=fixtures.find(f=>f.family==='imported');
const stateOnly=structuredClone(importedBase);
stateOnly.paths[stateOnly.result.reference].history.at(-1).after.state.budget=1;
content=render(importedBase,stateOnly);
assert.match(content.querySelector('.story-main').textContent,/Tillstånd skiljer sig/);
assert.equal(C.definition(model,{gaps:[null]}).gaps.length,0);
assert.equal(C.definition(model,{gaps:[{name:'Fel',after:{field:'unknown',op:'eq',value:true},until:spec.gaps[0].until}]}).gaps.length,0);
assert.equal(JSON.stringify(fixtures),original);
console.log('PASS: all audited paths for positive/rejected/absent, horizon censoring, separate readiness/retry, factory/import fallback, reversal, payments, reopened gaps, UI hierarchy and mixed-outcome warning; inputs untouched.');
