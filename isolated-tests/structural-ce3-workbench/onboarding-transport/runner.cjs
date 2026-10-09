'use strict';
const fs=require('node:fs'),path=require('node:path'),{fork}=require('node:child_process');
const {Journal,liabilities}=require('./journal.cjs'),Price=require('./price.cjs');
const C=require('../contracts/onboarding-v1/contract.cjs');
const Archive=require('../onboarding-session/v2/archive.cjs');
const {Session}=require('../onboarding-session/v2/session.cjs');
function plan(profile,mode='offline',options={}) { Price.validate(profile,mode,options.priceDigest); return Price.plan(profile,require('./sr.cjs').load(options.srRoot).AUDIT_EXECUTION_CONFIG,options.inputPolicy??null); }
async function run(options) {
  const {apiKey,...job}=options;
  Price.validate(job.profile,job.mode,job.priceDigest);
  Price.need(job.mode!=='live' || typeof job.priceDigest==='string','EXPLICIT_LIVE_PRICE_DIGEST');
  if(job.inputPolicy) require('./input.cjs').validatePolicy(job.inputPolicy,job.profile,job.mode);
  Price.need(job.mode!=='live' || job.inputPolicy,'LIVE_INPUT_POLICY_REQUIRED');
  Price.need(job.mode!=='live' || (typeof apiKey==='string' && apiKey.length>=12 && !job.fixture),'LIVE_CREDENTIAL_AND_NO_FIXTURE');
  const child=fork(path.join(__dirname,'worker.cjs'),[],{stdio:['ignore','ignore','ignore','ipc'],execArgv:[],env:{PATH:process.env.PATH,...(job.mode==='live'?{CE3_TRANSPORT_API_KEY:apiKey}:{})}});
  let message=null;
  const closed=new Promise(resolve=>{
    const timer=setTimeout(()=>child.kill('SIGKILL'),135000);
    child.on('message',m=>{message=m;});
    child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
    child.once('error',()=>{clearTimeout(timer);resolve({code:null,signal:'WORKER_START_FAILED'});});
  });
  child.send(structuredClone(job)); const exit=await closed;
  const journal=new Journal(job.journal);let snapshot;try{if(exit.signal) journal.note(job.runId,'WORKER_INTERRUPTED');snapshot=journal.snapshot();}finally{journal.close();}
  return {schema_version:'ce3-transport-outcome/1',mode:job.mode,status:message?.ok?'finished':exit.signal?'interrupted':'not_completed',error:message?.error??(exit.signal?'WORKER_INTERRUPTED':null),run:snapshot.runs.find(r=>r.id===job.runId)??null,journal:snapshot};
}
function tapeFrom(run) {
  Price.need(run.mode==='offline' && run.profile.kind==='synthetic' && run.result?.mode==='offline','NO_LIVE_RELABEL');
  return {label:'SYNTHETIC TEST DOUBLE — NOT AI DETECTION',steps:run.result.original_sr_result.stages.map(s=>({stage:s.stage,...(s.raw===null?{error:'ARCHIVED_SYNTHETIC_FAILURE'}:{data:structuredClone(s.raw)})}))};
}
async function archiveFor(outcome,options={}) {
  const r=outcome.run;Price.need(outcome.status==='finished' && r?.result?.original_sr_result,'NO_COMPLETED_TRANSPORT_RESULT');
  Price.need(r.mode===outcome.mode && r.result.mode===r.mode && r.profile.kind===(r.mode==='live'?'verified-live':'synthetic') && r.state==='finished','TRANSPORT_MODE');
  const p=r.result.prepared, original=r.result.original_sr_result;
  if(outcome.mode==='live') return Archive.importLive(p,original,Archive.metadata(original,'live','remote'),options);
  // Honest offline provenance: actual HTTP-provider trace stays in transport
  // history. A separately identified scripted replay produces the synthetic
  // session archive, never a relabelled live review.
  return Archive.recorded(p,tapeFrom(r),options);
}
async function attach(session,jobId,outcome,options={}) {
  const archive=await archiveFor(outcome,options); await session.receiveReview(jobId,archive,options);
  return {schema_version:'ce3-transport-session-link/1',run_id:outcome.run.id,job_id:jobId,session_id:session.view().id,
    transport_result_digest:C.digest(outcome.run.result),journal_digest:outcome.journal.digest,archive_digest:archive.digest,
    derivation:outcome.mode==='live'?'original_live_result':'explicit_scripted_replay_of_offline_provider_outputs'};
}
function save(file,value) { const body=JSON.stringify(value,null,2)+'\n',fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,body);fs.fsyncSync(fd);}finally{fs.closeSync(fd);} }
function bundle(session,outcome,link) {
  const body={schema_version:'ce3-transport-session-bundle/1',session:session.serialize(),outcome,link};return {...body,digest:C.digest(body)};
}
function restore(value) {
  const {digest,...body}=value;Price.need(value.schema_version==='ce3-transport-session-bundle/1' && C.digest(body)===digest,'TRANSPORT_BUNDLE_DIGEST');
  const session=Session.restore(value.session),{liability_nusd,digest:journalDigest,...journal}=value.outcome.journal;
  Price.need(C.digest(journal)===journalDigest && liability_nusd===liabilities(journal),'BUDGET_SNAPSHOT_DIGEST');
  const run=journal.runs.find(r=>r.id===value.link.run_id),archive=value.session.archives[value.link.archive_digest];
  Price.need(run && archive && C.digest(run)===C.digest(value.outcome.run) && C.digest(run.result)===value.link.transport_result_digest && journalDigest===value.link.journal_digest && session.view().id===value.link.session_id,'TRANSPORT_SESSION_LINK');
  const review=session.view().structured_reviews.find(r=>r.id===value.link.job_id);
  Price.need(review?.binding.archive_digest===archive.digest && run.prepared_digest===archive.receipt.prepared.digest,'TRANSPORT_REVIEW_LINK');
  if(run.mode==='live') Price.need(value.link.derivation==='original_live_result' && C.digest(run.result.original_sr_result)===C.digest(archive.receipt.original_sr_result) && archive.producer.mode==='live','LIVE_ARCHIVE_CHANGED');
  else Price.need(value.link.derivation==='explicit_scripted_replay_of_offline_provider_outputs' && C.digest(tapeFrom(run))===C.digest(archive.receipt.test_tape) && archive.producer.mode==='synthetic','OFFLINE_ARCHIVE_CHANGED');
  return session;
}
module.exports={plan,run,archiveFor,attach,tapeFrom,save,bundle,restore};
