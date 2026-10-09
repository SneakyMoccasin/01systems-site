'use strict';
const fs = require('node:fs');
const C = require('../../contracts/onboarding-v1/contract.cjs');
const { Session } = require('../../onboarding-session/session.cjs');
const A = require('./adapter.cjs');
async function bundle(session, receipts, options = {}) {
  const log = session.serialize(), frozenReceipts = structuredClone(receipts), state = Session.restore(log).view();
  if (new Set(frozenReceipts.map(r => r.job_id)).size !== frozenReceipts.length) throw new Error('DUPLICATE_RECEIPT');
  for (const { job_id, receipt } of frozenReceipts) {
    await A.verifyReceipt(receipt, options);
    const job = state.requests.find(j => j.id === job_id), review = state.reviews.find(r => r.id === job_id);
    if (!job || !review || C.digest(job.request) !== C.digest(receipt.prepared.request) || job.evidence_digest !== receipt.prepared.evidence_digest || C.digest(review.result) !== C.digest(receipt.result)) throw new Error('BUNDLE_BINDING');
  }
  for (const review of state.reviews) {
    if (review.result.producer.adapter === A.ADAPTER && !frozenReceipts.some(r => r.job_id === review.id)) throw new Error('MISSING_STRUCTURED_SR_RECEIPT');
    if (review.result.producer.adapter === 'ce3-real-sr-grounded/1') throw new Error('LEGACY_SR_REQUIRES_LEGACY_BUNDLE');
  }
  const payload = { schema_version: 'ce3-structured-sr-bundle/1', session: log, receipts: frozenReceipts };
  return { ...payload, digest: C.digest(payload) };
}
async function restore(value, options = {}) {
  if (value.schema_version !== 'ce3-structured-sr-bundle/1') throw new Error('BUNDLE_VERSION');
  const { digest, ...payload } = value;
  if (digest !== C.digest(payload)) throw new Error('BUNDLE_CHANGED');
  const session = Session.restore(value.session);
  const verified = await bundle(session, value.receipts, options);
  if (C.digest(verified) !== C.digest(value)) throw new Error('BUNDLE_BINDING');
  return { session, receipts: structuredClone(value.receipts) };
}
async function save(file, session, receipts, options = {}) {
  const value = await bundle(session, receipts, options), fd = fs.openSync(file, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return value;
}
async function load(file, options = {}) { return restore(JSON.parse(fs.readFileSync(file, 'utf8')), options); }
module.exports = { bundle, restore, save, load };
