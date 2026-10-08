const fs=require('fs'),assert=require('assert/strict'),C=require('../../static/comparison.js');
const evidence=JSON.parse(fs.readFileSync(__dirname+'/metrics.json'));
const generated=JSON.parse(fs.readFileSync(process.argv[2]));
const observations=generated.runs.map((r,i)=>r.history.paths.map((p,index)=>{
 const a=C.analyse(r.history.input.model,p,generated.definition),expected=evidence.plans[i].values[index];
 assert.deepEqual([a.focus.first,a.gaps[0].anchor,a.spent,a.remaining],[expected.approval,expected.parking,expected.spent,expected.remaining]);
 assert.deepEqual(a.gaps.map(g=>({name:g.name,total:g.total,periods:g.periods})),expected.gaps);
 return a;
}));
let pairs=0;for(const a of observations[0])for(const b of observations[1]){assert.equal(a.focus.first-b.focus.first,8);pairs++;}
assert.equal(pairs,768);

// Explicitly reproduce the distinctions documented in REPORT.md.
for(const run of generated.runs){
 const histories=run.history.paths.map(p=>p.history), field=run.history.input.model.budget.field;
 const unique=values=>new Set(values.map(v=>JSON.stringify(v))).size;
 assert.equal(unique(histories.map(rows=>rows.filter(r=>['decision_executed','attempt_blocked','script_skip'].includes(r.kind)).map(r=>({step:r.step,action:r.action,kind:r.kind,position:r.script_position,failures:r.failures})))),1);
 assert.equal(unique(histories.map(rows=>rows.filter(r=>['decision_executed','event_applied'].includes(r.kind)&&r.before.state[field]!==r.after.state[field]).map(r=>({step:r.step,action:r.action,amount:r.after.state[field]-r.before.state[field],after:r.after.state[field]})))),1);
 assert.equal(unique(histories.map(rows=>rows.filter(r=>r.kind==='step_end').map(r=>r.after))),1);
 assert.equal(unique(histories.map(rows=>rows.at(-1).after)),1);
 assert(unique(histories)>1);
}
