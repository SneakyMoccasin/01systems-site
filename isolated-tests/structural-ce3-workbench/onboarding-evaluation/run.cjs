'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const C = require('../contracts/onboarding-v1/contract.cjs');
const A = require('./adapters.cjs');
const {credentials,atomicJSON,OpenAIAdapter} = require('./provider.cjs');
const P = require('./protocol.json'), prompts = require('./prompts.json');
const cases = require('./cases.json').cases;
const profile = require('./profile-context.json');
const frozenFiles = ['cases.json','gold.json','protocol.json','prompts.json','profile-context.json','adapters.cjs','provider.cjs','run.cjs'];
function frozenHashes() {
  const files = [...frozenFiles,...['proposal','review','dialogue','handoff'].map(n=>`../contracts/onboarding-v1/schemas/${n}.schema.json`),'../contracts/onboarding-v1/contract.cjs'];
  return Object.fromEntries(files.map(f=>[f,C.hash(fs.readFileSync(path.join(__dirname,f),'utf8'))]));
}
function freeze() {
  const file=path.join(__dirname,'freeze.json');
  if (fs.existsSync(file)) throw new Error('FREEZE_EXISTS: never replace a preregistration');
  const record={version:'ce3-eval-freeze/1',created:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,files:frozenHashes(),schemas:{draft:A.draftSchema,review:A.reviewSchema},upper_bound_usd:P.whole_run_upper_bound_usd};
  fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  return record;
}
function verifyFreeze() {
  const f=JSON.parse(fs.readFileSync(path.join(__dirname,'freeze.json')));
  if(C.digest(f.files)!==C.digest(frozenHashes()) || C.digest(f.schemas)!==C.digest({draft:A.draftSchema,review:A.reviewSchema})) throw new Error('FREEZE_MISMATCH');
  return f;
}
function inputFor(c, proposal) {
  // Explicit allowlist. Gold, repository text, credentials and other arm outputs cannot enter.
  return {synthetic_only:true,profile,sources:A.sourcesFor(c),...(proposal?{proposal_digest:C.digest(proposal),proposal}: {})};
}
function bodyFor(stage, c, proposal) {
  return {model:P.requested_model,store:false,service_tier:P.service_tier,reasoning:{effort:P.reasoning_effort},max_output_tokens:P.max_output_tokens,instructions:`${prompts.shared}\n\n${prompts[stage]}`,input:JSON.stringify(inputFor(c,proposal)),text:{format:{type:'json_schema',name:`ce3_eval_${stage}_v1`,strict:true,schema:stage==='draft'?A.draftSchema:A.reviewSchema}}};
}
function parse(raw) {
  const output=raw.output_text??raw.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
  if (!output) throw new Error('NO_STRUCTURED_TEXT');
  return JSON.parse(output);
}
async function run(envFile) {
  const frozen=verifyFreeze(), directory=path.join(__dirname,'results');fs.mkdirSync(directory,{recursive:true});
  const lock=path.join(directory,'run.lock');const fd=fs.openSync(lock,'wx');
  try {
    let config;
    try {config=credentials(envFile);} catch(e) {atomicJSON(path.join(directory,'blocked.json'),{at:new Date().toISOString(),error:e.message});throw e;}
    const provider=new OpenAIAdapter({directory,apiKey:config.apiKey});
    const runFile=path.join(directory,'run.json');
    const manifest=fs.existsSync(runFile)?JSON.parse(fs.readFileSync(runFile)):{version:'ce3-eval-run/1',started:new Date().toISOString(),freeze_digest:C.digest(frozen),pairs:[]};
    if(manifest.freeze_digest!==C.digest(frozen)) throw new Error('RUN_FREEZE_MISMATCH');
    let stop=false;
    pairs: for (const c of cases) for (let repetition=1;repetition<=P.repetitions;repetition++) {
      const id=`${c.id}-r${repetition}`;
      if(manifest.pairs.some(p=>p.id===id)) continue;
      const pair={id,case_id:c.id,repetition,steps:[],status:'running'};manifest.pairs.push(pair);atomicJSON(runFile,manifest);
      let proposal;
      for (const stage of ['draft',...(repetition===1?['A','B']:['B','A'])]) {
        if(stage!=='draft' && !proposal) {pair.steps.push({stage,status:'not_run',reason:'No usable immutable draft'});continue;}
        const callId=`${id}-${stage}`, body=bodyFor(stage,c,proposal);
        let result;
        try { result=await provider.generate(callId,body); }
        catch(e) {pair.steps.push({stage,status:'not_run',error:e.message});stop=true;break;}
        const step={stage,status:result.metrics.error?'failed':'received',call_id:callId};pair.steps.push(step);
        if(result.metrics.error) {
          step.error=result.metrics.error;
          if(/^(HTTP_|TRANSPORT|TIMEOUT|MODEL_|USAGE_)/.test(step.error)) stop=true;
        } else {
          try {
            const wire=parse(result.raw); A.validateWire(stage==='draft'?'draft':'review',wire);
            atomicJSON(path.join(directory,callId,'parsed.json'),wire);
            const artifact=stage==='draft'?A.proposalFrom(c,repetition,wire):A.reviewFrom(proposal,stage,wire,result.metrics.returned_model);
            if(stage==='draft') proposal=artifact;
            atomicJSON(path.join(directory,callId,'artifact.json'),artifact);
            const validation=A.checks(proposal,stage==='draft'?null:artifact,wire.questions);
            atomicJSON(path.join(directory,callId,'validation.json'),{wire:{valid:true},...validation});
            step.status=Object.values(validation).every(v=>v.valid)?'valid':'contract_invalid';
            if(stage==='draft') pair.proposal_digest=C.digest(proposal);
          } catch(e) {
            step.status='invalid';step.error=e.message;
            atomicJSON(path.join(directory,callId,'validation.json'),{valid:false,error:e.message});
          }
        }
        atomicJSON(runFile,manifest);
        console.log(JSON.stringify({pair:id,stage,status:step.status,cost:result.metrics.cost,elapsed_ms:result.metrics.elapsed_ms}));
        if(stop) break;
      }
      pair.status=pair.steps.length===3 && pair.steps.every(s=>s.status==='valid')?'complete':'incomplete';atomicJSON(runFile,manifest);
      if(stop) {manifest.stopped_reason=pair.steps.at(-1).error;break pairs;}
    }
    manifest.finished=new Date().toISOString();atomicJSON(runFile,manifest);
    return manifest;
  } finally {fs.closeSync(fd);fs.unlinkSync(lock);}
}
if(require.main===module) {
  const cmd=process.argv[2];
  if(cmd==='freeze') {freeze();console.log('Frozen before live dispatch.');}
  else if(cmd==='verify') {verifyFreeze();console.log('Freeze verified.');}
  else if(cmd==='live') run(process.argv[3]).catch(e=>{console.error(e.message);process.exitCode=1;});
  else {console.error('Usage: node run.cjs freeze|verify|live [path/to/existing/.env.local]');process.exitCode=1;}
}
module.exports={bodyFor,inputFor,verifyFreeze,parse};
