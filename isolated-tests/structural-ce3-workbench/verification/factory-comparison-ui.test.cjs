const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const F=require('../static/factory-comparison.js'),C=require('../static/comparison.js'),P=require('../static/presentation.js');
const fixtures=JSON.parse(fs.readFileSync('/tmp/ce3-factory-plan-fixtures.json'));
for(const f of fixtures){
 const c={left:f.runs[0].result,right:f.runs[1].result,allA:f.runs[0].bundle,allB:f.runs[1].bundle};
 const p=P.view(f.project),observations=f.runs.map(r=>F.assess(r.result,r.bundle,C));
 assert.deepEqual(observations.map(o=>o.preserved),[false,true]);
 assert.deepEqual(observations.map(o=>o.start),f.scenario==='base'?[12,12]:[null,null]);
 assert.deepEqual(observations.map(o=>o.both),f.scenario==='base'?[false,true]:[false,false]);
 assert.deepEqual(observations.map(o=>o.spent),[10,14]);
 const html=F.render(c,C,p),{document}=parseHTML(html);
 assert.ok(!html.includes('Jämförelsen kan inte styrkas'),html.slice(0,600));
 const rows=[...document.querySelectorAll('tbody tr')].map(r=>r.textContent);
 assert.ok(rows[0].includes(f.scenario==='base'?'Vecka 12':'Inte genomförd inom testhorisonten'));
 assert.ok(rows[1].endsWith('NejJa'));
 assert.ok(rows[5].endsWith(f.scenario==='base'?'NejJa':'NejNej'));
 assert.ok(html.includes('Godkänna')||html.includes('produktionsstart'));
 assert.ok(F.differences(c.left.input.script,c.right.input.script).length===1);
 const edited=structuredClone(c);edited.left.input.script.steps['12'][0].mode='skip';
 assert.match(F.render(edited,C,p),/avgränsade jämförelsen/);
 const bad=structuredClone(c);bad.right.input.outcomes.E_BANK='rejected';
 assert.match(F.render(bad,C,p),/samma modell, startläge, budget/);
 const incomplete=structuredClone(c);incomplete.allB.paths.pop();
 assert.match(F.render(incomplete,C,p),/Fullständigt granskade körspår saknas/);
 const wrong=structuredClone(c);wrong.allA.input_sha256='wrong';
 assert.match(F.render(wrong,C,p),/Fullständigt granskade körspår saknas/);
 // Loss then recovery is NOT continuous capacity, even with an unchanged final state.
 const path=structuredClone(f.runs[1].bundle.paths[0]);
 const row=path.history.find(r=>r.step===4);row.after.state.se_team=false;
 const metric=F.observe(c.right.input.model,path);
 assert.equal(path.history.at(-1).after.state.se_team,true);
 assert.equal(metric.preserved,false);assert.equal(metric.loss,4);
 const varied=structuredClone(c);varied.allB.paths[0]=path;
 assert.match(F.render(varied,C,p),/varierar mellan händelseordningar/);
}
// Exercise actual app integration and reopening using the same saved project/run identities.
const {document,window}=parseHTML('<div id="content"></div><div id="notice"></div><div id="error"></div>');
const context=vm.createContext({document,window,CE3Presentation:P,CE3Comparison:C,CE3FactoryComparison:F,crypto:require('node:crypto').webcrypto,console});
vm.runInContext(fs.readFileSync(require.resolve('../static/app.js'),'utf8').split("document.addEventListener('click'")[0],context);
context.fixture=fixtures[0];
vm.runInContext(`useProject(fixture.project);S.runs=fixture.runs.map(r=>r.result.record);S.config={limits:{},storage:'local'};S.tab='compare';S.comparison={left:fixture.runs[0].result,right:fixture.runs[1].result,allA:fixture.runs[0].bundle,allB:fixture.runs[1].bundle};render();`,context);
assert.equal(document.querySelectorAll('.factory-result').length,1);
assert.equal(document.querySelectorAll('[data-action="factory-run"]').length,1);
vm.runInContext(`S.p.plans[0].script.steps['12'][0].mode='skip';dirty();render();`,context);
assert.equal(document.querySelectorAll('.factory-result').length,0,'Edited input must invalidate displayed comparison');
console.log('PASS: 2 scenarios, all 12 actual paths, exact cells, full-interval loss, incomplete/mismatched/varied evidence, reopen and stale UI.');
