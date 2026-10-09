'use strict';
// Prepared for a later explicitly authorised run. Never invoked by offline tests.
const fs=require('node:fs'),path=require('node:path');
const Price=require('./price.cjs'),Runner=require('./runner.cjs'),{Journal}=require('./journal.cjs');
const Archive=require('../onboarding-session/v2/archive.cjs');
const {inputs}=require('../onboarding-sr/structured/diagnostic.cjs');
const Input=require('./input.cjs');
function argumentsFor(args) {
  const required=['journal','output','profile','price-digest','currency','total-usd','per-run-usd','cases','run-prefix','input-token-limit','count-price','count-price-digest'], values={};
  for(let i=0;i<args.length;i++) {
    const key=args[i].slice(2); Price.need(args[i].startsWith('--') && !Object.hasOwn(values,key),'CLI_ARGUMENT');
    if(key==='execute-live') values[key]=true;
    else {Price.need(required.includes(key) && args[i+1] && !args[i+1].startsWith('--'),'CLI_ARGUMENT');values[key]=args[++i];}
  }
  Price.need(required.every(k=>typeof values[k]==='string') && values['execute-live']===true,'EXPLICIT_LIVE_CONFIGURATION_REQUIRED');
  Price.need(values.currency==='USD' && /^[a-zA-Z0-9_.-]+$/.test(values['run-prefix']),'CLI_CURRENCY_OR_RUN_ID');
  const cases=values.cases.split(',');Price.need(cases.length>0 && new Set(cases).size===cases.length && cases.every(x=>['c3-r1','clear'].includes(x)),'EXPLICIT_FROZEN_CASES');
  return {values,cases,budget:{schema_version:'ce3-budget/1',currency:'USD',mode:'live',total_limit_nusd:Price.usd(values['total-usd']),per_run_limit_nusd:Price.usd(values['per-run-usd'])}};
}
async function main(args) {
  const {values:v,cases,budget}=argumentsFor(args);
  const profile=JSON.parse(fs.readFileSync(v.profile,'utf8'));Price.validate(profile,'live',v['price-digest']);
  Price.need(/^[1-9][0-9]*$/.test(v['input-token-limit']),'EXPLICIT_INPUT_LIMIT');
  const countPrice=JSON.parse(fs.readFileSync(v['count-price'],'utf8'));
  const inputPolicy=Input.policy(Number(v['input-token-limit']),countPrice,v['count-price-digest']);
  Input.validatePolicy(inputPolicy,profile,'live');
  const plan=Runner.plan(profile,'live',{priceDigest:v['price-digest'],inputPolicy});
  Price.need(plan.maximum_nusd<=budget.per_run_limit_nusd && plan.maximum_nusd*cases.length<=budget.total_limit_nusd,'LIVE_PLAN_EXCEEDS_BUDGET');
  const selected=inputs().filter(x=>cases.includes(x.name)).map(x=>({...x,prepared:Archive.prepare(x.request,undefined,{draftText:x.draftText})}));
  const key=process.env.OPENAI_API_KEY;Price.need(typeof key==='string' && key.length>=12,'CREDENTIAL_REQUIRED');
  const journal=fs.existsSync(v.journal)?new Journal(v.journal,budget):Journal.create(v.journal,budget);
  try{Price.need(journal.snapshot().liability_nusd+plan.maximum_nusd*cases.length<=budget.total_limit_nusd,'LIVE_PLAN_EXCEEDS_REMAINING_BUDGET');}finally{journal.close();}
  fs.mkdirSync(v.output,{mode:0o700});
  Runner.save(path.join(v.output,'plan.json'),{schema_version:'ce3-live-selection/1',budget,profile,price_digest:v['price-digest'],cases,per_review:plan,maximum_calls:cases.length*plan.maximum_calls,maximum_count_calls:cases.length*plan.maximum_count_calls,maximum_http_calls:cases.length*plan.maximum_http_calls,maximum_nusd:cases.length*plan.maximum_nusd});
  const summary=[];
  for(const x of selected) {
    const outcome=await Runner.run({journal:path.resolve(v.journal),mode:'live',profile,priceDigest:v['price-digest'],inputPolicy,runId:`${v['run-prefix']}-${x.name}`,prepared:x.prepared,apiKey:key});
    Runner.save(path.join(v.output,`${x.name}.transport.json`),outcome);
    let archive=null;
    try{archive=await Runner.archiveFor(outcome);Runner.save(path.join(v.output,`${x.name}.archive.json`),archive);}catch{}
    summary.push({case:x.name,transport_status:outcome.status,sr_status:outcome.run?.result?.original_sr_result?.status??null,ce3_status:archive?.receipt.result.status??null,archive_admitted:Boolean(archive),journal_liability_nusd:outcome.journal.liability_nusd});
    if(outcome.status!=='finished' || outcome.run.result.original_sr_result?.status==='failed' || !archive) break;
  }
  Runner.save(path.join(v.output,'summary.json'),summary);console.log(JSON.stringify(summary,null,2));
}
if(require.main===module) main(process.argv.slice(2)).catch(()=>{console.error('LIVE_COMMAND_STOPPED: configuration, budget, transport or archive check failed. No automatic retry. Inspect the budget journal and saved outcomes; credentials are never printed.');process.exitCode=1;});
module.exports={argumentsFor};
