'use strict';
// Offline metrics only. Semantic labels are explicit, inspectable adjudications.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../contracts/onboarding-v1/contract.cjs');
const P=require('./protocol.json');
const {verifyFreeze}=require('./run.cjs');
function read(file) {return fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;}
function summarize(directory=path.join(__dirname,'results')) {
 verifyFreeze();
 const manifest=read(path.join(directory,'run.json')), ledger=read(path.join(directory,'ledger.json'));
 if(!manifest||!ledger) throw new Error('No live run records');
 const stages=Object.fromEntries(['draft','A','B'].map(s=>[s,{calls:0,input_tokens:0,cached_tokens:0,output_tokens:0,elapsed_ms:0,list_price_usd:0,cache_write_upper_usd:0,unknown_cost_calls:0,findings:0,questions:0,wire_or_adapter_failures:0,contract_failures:0}]));
 const calls=ledger.reservations.map(r=>{
  const dir=path.join(directory,r.id),m=read(path.join(dir,'metrics.json')),parsed=read(path.join(dir,'parsed.json')),validation=read(path.join(dir,'validation.json'));
  const stage=r.id.split('-').at(-1),stats=stages[stage];stats.calls++;
  if(m) {stats.elapsed_ms+=m.elapsed_ms;stats.input_tokens+=m.usage?.input_tokens||0;stats.cached_tokens+=m.usage?.input_tokens_details?.cached_tokens||0;stats.output_tokens+=m.usage?.output_tokens||0;}
  if(m?.cost) {stats.list_price_usd+=m.cost.list_price_usd;stats.cache_write_upper_usd+=m.cost.cache_write_upper_usd;} else stats.unknown_cost_calls++;
  stats.findings+=parsed?.findings?.length||0;stats.questions+=parsed?.questions?.length||0;
  if(validation?.valid===false) stats.wire_or_adapter_failures++;
  if(validation?.contract?.valid===false) stats.contract_failures++;
  return {id:r.id,...m,validation,findings:parsed?.findings?.length??null,questions:parsed?.questions?.length??null,active_items_assessed:parsed?.assessments?.length??null,exact_citation_references:parsed?(parsed.items||parsed.assessments||[]).reduce((n,x)=>n+x.refs.length,0):null};
 });
 const pairs=manifest.pairs.map(p=>{
  const a=read(path.join(directory,`${p.id}-A/request.json`)),b=read(path.join(directory,`${p.id}-B/request.json`)),draft=read(path.join(directory,`${p.id}-draft/artifact.json`));
  if(a&&b) {assert.equal(a.input,b.input);assert.deepEqual(a.text.format.schema,b.text.format.schema);assert.equal(a.max_output_tokens,b.max_output_tokens);assert.equal(a.model,b.model);}
  if(draft) {assert.equal(C.digest(draft),p.proposal_digest);if(a)assert.equal(C.digest(JSON.parse(a.input).proposal),p.proposal_digest);if(b)assert.equal(C.digest(JSON.parse(b.input).proposal),p.proposal_digest);}
  const ma=calls.find(c=>c.id===`${p.id}-A`),mb=calls.find(c=>c.id===`${p.id}-B`);
  return {...p,paired_input_identical:a&&b?true:null,B_minus_A_ms:ma&&mb&&!ma.error&&!mb.error?mb.elapsed_ms-ma.elapsed_ms:null,B_minus_A_list_price_usd:ma?.cost&&mb?.cost?mb.cost.list_price_usd-ma.cost.list_price_usd:null};
 });
 const matchedPairs=pairs.filter(p=>p.paired_input_identical&&p.steps.filter(s=>['A','B'].includes(s.stage)).every(s=>['valid','contract_invalid'].includes(s.status)));
 const matchedStages=Object.fromEntries(['A','B'].map(stage=>[stage,{calls:0,elapsed_ms:0,list_price_usd:0,input_tokens:0,output_tokens:0}]));
 for(const pair of matchedPairs) for(const stage of ['A','B']) {const call=calls.find(c=>c.id===`${pair.id}-${stage}`),s=matchedStages[stage];s.calls++;s.elapsed_ms+=call.elapsed_ms;s.list_price_usd+=call.cost.list_price_usd;s.input_tokens+=call.usage.input_tokens;s.output_tokens+=call.usage.output_tokens;}
 const totals={};for(const k of Object.keys(stages.draft)) totals[k]=Object.values(stages).reduce((n,s)=>n+s[k],0);
 totals.reserved_upper_usd=ledger.reservations.length*P.reserved_usd_per_call;
 totals.completed_pairs=pairs.filter(p=>p.status==='complete').length;totals.planned_pairs=10;
 totals.missing_pairs=10-pairs.length;
 const judgment=read(path.join(__dirname,'adjudication.json'));
 let semantic=null;
 if(judgment) {
  semantic={initial_errors:0,A:{detected:0,missed:0,false_findings:0,known_limitations:0,uncertain:0,questions:0,relevance_sum:0,clarity_sum:0},B:{detected:0,missed:0,false_findings:0,known_limitations:0,uncertain:0,questions:0,relevance_sum:0,clarity_sum:0}};
  for(const pair of judgment.pairs) {
   if(pair.A.status==='unavailable'||pair.B.status==='unavailable') continue;
   semantic.initial_errors+=pair.initial_errors.length;
   for(const arm of ['A','B']) {
    const j=pair[arm],r=read(path.join(directory,`${pair.id}-${arm}/parsed.json`));
    assert.deepEqual(j.findings.map(f=>f.id).sort(),r.findings.map(f=>f.id).sort());
    assert.deepEqual(j.questions.map(q=>q.id).sort(),r.questions.map(q=>q.id).sort());
    const hits=new Set(j.findings.filter(f=>f.label==='true_error').flatMap(f=>f.error_ids));
    for(const id of hits) assert(pair.initial_errors.some(e=>e.id===id));
    semantic[arm].detected+=hits.size;semantic[arm].missed+=pair.initial_errors.length-hits.size;
    semantic[arm].false_findings+=j.findings.filter(f=>f.label==='false_finding').length;
    semantic[arm].known_limitations+=j.findings.filter(f=>f.label==='known_limitation').length;
    semantic[arm].uncertain+=j.findings.filter(f=>f.label==='uncertain').length;
    semantic[arm].questions+=j.questions.length;
    semantic[arm].relevance_sum+=j.questions.reduce((n,q)=>n+q.relevance,0);
    semantic[arm].clarity_sum+=j.questions.reduce((n,q)=>n+q.clarity,0);
   }
  }
 }
 return {version:'ce3-eval-metrics/1',stages,matchedStages,matched_pairs:matchedPairs.length,totals,pairs,calls,semantic};
}
if(require.main===module) {const result=summarize();fs.writeFileSync(path.join(__dirname,'results/summary.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({totals:result.totals,stages:result.stages,semantic:result.semantic},null,2));}
module.exports={summarize};
