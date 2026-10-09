'use strict';
const fs=require('node:fs'),path=require('node:path');
const {Journal}=require('./journal.cjs'),R=require('./runner.cjs'),profile=require('./synthetic-price.json'),{fixture}=require('./fixtures.cjs');
const {setup,confirm}=require('../onboarding-session/v2/demo.cjs');
async function demo(dir) {
  fs.mkdirSync(dir,{mode:0o700});const file=path.join(dir,'budget.sqlite');
  const plan=R.plan(profile);Journal.create(file,{schema_version:'ce3-budget/1',currency:'USD',mode:'offline',total_limit_nusd:plan.maximum_nusd*2,per_run_limit_nusd:plan.maximum_nusd}).close();
  const session=setup(),job=session.requestReview('transport-review');session.save(path.join(dir,'pending.session.json'));
  const outcome=await R.run({journal:file,mode:'offline',profile,runId:'demo',prepared:job.prepared,fixture:fixture(job.prepared,profile,{repairs:[0,1,2],problems:[{target:'approval',field:'type',classification:'incorrect'}]})});
  const link=await R.attach(session,job.id,outcome);confirm(session,'synthetic-confirmation');
  let blocked=false;try{session.createHandoff('forbidden');}catch{blocked=true;}
  if(!blocked) throw new Error('BLOCKER_LOST');
  const bundle=R.bundle(session,outcome,link);R.restore(bundle);R.save(path.join(dir,'transport-session.json'),bundle);
  const summary={mode:'OFFLINE SYNTHETIC HTTP RESPONSES THROUGH REAL SR',external_ai_calls:0,actual_cost_usd:0,maximum_http_attempts:plan.maximum_calls,recorded_fixture_attempts:outcome.run.attempts.filter(a=>a.request).length,synthetic_reservation_nusd:plan.maximum_nusd,synthetic_usage_cost_upper_nusd:outcome.journal.liability_nusd,sr_status:outcome.run.result.original_sr_result.status,session_review:session.view().statuses.review,blocking_finding_prevents_handoff:blocked,archive_derivation:link.derivation};
  R.save(path.join(dir,'summary.json'),summary);return summary;
}
if(require.main===module) {if(process.argv.length!==3)throw new Error('Usage: node demo.cjs NEW_DIRECTORY');demo(path.resolve(process.argv[2])).then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});}
module.exports={demo};
