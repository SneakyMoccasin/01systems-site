const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const {parseHTML}=require('../../../node_modules/linkedom');
const C=require('../static/comparison.js'),P=require('../static/presentation.js');
const fixtures=JSON.parse(fs.readFileSync('/tmp/ce3-comparison-fixtures.json')),original=JSON.stringify(fixtures);
const bundle=f=>({paths:f.paths,audit:f.result.audit,input_sha256:f.result.record.input_sha256});
function check(f,focus,time){return C.coverage(f.result,bundle(f),f.project.presentation[f.project.model_identity].comparison,focus,time);}
for(const outcome of ['ready','rejected','absent']){
 const [a,b]=fixtures.filter(f=>f.family==='same_parking'&&f.outcome===outcome),spec=a.project.presentation[a.project.model_identity].comparison;
 const focus=C.focus(a.project.model,C.analyse(a.project.model,a.paths[0],spec),C.analyse(b.project.model,b.paths[0],spec));
 for(const f of [a,b]){const c=check(f,focus);assert.equal(c.status,'stable');assert.equal(c.count,f.paths.length);assert.equal(c.metrics.focus[0].value.first,outcome==='ready'?(f===a?20:12):null);assert.deepEqual([c.details.attempts,c.details.transactions,c.details.final],[true,true,true]);assert(c.details.eventVariations>0);assert.equal(c.details.stepEndVariations,0);}
 for(const f of [a,b]){
  for(const mutate of [x=>x.result.audit.all_event_permutations=false,x=>x.result.audit.verified=false,x=>x.result.complete=false,x=>x.result.status='INCOMPLETE',x=>x.paths.pop(),x=>x.paths[1]=structuredClone(x.paths[0]),x=>x.result.audit.input_sha256='wrong']){const x=structuredClone(f);mutate(x);assert.equal(check(x,focus).status,'unknown');}
 }
}
for(const family of ['factory','imported']){
 const [a,b]=fixtures.filter(f=>f.family===family),spec=a.project.presentation[a.project.model_identity].comparison;
 const focus=C.focus(a.project.model,C.analyse(a.project.model,a.paths[0],spec),C.analyse(b.project.model,b.paths[0],spec));
 assert.equal(check(a,focus).status,'stable');assert.equal(check(b,focus).status,'stable');assert(!Object.keys(check(a,focus).metrics).some(k=>k.startsWith('gap:')));
}
const variable=JSON.parse(fs.readFileSync('/tmp/ce3-variable-comparison.json'));
for(const f of variable){const spec=f.project.presentation[f.project.model_identity].comparison;const c=C.coverage(f.result,f.bundle,spec,{guard:spec.focus},3);assert.equal(c.status,'varied');for(const key of ['focus','gap:0','spent','remaining'])assert.equal(c.metrics[key].length,2);assert.deepEqual([c.details.attempts,c.details.transactions,c.details.final],[false,false,false]);assert(c.metrics['gap:0'].some(x=>x.value.periods.some(p=>p.ongoing)));assert(c.metrics['gap:0'].some(x=>x.value.periods.some(p=>!p.ongoing)));}
const {document}=parseHTML('<html><body><div id="content"></div></body></html>');const ctx=vm.createContext({document,CE3Presentation:P,CE3Comparison:C,console});vm.runInContext(fs.readFileSync(__dirname+'/../static/app.js','utf8').split("document.addEventListener('click'")[0],ctx);
function render(a,b,full=true){ctx.p=structuredClone(a.project);const def=ctx.p.presentation[ctx.p.model_identity].comparison;if(def&&a.family==='same_parking')def.result_phrase='får trafikökningen godkänd';ctx.c={left:a.result,right:b.result,pathA:a.paths?.[0]||a.bundle.paths[0],pathB:b.paths?.[0]||b.bundle.paths[0],indexA:0,indexB:0,time:a.project.model.clock.horizon,...(full?{allA:a.bundle||bundle(a),allB:b.bundle||bundle(b)}:{})};vm.runInContext('S.p=p;document.querySelector("#content").innerHTML=comparisonStory(c)',ctx);return document.querySelector('#content');}
const [a,b]=fixtures.filter(f=>f.family==='same_parking'&&f.outcome==='ready');let el=render(a,b);assert.match(el.querySelector('.story-lead').textContent,/Plan B.*får trafikökningen godkänd 8 veckor tidigare.*Plan A/);assert.match(el.querySelector('.comparison-control').textContent,/8 för Plan A.*96 för Plan B/);assert.equal(el.querySelectorAll('.blocked-attempt tbody tr').length,3);assert.match(el.querySelector('.cause-phases').textContent,/12, 20/);assert.match(el.querySelector('.story-why').textContent,/vald bana/);
el=render(b,a);assert.match(el.querySelector('.story-lead').textContent,/Plan B.*8 veckor tidigare.*Plan A/);
el=render(a,b,false);assert.match(el.querySelector('.comparison-control').textContent,/ofullständig eller saknar data/);
el=render(...variable);assert.match(el.querySelector('.comparison-control').textContent,/varierar/);assert(el.querySelector('.story-main .metric-variation'));assert(el.querySelector('.story-consequence .metric-variation'));assert.equal(el.querySelectorAll('.story-spending .metric-variation').length,4);
// A marker observed only in an intermediate state is not silently called stable.
for(const f of variable){const spec=f.project.presentation[f.project.model_identity].comparison;assert.equal(C.coverage(f.result,f.bundle,spec,{guard:spec.focus},0).status,'stable');assert.equal(C.coverage(f.result,f.bundle,null,null,3).metrics.state.length,2);}
const noDefinition=structuredClone(variable);for(const f of noDefinition){delete f.project.presentation[f.project.model_identity].comparison;}el=render(noDefinition[0],noDefinition[0]);assert(el.querySelector('.story-main .metric-variation'));assert.match(el.querySelector('.comparison-control').textContent,/varierar/);
assert.equal(JSON.stringify(fixtures),original);
console.log('PASS: stable positive/rejected/absent, reversal, factory/import fallback, 7 missing/invalid coverage cases, genuine varied timing/open-closed gaps/spending/budget, exact cause table and immutable inputs.');
