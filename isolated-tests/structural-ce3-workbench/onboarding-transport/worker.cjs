'use strict';
// Each run owns a process: fetch interception cannot affect another run/app.
const {Journal}=require('./journal.cjs'), Price=require('./price.cjs'), {fetchBoundary,httpsSend,httpsCount,redact}=require('./transport.cjs');
const C=require('../contracts/onboarding-v1/contract.cjs');
const Archive=require('../onboarding-session/v2/archive.cjs');
const finishMessage=message=>new Promise(resolve=>process.send(message,resolve));
process.once('message',async job=>{
  let journal, reserved=false;
  try {
    const mode=job.mode, profile=Price.validate(job.profile,mode,job.priceDigest);
    Price.need(['offline','live'].includes(mode),'WORKER_MODE');
    const secret=mode==='offline'?'ce3-fake-credential-DO-NOT-ARCHIVE':process.env.CE3_TRANSPORT_API_KEY;
    delete process.env.CE3_TRANSPORT_API_KEY;
    Price.need(typeof secret==='string' && secret.length>=12,'CREDENTIAL_REQUIRED');
    const {fixture:ignoredFixture,...publicJob}=job; // Test responses may deliberately echo the fake key.
    Price.need(redact(JSON.stringify(publicJob),secret)===JSON.stringify(publicJob),'CREDENTIAL_IN_JOB');
    Archive.checkPrepared(job.prepared);
    const sr=require('./sr.cjs').load(job.srRoot);
    const prepared=Archive.prepare(job.prepared.request,job.prepared.input.targets,{srRoot:job.srRoot,draftText:job.prepared.input.draft.text});
    Price.need(C.digest(prepared)===C.digest(job.prepared),'PREPARED_CHANGED');
    if(job.inputPolicy) require('./input.cjs').validatePolicy(job.inputPolicy,profile,mode);
    Price.need(mode!=='live' || job.inputPolicy,'LIVE_INPUT_POLICY_REQUIRED');
    const plan=Price.plan(profile,sr.AUDIT_EXECUTION_CONFIG,job.inputPolicy??null);
    journal=new Journal(job.journal);Price.need(journal.read().budget.mode===mode,'JOURNAL_MODE');
    journal.begin(job.runId,profile,plan,prepared.digest,prepared); reserved=true;
    let send=httpsSend,countSend=httpsCount;
    if(mode==='offline') {
      Price.need(job.fixture?.label==='SYNTHETIC HTTP RESPONSES — NO NETWORK','EXPLICIT_FIXTURE');
      // Even accidental fallback to a native socket fails in this worker.
      for(const name of ['node:http','node:https']){const m=require(name);m.request=m.get=()=>{throw new Error('OFFLINE_NETWORK_FORBIDDEN');};}
      const net=require('node:net');net.connect=net.createConnection=()=>{throw new Error('OFFLINE_NETWORK_FORBIDDEN');};
      let i=0, countIndex=0;
      countSend=async({body})=>{
        const scripted=job.fixture.counts?.[countIndex++];
        if(scripted?.crash) process.kill(process.pid,'SIGKILL');
        if(scripted?.timeout) return {status:null,body:'',error_code:'ABORTED_OR_TIMEOUT'};
        if(scripted?.throw) throw new Error('SYNTHETIC_COUNT_ERROR');
        if(scripted?.body!==undefined) return {status:scripted.status??200,body:scripted.body.replaceAll('{{FAKE_CREDENTIAL}}',secret),error_code:null};
        // Explicit TEST DOUBLE. Byte counts deliberately exercise the gate;
        // they are NOT tokenization or a bound on actual OpenAI billable input.
        const tokens=scripted?.input_tokens??Buffer.byteLength(body);
        return {status:200,body:JSON.stringify({object:'response.input_tokens',input_tokens:tokens}),error_code:null};
      };
      send=async()=>{
        const step=job.fixture.responses[i++]; Price.need(step,'FIXTURE_EXHAUSTED');
        if(step.crash) process.kill(process.pid,'SIGKILL');
        if(step.timeout) return {status:null,body:'',error_code:'ABORTED_OR_TIMEOUT'};
        if(step.throw) throw {headers:{Authorization:`Bearer ${secret}`},message:secret};
        return {status:step.status??200,body:step.body.replaceAll('{{FAKE_CREDENTIAL}}',secret),error_code:null};
      };
    }
    global.fetch=fetchBoundary({journal,runId:job.runId,profile,plan,apiKey:secret,send,countSend,mode});
    // SR's own console diagnostics are not a credential/logging boundary.
    console.log=console.warn=console.error=()=>{};
    const original=JSON.parse(JSON.stringify(await sr.runStructuredGroundedReview(prepared.input,new sr.OpenAIProvider(secret,profile.model),'sv',{fingerprintKey:'ce3-budget-transport-fingerprint-key-v1'})));
    Price.need(redact(JSON.stringify(original),secret)===JSON.stringify(original),'CREDENTIAL_IN_SR_RESULT');
    const inputStop=journal.read().runs.find(r=>r.id===job.runId).attempts.find(a=>a.input_count?.error)?.input_count.error??null;
    journal.finish(job.runId,{schema_version:'ce3-transport-result/1',mode,...(inputStop?{error:inputStop}:{}),label:mode==='offline'?'SYNTHETIC HTTP FIXTURE THROUGH REAL SR PROVIDER — NOT LIVE':'LIVE',prepared,original_sr_result:original});
    await finishMessage({ok:!inputStop,runId:job.runId,...(inputStop?{error:inputStop}:{})});
  } catch(error) {
    // Only enumerated local codes escape. No exception text/headers/stack.
    const prefix=typeof error?.message==='string'?error.message.split(':')[0]:'';
    const code=['BUDGET_STOP_BEFORE_CALL','RUN_ALREADY_EXISTS_NO_AUTOMATIC_RESEND','PRICE_MODE','PRICE_EXPIRED_OR_UNVERIFIED','PRICE_DIGEST','CREDENTIAL_REQUIRED','CREDENTIAL_IN_JOB','PREPARED_CHANGED','SR_VERSION_MISMATCH','SR_FILE_MISMATCH','SR_VERSION_UNAVAILABLE','SR_UNTRACKED_CODE','JOURNAL_FROZEN'].includes(prefix)?prefix:'TRANSPORT_WORKER_FAILED';
    if(journal && reserved) try{journal.finish(job.runId,{schema_version:'ce3-transport-result/1',mode:job.mode,error:code});}catch{}
    if(journal && !reserved) try{journal.note(job.runId,code);}catch{}
    await finishMessage({ok:false,error:code});
  } finally {journal?.close();process.disconnect();}
});
