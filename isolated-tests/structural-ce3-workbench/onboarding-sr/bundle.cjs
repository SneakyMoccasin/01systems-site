'use strict';
const fs=require('node:fs');
const C=require('../contracts/onboarding-v1/contract.cjs');
const {Session}=require('../onboarding-session/session.cjs');
const {verifyReceipt}=require('./adapter.cjs');
function bundle(session,receipts) {
 const state=session.view();
 if(new Set(receipts.map(r=>r.job_id)).size!==receipts.length)throw new Error('DUPLICATE_RECEIPT');
 for(const {job_id,receipt} of receipts) {
  verifyReceipt(receipt);
  const review=state.reviews.find(r=>r.id===job_id),job=state.requests.find(r=>r.id===job_id);
  if(!review||!job||C.digest(job.request)!==C.digest(receipt.prepared.request)||job.evidence_digest!==receipt.prepared.evidence_digest||C.digest(review.result)!==C.digest(receipt.result))throw new Error('BUNDLE_BINDING');
 }
 for(const review of state.reviews.filter(r=>r.result.producer.adapter==='ce3-real-sr-grounded/1'))if(!receipts.some(r=>r.job_id===review.id))throw new Error('MISSING_ORIGINAL_SR_RECEIPT');
 const payload={schema_version:'ce3-sr-session-bundle/1',session:session.serialize(),receipts:structuredClone(receipts)};
 return {...payload,digest:C.digest(payload)};
}
function restore(value) {
 if(value.schema_version!=='ce3-sr-session-bundle/1')throw new Error('BUNDLE_VERSION');
 const session=Session.restore(value.session);
 if(C.digest(bundle(session,value.receipts))!==C.digest(value))throw new Error('BUNDLE_CHANGED');
 return {session,receipts:structuredClone(value.receipts)};
}
function save(file,session,receipts) {const value=bundle(session,receipts);const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return value;}
function load(file){return restore(JSON.parse(fs.readFileSync(file,'utf8')));}
module.exports={bundle,restore,save,load};
