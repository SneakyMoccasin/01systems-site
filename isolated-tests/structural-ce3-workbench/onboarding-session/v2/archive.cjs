'use strict';
// Archive validation never calls a model. SR is loaded only for preparation or
// the separately requested replay audit of already recorded stage responses.
const C = require('../../contracts/onboarding-v1/contract.cjs');
const A = require('../../onboarding-sr/structured/adapter.cjs');
const presentation = require('../../onboarding-sr/adapter.cjs');
const R = require('../../onboarding-sr/structured/runtime.cjs');
const pin = require('../../onboarding-sr/structured/sr-code-pin.json');
const Ajv = require('ajv');
const archiveSchema = new Ajv({ allErrors: true }).compile(require('./archive.schema.json'));
const need = (ok, code) => { if (!ok) throw new Error(code); };
const same = (a, b) => C.digest(a) === C.digest(b);
const seal = value => ({ ...value, digest: C.digest(value) });
function checksum(value, code) { const { digest, ...body } = value; need(digest === C.digest(body), code); }
const ADAPTER = 'ce3-structured-sr/2';
function checkRegistry(request, targets) {
  const minimum = A.registry(request.snapshot);
  for (const target of minimum) {
    const actual = targets.find(t => t.targetId === target.targetId);
    need(actual && actual.kind === target.kind && actual.path === target.path && target.fields.every(f => actual.fields.some(g => same(f, g))), 'REGISTER_REQUIRED_FIELDS_MISSING');
  }
}
function prepare(request, targets = A.registry(request.snapshot), options = {}) {
  const base = A.prepare(request, options), sr = R.loadSR(options.srRoot);
  checkRegistry(request, targets);
  const input = { ...base.input, targets: structuredClone(targets), registrySha256: C.digest(targets) };
  const validated = sr.contracts.prepare(input);
  const { digest, ...body } = base;
  return seal({ ...body, schema_version: 'ce3-structured-sr-prepared/2', input, binding: validated.binding, fields: validated.fields });
}
function checkPrepared(p) {
  checksum(p, 'PREPARED_DIGEST');
  need(['ce3-structured-sr-prepared/1', 'ce3-structured-sr-prepared/2'].includes(p.schema_version), 'PREPARED_VERSION');
  C.schema('proposal', p.request.snapshot);
  need(p.model_digest === C.digest(p.request.snapshot) && p.request.proposal_digest === p.model_digest, 'MODEL_DIGEST');
  need(p.evidence_digest === C.digest(p.request.snapshot.sources), 'EVIDENCE_DIGEST');
  const base = presentation.prepare(p.request); // Pure existing source presentation; no SR load.
  need(p.input.source.text === base.input.sourceMaterial && same(p.source_spans, base.sources) && same(p.contract, base.contract), 'SOURCE_PRESENTATION');
  need(p.input.source.version === p.evidence_digest && p.input.draft.id === p.request.snapshot.id && p.input.draft.version === String(p.request.snapshot.revision), 'SNAPSHOT_VERSION');
  need(same(JSON.parse(p.input.draft.text), p.request.snapshot), 'DRAFT_SNAPSHOT');
  need(p.input.draft.sha256 === C.hash(p.input.draft.text) && p.input.source.sha256 === C.hash(p.input.source.text), 'TEXT_DIGEST');
  need(p.input.registrySha256 === C.digest(p.input.targets), 'REGISTER_DIGEST');
  checkRegistry(p.request, p.input.targets);
  const b = p.binding;
  need(b.requestSha256 === C.digest(p.input) && b.requestId === p.input.requestId && b.registrySha256 === p.input.registrySha256 &&
    b.sourceId === p.input.source.id && b.sourceVersion === p.input.source.version && b.sourceSha256 === p.input.source.sha256 &&
    b.draftId === p.input.draft.id && b.draftVersion === p.input.draft.version && b.draftSha256 === p.input.draft.sha256, 'SR_BINDING');
  need(same(p.sr_code, { commit: pin.commit, pin_digest: C.digest(pin), contract: pin.contract }), 'ARCHIVE_CODE_IDENTITY');
}
function metadata(original, mode, location) {
  return { schema_version: 'ce3-review-producer/1', mode, response_origin: mode === 'synthetic' ? 'scripted_responses' : 'model_responses',
    provider: original.producer.name, location, requested_model: original.producer.requestedModel,
    returned_models: [...new Set(original.stages.map(s => s.providerDiagnostic?.returnedModel).filter(Boolean))].sort(),
    run_id: original.grounded?.metadata.runId ?? `failed-${C.digest(original.stages)}`,
    completed_at: original.grounded?.metadata.completedAt ?? null };
}
function checkProducer(receipt, producer) {
  const o = receipt.original_sr_result;
  need(producer.schema_version === 'ce3-review-producer/1' && ['synthetic', 'live'].includes(producer.mode), 'PRODUCER_VERSION_MODE');
  need(['none', 'local', 'remote'].includes(producer.location), 'PRODUCER_LOCATION');
  need(same(Object.keys(producer).sort(), ['schema_version','mode','response_origin','provider','location','requested_model','returned_models','run_id','completed_at'].sort()), 'PRODUCER_FIELDS');
  need(typeof producer.provider === 'string' && producer.provider.length && typeof producer.requested_model === 'string' && producer.requested_model.length, 'MODEL_METADATA_REQUIRED');
  need(same(producer, metadata(o, producer.mode, producer.location)), 'PRODUCER_RUN_METADATA_MISMATCH');
  need(receipt.result.producer.mode === producer.mode, 'PRODUCER_RELABELLED');
  if (producer.mode === 'synthetic') {
    need(o.producer.mode === 'mock' && o.producer.name === 'ce3-structured-sr-test-double' && producer.location === 'none' && receipt.result.producer.model === null, 'SYNTHETIC_PRODUCER_MISMATCH');
    need(receipt.test_tape?.label === 'SYNTHETIC TEST DOUBLE — NOT AI DETECTION', 'SCRIPTED_RESPONSES_REQUIRED');
  } else {
    need(o.producer.mode === 'live' && !/test-double|offline-scripted/i.test(o.producer.name + o.producer.requestedModel) && receipt.test_tape === null && producer.location !== 'none', 'LIVE_PRODUCER_RELABELLED');
    need(receipt.result.producer.model === producer.requested_model, 'LIVE_MODEL_MISMATCH');
    for (const stage of o.stages.filter(s => s.raw !== null)) need(typeof stage.providerDiagnostic?.returnedModel === 'string' && stage.providerDiagnostic.returnedModel.length > 0 && stage.usage && Object.keys(stage.usage).length > 0 && Object.values(stage.usage).every(v => Number.isFinite(v) && v >= 0), 'LIVE_STAGE_METADATA_REQUIRED');
    if (o.status !== 'failed') need(producer.returned_models.length > 0 && o.grounded?.metadata.mode === 'live' && o.grounded.metadata.model === producer.requested_model && o.grounded.metadata.provider === producer.provider && typeof o.grounded.metadata.runId === 'string' && o.grounded.metadata.runId.length > 0 && Number.isFinite(Date.parse(o.grounded.metadata.completedAt)), 'LIVE_RUN_METADATA_REQUIRED');
  }
}
function project(p, original, mode, options) {
  const sr = R.loadSR(options?.srRoot);
  need(same(original.binding, p.binding) && same(original.request, p.input), 'SR_RESULT_BINDING');
  return A.translateFields(p, original, sr, { mode, adapter: ADAPTER, model: mode === 'live' ? original.producer.requestedModel : null, prompt_version: 'SR-structured-grounded/1;CE3-registry/2' });
}
function wrap(receipt, producer) {
  return seal({ schema_version: 'ce3-review-archive/1', receipt, producer,
    verification: { method: 'recorded_response_replay/1', receipt_digest: receipt.digest,
      sr_semantics_digest: C.digest(R.replayComparable(receipt.original_sr_result)), translation_digest: C.digest(receipt.result) } });
}
function integrity(archive) {
  need(archiveSchema(archive), 'ARCHIVE_SCHEMA');
  need(archive.schema_version === 'ce3-review-archive/1', 'ARCHIVE_VERSION'); checksum(archive, 'ARCHIVE_DIGEST');
  const r = archive.receipt; need(['ce3-structured-sr-receipt/1', 'ce3-structured-sr-receipt/2'].includes(r.schema_version), 'RECEIPT_VERSION');
  checksum(r, 'RECEIPT_DIGEST'); checkPrepared(r.prepared); checkProducer(r, archive.producer);
  need(r.schema_version === 'ce3-structured-sr-receipt/1' ? r.result.producer.adapter === A.ADAPTER && archive.producer.mode === 'synthetic' : r.result.producer.adapter === ADAPTER, 'ARCHIVE_ADAPTER_IDENTITY');
  need(same(archive.verification, wrap(r, archive.producer).verification), 'ARCHIVE_VERIFICATION_CHANGED');
  need(same(r.sr_code, r.prepared.sr_code) && r.original_sr_result.contractVersion === 'structured-grounded/1' && same(r.original_sr_result.binding, r.prepared.binding) && same(r.original_sr_result.request, r.prepared.input), 'ARCHIVE_BINDING');
  need(same(r.field_coverage, r.original_sr_result.fieldCoverage) && same(r.finding_reporting, r.original_sr_result.findingReporting), 'COVERAGE_CHANGED');
  C.schema('review', { schema_version: 'ce3-onboarding-review/1', id: 'archive', request: r.prepared.request, result: r.result });
  need(['complete', 'partial', 'failed'].includes(r.original_sr_result.status), 'SR_STATUS');
  if (r.result.status === 'complete') need(r.original_sr_result.status === 'complete' && r.field_coverage.status === 'complete' && r.finding_reporting.status === 'complete' && r.unmapped.length === 0 && r.prepared.contract.valid, 'FALSE_COMPLETE');
  return archive;
}
async function fromReceipt(receipt, options = {}) {
  receipt = structuredClone(receipt); await A.verifyReceipt(receipt, options);
  return integrity(wrap(receipt, metadata(receipt.original_sr_result, 'synthetic', 'none')));
}
async function recorded(prepared, tape, options = {}) {
  checkPrepared(prepared);
  need(same(prepared, prepare(prepared.request, prepared.input.targets, { ...options, draftText: prepared.input.draft.text })), 'PREPARED_CHANGED');
  const run = await R.runRecorded(prepared.input, tape, options);
  const receipt = seal({ schema_version: 'ce3-structured-sr-receipt/2', prepared: structuredClone(prepared), sr_code: run.sr_code,
    original_sr_result: run.original, test_tape: structuredClone(tape), ...project(prepared, run.original, 'synthetic', options) });
  return integrity(wrap(receipt, metadata(run.original, 'synthetic', 'none')));
}
// Explicit audit of archived answers. The provider below returns stored values;
// no provider factory or transport exists, including when their provenance is live.
async function audit(archive, options = {}) {
  integrity(archive); const r = archive.receipt;
  if (r.schema_version === 'ce3-structured-sr-receipt/1') { await A.verifyReceipt(r, options); return { mode: 'recorded_response_replay', model_calls: 0 }; }
  need(same(r.prepared, prepare(r.prepared.request, r.prepared.input.targets, { ...options, draftText: r.prepared.input.draft.text })), 'PREPARED_CHANGED');
  let replay;
  if (archive.producer.mode === 'synthetic') replay = (await R.runRecorded(r.prepared.input, r.test_tape, options)).original;
  else {
    const sr = R.loadSR(options.srRoot), original = r.original_sr_result; let n = 0;
    const provider = { name: original.producer.name, model: original.producer.requestedModel, mode: 'live', async generateStructured(request) {
      const stage = original.stages[n++]; need(stage && stage.stage === request.stage && stage.input === request.input && stage.instructions === request.instructions, 'REPLAY_STAGE_INPUT');
      if (stage.raw === null) throw new Error('ARCHIVED_STAGE_FAILED');
      return { data: structuredClone(stage.raw), usage: stage.usage, diagnostic: stage.providerDiagnostic };
    }};
    replay = JSON.parse(JSON.stringify(await sr.runStructuredGroundedReview(r.prepared.input, provider, 'sv', { fingerprintKey: 'ce3-archive-replay-fingerprint-key-0001' })));
  }
  const expected = R.replayComparable(replay), stored = R.replayComparable(r.original_sr_result);
  // A live run's private fingerprint key is never archived. The original value
  // remains checksum-protected; replay checks all other diagnostic fields.
  if (archive.producer.mode === 'live') for (const value of [expected, stored]) if (value.grounded) delete value.grounded.metadata.diagnostics.runFingerprint;
  need(same(expected, stored), 'SR_REPLAY_MISMATCH');
  const translation = project(r.prepared, replay, archive.producer.mode, options);
  for (const key of Object.keys(translation)) need(same(r[key], translation[key]), 'TRANSLATION_CHANGED');
  return { mode: 'recorded_response_replay', model_calls: 0 };
}
// Future transport boundary: accepts an already produced, fully archived live
// result with consistent run/model metadata. This function never generates it.
async function importLive(prepared, original, producer, options = {}) {
  const receipt = seal({ schema_version: 'ce3-structured-sr-receipt/2', prepared: structuredClone(prepared), sr_code: prepared.sr_code,
    original_sr_result: structuredClone(original), test_tape: null, ...project(prepared, original, 'live', options) });
  const archive = integrity(wrap(receipt, structuredClone(producer))); await audit(archive, options); return archive;
}
function binding(archive) {
  integrity(archive); const r = archive.receipt, p = r.prepared;
  return { archive_digest: archive.digest, receipt_digest: r.digest, proposal_digest: p.model_digest, evidence_digest: p.evidence_digest,
    source: { id: p.input.source.id, version: p.input.source.version, sha256: p.input.source.sha256 },
    draft: { id: p.input.draft.id, version: p.input.draft.version, sha256: p.input.draft.sha256 },
    registry_digest: p.input.registrySha256, sr_code: r.sr_code, adapter: r.result.producer.adapter, producer: archive.producer };
}
module.exports = { ADAPTER, prepare, checkPrepared, metadata, integrity, fromReceipt, recorded, audit, importLive, binding };
