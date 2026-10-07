const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const {parseHTML}=require('../../../node_modules/linkedom');
const P=require('../static/presentation.js'),C=require('../static/comparison.js');
const fixtures=JSON.parse(fs.readFileSync('/tmp/ce3-comparison-fixtures.json'));
const {document}=parseHTML('<html><body><main id="content"></main></body></html>');
const context=vm.createContext({document,CE3Presentation:P,CE3Comparison:C});
vm.runInContext(fs.readFileSync(__dirname+'/../static/app.js','utf8').split("document.addEventListener('click'")[0],context);
const run=s=>vm.runInContext(s,context);
let paths=0;
for(const fixture of fixtures){
 const before=JSON.stringify(fixture);context.f=fixture;
 run('S.p=f.project;S.planId=f.result.record.plan_id;S.result=f.result;S.time=f.result.input.model.clock.horizon;S.row=null');
 for(const [i,path] of fixture.paths.entries()){
  context.path=path;context.index=i;run('S.path=path;S.pathIndex=index;document.querySelector("#content").innerHTML=resultView()');paths++;
  const view=P.view(fixture.project),field=fixture.project.model.budget?.field;
  const completed=[...document.querySelectorAll('.readable-completion tbody tr')];
  assert.equal(completed.length,path.snapshot.taken.length);
  path.snapshot.taken.forEach((id,index)=>{
   const cells=completed[index].querySelectorAll('td');assert.equal(cells[0].textContent,view.name(id,'decisions'));
   assert.equal(cells[1].textContent,path.history.filter(r=>r.kind==='decision_executed'&&r.action===id).map(r=>r.step).join(', '));
  });
  const transactions=JSON.parse(run('JSON.stringify(budgetTransactions(f.project.model,path))'));
  const expected=path.history.filter(r=>['decision_executed','event_applied'].includes(r.kind)&&r.before.state[field]!==r.after.state[field]);
  assert.equal(transactions.length,expected.length);
  transactions.forEach((t,n)=>assert.deepEqual([t.step,t.id,t.amount,t.after],[expected[n].step,expected[n].action,expected[n].after.state[field]-expected[n].before.state[field],expected[n].after.state[field]]));
  const paymentRows=[...document.querySelectorAll('.readable-payments tbody tr')];
  assert.equal(paymentRows.length,expected.length);
  expected.forEach((r,n)=>{const cells=paymentRows[n].querySelectorAll('td');assert.match(cells[1].textContent,new RegExp(view.name(r.action).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.equal(cells[3].textContent,view.money(r.after.state[field]));});
  const summaries=[...document.querySelectorAll('.readable-paths tbody tr')];
  assert.equal(summaries.length,fixture.result.paths.length);
  const ownCells=summaries[i].querySelectorAll('td');
  assert.equal(ownCells[1].textContent,String(path.history.filter(r=>r.kind==='decision_executed').length));
  assert.equal(ownCells[2].textContent,String(path.history.filter(r=>r.kind==='attempt_blocked').length));
  assert.equal(ownCells[3].textContent,view.money(transactions.reduce((n,r)=>n+Math.max(0,-r.amount),0)));
  assert.equal(ownCells[4].textContent,view.money(path.snapshot.state[field]));
  fixture.result.paths.forEach((s,n)=>{const cells=summaries[n].querySelectorAll('td');assert.equal(cells[3].textContent,view.money(s.spent+s.event_outflow));assert.equal(cells[4].textContent,view.money(s.remaining));});
  assert.match(document.querySelector('.readable-paths').textContent,/inte alternativa användarplaner/);
  assert.match(document.querySelector('.readable-paths').textContent,/Samma slutbudget betyder inte/);
  for(const pre of document.querySelectorAll('pre')){const details=pre.closest('details');assert.equal(details.querySelector('summary').textContent,'Visa tekniska rådata (JSON)');assert.equal(details.hasAttribute('open'),false);}
  assert.equal(document.querySelectorAll('.readable-completion pre,.readable-payments pre,.readable-paths pre').length,0);
 }
 assert.equal(JSON.stringify(fixture),before,'presentation must not mutate complete run data or input');
}
// Existing audited beyond-horizon witness, not an invented future result.
const pending=JSON.parse(zlib.gunzipSync(fs.readFileSync(__dirname+'/../../structural-ce3-replay/results/checkpoint-2/run-1/factory_probes/effect_beyond_horizon.history.json.gz')));
const factory=fixtures.find(f=>f.family==='factory');context.f=factory;context.pending=pending;
run('S.p=f.project;document.querySelector("#content").innerHTML=completedAndPending({input:pending.input},pending.paths[0])');
assert.match(document.body.textContent,/34/);assert.match(document.body.textContent,/inte ett garanterat framtida resultat/);assert.doesNotMatch(document.body.textContent,/Inga händelser återstår/);
// External pending guards and selected outcome use saved data, not current draft.
context.f=fixtures[0];run('S.p=f.project;S.preserveTest=JSON.parse(JSON.stringify(f.paths[0]));S.preserveTest.snapshot=f.paths[0].history.find(r=>r.after.pending.some(e=>e.id==="E_T2")).after;document.querySelector("#content").innerHTML=completedAndPending(f.result,S.preserveTest)');
assert.match(document.body.textContent,/Valt externt besked: Elanslutningen färdigställs/);assert.match(document.body.textContent,/Besked om elanslutningen inväntas/);
run('S.preserveTest.history=[];document.querySelector("#content").innerHTML=completedAndPending(f.result,S.preserveTest)');assert.match(document.body.textContent,/Tidpunkt saknas i historiken/);
// No budget and incomplete history must not manufacture transactions.
run('document.querySelector("#content").innerHTML=paymentsTable({budget:null},f.paths[0])');assert.match(document.body.textContent,/inget budgetkonto/);
run('S.bad=JSON.parse(JSON.stringify(f.paths[0]));S.bad.history=[S.bad.history.find(r=>r.kind==="decision_executed")];S.bad.history[0].after.state={};document.querySelector("#content").innerHTML=paymentsTable(f.project.model,S.bad)');assert.equal(document.querySelectorAll('tbody tr').length,0);assert.match(document.body.textContent,/saknar budgetvärden/);
// Registered negative event delta and gross spending must remain separate from inflow.
run('S.outflow=JSON.parse(JSON.stringify(f.paths[0]));S.outflow.history=[S.outflow.history.find(r=>r.kind==="event_applied")];S.outflow.history[0].before.state.budget=5;S.outflow.history[0].after.state.budget=3');
assert.equal(run('budgetTransactions(f.project.model,S.outflow)[0].amount'),-2);
run('S.totals=JSON.parse(JSON.stringify(f.result));S.totals.paths=[{index:0,executed:1,blocked:0,spent:4,event_outflow:2,inflow:3,remaining:7}];document.querySelector("#content").innerHTML=pathSummaryTable(S.totals)');
assert.match(document.body.textContent,/Händelseutgifter/);assert.match(document.body.textContent,/Inflöden från händelser/);assert.equal(document.querySelectorAll('tbody td')[3].textContent,'6 miljoner');
console.log(`PASS: ${fixtures.length} audited cases / ${paths} complete paths; labels, dates, exact recorded transactions and balances, per-order totals, raw JSON isolation, no mutations, pending horizon witness, conditional external pending, missing dates/budget data.`);
