'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=require('../contracts/onboarding-v1/contract.cjs'), A=require('./adapters.cjs');
const {verifyFreeze,bodyFor,parse}=require('./run.cjs');
const {usageCost,inputBound,assertBound}=require('./provider.cjs');
const P=require('./protocol.json'),cases=require('./cases.json').cases;
function verify(directory=path.join(__dirname,'results')) {
 const freeze=verifyFreeze(),read=f=>JSON.parse(fs.readFileSync(path.join(directory,f)));
 const ledger=read('ledger.json'),run=read('run.json');assert.equal(run.freeze_digest,C.digest(freeze));
 assert.equal(new Set(ledger.reservations.map(r=>r.id)).size,ledger.reservations.length);assert(ledger.reservations.length<=P.max_calls);
 assert(ledger.reservations.reduce((n,r)=>n+r.reserved_usd,0)<=P.hard_budget_usd);
 let replayed=0,invalid=0;const mismatchedSourceKinds=[];
 for(const reservation of ledger.reservations) {
  const [caseId,r,stage]=reservation.id.split('-'),c=cases.find(c=>c.id===caseId),repetition=Number(r.slice(1));assert(c);
  const request=read(`${reservation.id}/request.json`);assertBound(request);assert.equal(inputBound(request),reservation.input_token_upper_bound);
  const proposal=stage==='draft'?null:read(`${caseId}-${r}-draft/artifact.json`);
  assert.deepEqual(request,bodyFor(stage,c,proposal));
  const metricsFile=path.join(directory,`${reservation.id}/metrics.json`);if(!fs.existsSync(metricsFile))continue;
  const metrics=read(`${reservation.id}/metrics.json`);assert.deepEqual(metrics.cost,usageCost(metrics.usage));
  if(metrics.error)continue;
  const raw=read(`${reservation.id}/response.txt`),wire=parse(raw);assert.deepEqual(wire,read(`${reservation.id}/parsed.json`));
  const artifact=stage==='draft'?A.proposalFrom(c,repetition,wire):A.reviewFrom(proposal,stage,wire,raw.model);
  assert.deepEqual(artifact,read(`${reservation.id}/artifact.json`));
  const validation={wire:{valid:true},...A.checks(proposal||artifact,stage==='draft'?null:artifact,wire.questions)};
  assert.deepEqual(validation,read(`${reservation.id}/validation.json`));
  if(!validation.contract.valid)invalid++;
  if(stage==='draft')for(const i of artifact.items.filter(i=>i.type==='user_fact'&&i.status==='known')) {
   if(i.refs.length&&i.refs.every(r=>artifact.sources.find(s=>s.id===r.source_id).kind==='document'))mismatchedSourceKinds.push({pair:`${caseId}-${r}`,item_id:i.id,type:i.type,source_kinds:['document']});
  }
  replayed++;
 }
 return {freeze_verified:true,requests_match_frozen_inputs:true,reservations:ledger.reservations.length,replayed_responses:replayed,contract_invalid_envelopes:invalid,source_kind_flags:mismatchedSourceKinds};
}
if(require.main===module)console.log(JSON.stringify(verify(),null,2));
module.exports={verify};
