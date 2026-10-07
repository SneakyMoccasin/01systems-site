const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('../static/presentation.js');
const {parseHTML} = require('../../../node_modules/linkedom');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../presentations.json'),'utf8'));
const transport=Object.values(catalog).find(d=>d.decisions.T1);
const factory=Object.values(catalog).find(d=>d.decisions.D1);
function project(data){return {model_identity:data.model_sha256,presentation:{[data.model_sha256]:structuredClone(data)},model:{clock:{unit:'week',start:0,horizon:26},decisions:Object.fromEntries(Object.keys(data.decisions).map(id=>[id,{}])),events:{E_T2:{kind:'external',outcomes:{ready:{}}}},domains:{grid:{enum:['pending','ready']},bank:{enum:['pending']}},budget:{field:'budget'}},sources:{},plans:[]};}
const f=project(factory),t=project(transport);
assert.equal(P.view(f).name('D1','decisions'),'Ansök om finansiering');
assert.equal(P.view(f).guard({field:'pl_premises',op:'eq',value:true}),'Lokalen i Polen är tillgänglig');
assert.equal(P.view(f).statement('bank','pending'),'Bankbesked inväntas');
assert.equal(P.view(f).money(8),'8 Mkr');
assert.equal(P.view(t).money(1),'1 miljon');
assert.notEqual(P.view(t).statement('charger_delivered',true),P.view(t).statement('charger_installed',true));
const unknown=structuredClone(t);unknown.presentation={};
assert.equal(P.view(unknown).name('T1','decisions'),'Beslut (ID: T1)');
assert.equal(P.view(unknown).value('grid','pending'),'Värde (ID: pending)');
assert.equal(P.view(unknown).money(8),'8 (enhet saknas)');
assert.equal(P.view(t,'different').name('T1','decisions'),'Beslut (ID: T1)');
const script={schema_version:'ce3-script/1',source:'test',steps:{'0':[], '12':[{decision:'T7',mode:'attempt'}], '20':[{decision:'T7',mode:'attempt'}]}};
t.plans=[{id:'a',name:'Plan A',script:structuredClone(script),outcomes:{E_T2:'ready'}},{id:'b',name:'Plan B',script:structuredClone(script),outcomes:{E_T2:'ready'}}];
const runs=t.plans.map(plan=>({plan_id:plan.id,run_status:'COMPLETE',audit_status:'PASS',input_summary:{model_identity:t.model_identity,script:structuredClone(plan.script),outcomes:structuredClone(plan.outcomes),sources:{}}}));
assert.deepEqual(P.comparisonNeeds(t,runs,['a','b']),[]);
assert.match(P.comparisonNeeds(t,runs,['a','a'])[0],/Samma plan/);
assert.match(P.comparisonNeeds(t,[],['a','b'])[0],/behöver köras/);
t.plans[1].script.steps['21']=t.plans[1].script.steps['20'];delete t.plans[1].script.steps['20'];
assert.match(P.comparisonNeeds(t,runs,['a','b'])[0],/behöver köras om/);
runs[0].run_status='INCOMPLETE';runs[0].audit_status='INCOMPLETE';
assert(P.comparisonNeeds(t,runs,['a','b']).some(s=>s.includes('INCOMPLETE')));
// Exercise actual rendering + visible-field synchronization; labels and grouping
// must preserve both explicit T7 attempts and the empty step in the source input.
const {document}=parseHTML('<html><body><div id="content"></div></body></html>');
const context=vm.createContext({document,CE3Presentation:P,console,window:{},crypto:{},structuredClone});
const source=fs.readFileSync(path.join(__dirname,'../static/app.js'),'utf8').split("document.addEventListener('click'")[0];
vm.runInContext(source,context);
context.project=t;
vm.runInContext("S.p=project;S.planId='a';S.config={limits:{},profile:{}};document.querySelector('#content').innerHTML='<div class=\"plan-rows\">'+planRows(entries())+'</div>';",context);
const before=JSON.stringify(t.plans[0].script);
const rows=document.querySelectorAll('.plan-row');
assert.equal(rows.length,2);
assert.deepEqual([...document.querySelectorAll('.row-index')].map(el=>el.textContent),['01','02']);
// Linkedom's select.value getter is incomplete; supply the value of its selected
// option without changing any application code or model object.
for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{value:select.querySelector('[selected]')?.getAttribute('value')||select.querySelector('option').getAttribute('value')});
vm.runInContext('syncForm()',context);
assert.equal(JSON.stringify(t.plans[0].script),before);
// Merely opening an empty label editor must not create overrides or dirty a
// saved project. Also verify that historical time units use the saved model.
unknown.presentation={[unknown.model_identity]:{}};
context.unknown=unknown;
vm.runInContext("S.p=unknown;S.dirty=false;document.querySelector('#content').innerHTML=labelEditor();syncForm();",context);
assert.equal(vm.runInContext('S.dirty',context),false);
assert.deepEqual(unknown.presentation,{[unknown.model_identity]:{}});
assert.equal(vm.runInContext("presented('old',{clock:{unit:'day'}},unit)",context),'day');
console.log('PASS: names, typed values, units, fallbacks, comparison guidance, model isolation, DOM grouping and explicit attempts/empty steps preserved.');
