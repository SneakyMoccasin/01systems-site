const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const T=require('../static/factory-timing.js'),F=require('../static/factory-comparison.js'),C=require('../static/comparison.js'),P=require('../static/presentation.js');
const fixtures=JSON.parse(fs.readFileSync('/tmp/ce3-factory-timing-fixtures.json'));
for(const f of fixtures){
 const c={left:f.runs[0].result,right:f.runs[1].result,allA:f.runs[0].bundle,allB:f.runs[1].bundle},p=P.view(f.project);
 const checks=f.runs.map(r=>T.assess(r.result,r.bundle,C));
 assert.deepEqual(checks.map(c=>c.count),[8,2]);assert(checks.every(c=>!c.varied));
 for(const [i,c] of checks.entries())for(const path of c.paths){
  const m=path.metrics,absent=f.scenario==='customer_absent';
  assert.equal(m.start,absent?null:i?12:8);assert.equal(m.loss,absent&&i?null:i?6:2);
  assert.equal(m.seWeeks,absent&&i?26:i?6:2);assert.equal(m.gapWeeks,absent?(i?0:24):6);
  assert.equal(m.both,false);assert.equal(m.startGoal,!absent);
  assert.deepEqual(m.before,absent?{bank:5,customer:i?7:10,quality:i?7:10}:{bank:5,customer:i?7:9,quality:10});
  assert.equal(m.spent,absent&&i?7:10);assert.equal(m.balance,absent&&i?7:4);
  const bank=path.evidence.approvals.find(r=>r.action==='E_BANK');
  const recruit=path.evidence.payments.find(r=>r.action==='D3');
  assert.equal(bank.step,recruit.step);assert(bank.index<recruit.index);assert.equal(recruit.before.bank,'approved');
 }
 const html=T.render(c,C,p),{document}=parseHTML(html),text=document.querySelector('.story-lead').textContent;
 assert.match(text,f.scenario==='base'?/4 veckor längre.*4 veckor senare.*2 Mkr/:/24 veckor längre.*Ingen av planerna.*3 Mkr/);
 const rows=[...document.querySelectorAll('tbody tr')];assert.equal(rows.length,13);assert(rows.at(-1).textContent.endsWith('NejNej'));
 assert.equal(document.querySelectorAll('.timing-result > details').length,1);
 assert.match(document.querySelector('.timing-result > details').textContent,/Slutförd körning \(COMPLETE\).*Godkänd teknisk granskning \(PASS\)/);
 const swapped=T.render({...c,left:c.right,right:c.left,allA:c.allB,allB:c.allA},C,p);
 assert(swapped.includes(text));
 const bad=structuredClone(c);bad.allA.input_sha256='changed';assert.match(T.render(bad,C,p),/Jämförelsen kan inte styrkas/);
 const missing=structuredClone(c);missing.allA.paths.pop();assert.match(T.render(missing,C,p),/Jämförelsen kan inte styrkas/);
 const mixed=structuredClone(c);mixed.right.input.outcomes.E_CUSTOMER='rejected';assert.match(T.render(mixed,C,p),/Samma modell/);
 const edited=structuredClone(c);edited.right.input.script.steps['12'][0].decision='D9';assert.match(T.render(edited,C,p),/Planerna har ändrats/);
 // Explicit negative observer fixture; not an engine result or detection-quality claim.
 const varied=structuredClone(c);const path=varied.allB.paths[0];path.history.find(r=>r.step===1).after.state.se_team=false;
 assert.match(T.render(varied,C,p),/varierar observationerna/);assert.match(T.render(varied,C,p),/av 2 banor/);
}
// Interval boundaries at zero duration and horizon, independent tiny observer fixtures.
const model=fixtures[0].project.model,s=structuredClone(model.initial);
const row=(step,before,after)=>({step,index:step,action:'test-transition',before:{state:before},after:{state:after}});
const off={...s,se_team:false};
const instant=T.intervals(model,[row(2,s,off),row(2,off,s)],v=>!v.se_team);
assert.deepEqual(instant.periods,[{start:2,end:2,length:0,open:false}]);assert.equal(instant.transitions.length,2);
const terminal=T.intervals(model,[row(26,s,off)],v=>!v.se_team);
assert.deepEqual(terminal.periods,[{start:26,end:26,length:0,open:true}]);
const f=fixtures[0],path=structuredClone(fixtures[1].runs[1].bundle.paths[0]);path.history.at(-1).after.state.se_team=false;
const m=T.observe(model,path).metrics;assert.equal(m.preserved,false);assert.equal(m.loss,26);assert.equal(m.seWeeks,26); // positive full duration still does not imply continuity through horizon
const {document,window}=parseHTML('<div id="content"></div><div id="notice"></div><div id="error"></div>');
const ctx=vm.createContext({document,window,CE3FactoryTiming:T,CE3FactoryComparison:F,CE3Comparison:C,CE3Presentation:P,crypto:require('node:crypto').webcrypto});
vm.runInContext(fs.readFileSync(require.resolve('../static/app.js'),'utf8').split("document.addEventListener('click'")[0],ctx);ctx.fixture=f;
vm.runInContext(`useProject(fixture.project);S.runs=fixture.runs.map(r=>r.result.record);S.config={storage:'local',limits:{}};S.tab='compare';S.comparison={left:fixture.runs[0].result,right:fixture.runs[1].result,allA:fixture.runs[0].bundle,allB:fixture.runs[1].bundle};render();`,ctx);
assert.equal(document.querySelectorAll('.timing-result').length,1);
assert(document.querySelector('#content').innerHTML.indexOf('Värdet av att flytta senare')<document.querySelector('#content').innerHTML.indexOf('Öppna tidsjämförelse'));
vm.runInContext(`S.p.plans[0].script.steps['8'][0].mode='if_not_taken';dirty();render();`,ctx);
assert.equal(document.querySelectorAll('.timing-result').length,0);
console.log('PASS: 20 real paths, metrics/differences, same-week payments, zero-duration/horizon intervals, variation, technical vs business status, reopening/stale display.');
