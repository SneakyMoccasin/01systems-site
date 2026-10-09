'use strict';
// Loads the actual, pinned local SR code. Never imports its provider factory or reads credentials.
const fs=require('node:fs'),path=require('node:path');
const C=require('../contracts/onboarding-v1/contract.cjs');
const pin=require('./sr-code-pin.json');
const DEFAULT_SR='/Users/christian/Projects/skeptical-reader';
function loadSR(root=DEFAULT_SR) {
 for(const [file,hash] of Object.entries(pin.files)) {
  if(C.hash(fs.readFileSync(path.join(root,file),'utf8'))!==hash) throw new Error(`SR_CODE_CHANGED: ${file}`);
 }
 const loader=require(path.join(root,'node_modules/tsx/dist/cjs/api/index.cjs'));
 const load=file=>loader.require(path.join(root,'src/lib',file),__filename);
 return {...load('grounded/run.ts'),...load('grounded/input.ts'),...load('grounded/schemas.ts'),...load('text.ts'),z:require(path.join(root,'node_modules/zod')).z,commit:pin.commit};
}
const STAGES=['grounded_claim_extraction','grounded_support_assessment','grounded_adjudication'];
async function runRecorded(prepared, script, options={}) {
 const sr=loadSR(options.srRoot), trace=[];
 // Only a JSON test tape crosses this boundary. No callable provider and no live switch.
 const tape=JSON.parse(JSON.stringify(script));
 const provider={name:'ce3-sr-recorded-test-double',model:'offline-scripted-data',mode:'mock',async generateStructured(request) {
  const step={stage:request.stage,instructions:request.instructions,input:request.input,document:request.document,sourceMaterial:request.sourceMaterial,question:request.question,schema:sr.z.toJSONSchema(request.schema)};
  trace.push(step);
  const index=trace.length-1;
  if(request.stage!==STAGES[index]||!tape[index]||tape[index].stage!==request.stage)throw new Error('RECORDED_STAGE_MISMATCH');
  if(tape[index].error) {step.injected_error=tape[index].error;throw new Error('RECORDED_PROVIDER_FAILURE');}
  step.original_data=tape[index].data;
  const data=request.schema.parse(tape[index].data);
  step.validated_data=data;
  return {data,usage:{apiCalls:0},diagnostic:{repairUsed:false,returnedModel:'offline-scripted-data'}};
 }};
 try {
  // Same input validation as API route, with role separation intact.
  const input=sr.groundedInputSchema.parse(prepared.input);
  if(input.sourceMaterial!==prepared.input.sourceMaterial||input.reviewText!==prepared.input.reviewText)throw new Error('INPUT_NORMALIZATION_WOULD_CHANGE_OFFSETS');
  const original=await sr.runGroundedReview(input.sourceMaterial,input.question,input.reviewText,provider,input.language,{fingerprintKey:'ce3-offline-synthetic-fingerprint-key-0001',...(options.signal?{signal:options.signal}:{}),...(options.deadlineMs!==undefined?{deadlineMs:options.deadlineMs}:{})});
  return {original:JSON.parse(JSON.stringify(original)),trace,error:null};
 } catch(error) {return {original:null,trace,error:{code:error.name==='ZodError'?'SR_VALIDATION_FAILED':error.message==='RECORDED_PROVIDER_FAILURE'?'RECORDED_PROVIDER_FAILURE':error.name==='AuditClientAbortError'?'SR_ABORTED':error.name==='AuditDeadlineExceededError'?'SR_DEADLINE':'SR_EXECUTION_FAILED'}};}
}
module.exports={loadSR,runRecorded,STAGES};
