'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const C = require('../../contracts/onboarding-v1/contract.cjs');
const { Session } = require('./session.cjs'), Archive = require('./archive.cjs'), { setup, confirm, demonstrate } = require('./demo.cjs');
const oldExample = require('../manual-example.cjs');
const A = require('../../onboarding-sr/structured/adapter.cjs'), R = require('../../onboarding-sr/structured/runtime.cjs');
const { tapeFor } = require('../../onboarding-sr/structured/test-tape.cjs');
const originalFetch = global.fetch;
test.before(() => { global.fetch = () => assert.fail('No external calls allowed'); });
test.after(() => { global.fetch = originalFetch; });
async function reviewed(problems = [], edit = () => {}) {
  const session = setup(), job = session.requestReview('r1'), tape = tapeFor(job.prepared, problems); edit(tape);
  const archive = await Archive.recorded(job.prepared, tape); await session.receiveReview(job.id, archive);
  return { session, job, archive };
}
function reseal(value, key = 'digest') { const { [key]: omitted, ...body } = value; value[key] = C.digest(body); return value; }
const problem = { target: 'approval', field: 'type', classification: 'incorrect' };
function revise(session) {
  const view = session.view(), p = structuredClone(view.proposals.at(-1));
  p.revision++; p.items[0].rationale += ' Explicitly revised.';
  p.change = { parent_digest: C.digest(view.proposals.at(-1)), changed_item_ids: p.items.map(i => i.id), affected_finding_ids: view.reviews.flatMap(r => r.result.findings.map(f => `${r.id}/${f.id}`)), reason: 'Explicit test revision' };
  session.submitProposal(p);
}
test('review event binds archive, receipt, snapshots, registry, code, adapter and producer', async () => {
  const x = await reviewed(), e = x.session.serialize().events.find(e => e.op === 'receive_structured_review');
  assert.deepEqual(e.args.binding, Archive.binding(x.archive));
  assert.equal(e.args.binding.receipt_digest, x.archive.receipt.digest);
  assert.equal(e.args.binding.registry_digest, x.job.prepared.input.registrySha256);
  assert.equal(e.args.binding.sr_code.contract, 'structured-grounded/1');
  assert.equal(e.args.binding.adapter, 'ce3-structured-sr/2'); assert.equal(e.args.binding.producer.mode, 'synthetic');
});
test('self-contained save/reopen checks integrity without loading SR or calling replay', async t => {
  const d = await demonstrate(), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'session2-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'complete.json'), load = R.loadSR, audit = Archive.audit;
  R.loadSR = () => assert.fail('Integrity reopening must not require SR checkout'); Archive.audit = () => assert.fail('No implicit replay');
  try { d.session.save(file); const reopened = Session.load(file); assert.deepEqual(reopened.view(), d.session.view()); assert.deepEqual(reopened.serialize(), d.session.serialize()); }
  finally { R.loadSR = load; Archive.audit = audit; }
  const reopened = Session.load(file); assert((await reopened.auditArchives()).every(x => x.model_calls === 0));
  assert.throws(() => d.session.save(file), /EEXIST/);
});
test('missing archive, changed original response and bad digests are rejected on reopen', async () => {
  const x = await reviewed(), base = x.session.serialize(), digest = x.archive.digest;
  for (const mutate of [
    l => { delete l.archives[digest]; },
    l => { delete l.archives[digest].receipt.original_sr_result.stages; },
    l => { l.archives[digest].receipt.original_sr_result.stages[0].raw.claims[0].statement = 'tampered'; },
    l => { l.archives[digest].receipt.prepared.input.source.sha256 = '0'.repeat(64); },
    l => { l.events.find(e => e.op === 'receive_structured_review').args.binding.receipt_digest = '0'.repeat(64); },
    l => { l.archives[digest].receipt.result.findings.push({ fake: true }); },
  ]) { const log = structuredClone(base); mutate(log); reseal(log, 'checksum'); assert.throws(() => Session.restore(log)); }
});
test('archive audit detects a recomputed outer receipt checksum after projection tampering', async () => {
  const x = await reviewed([problem]), bad = structuredClone(x.archive);
  bad.receipt.result.findings = []; reseal(bad.receipt); reseal(bad);
  const before = x.session.serialize(); await assert.rejects(() => x.session.receiveReview('unknown', bad)); assert.deepEqual(x.session.serialize(), before);
});
test('late response for an older proposal stays in history and cannot replace current review', async () => {
  const s = setup(), old = s.requestReview('old'), oldArchive = await Archive.recorded(old.prepared, tapeFor(old.prepared));
  revise(s); const now = s.requestReview('new'), currentArchive = await Archive.recorded(now.prepared, tapeFor(now.prepared));
  await s.receiveReview(now.id, currentArchive); await s.receiveReview(old.id, oldArchive);
  assert.equal(s.view().current_review.id, 'new'); assert.equal(s.view().reviews.length, 2); assert.equal(s.view().statuses.review, 'current');
});
test('late older request for same snapshot cannot replace newer failed review', async () => {
  const s = setup(), old = s.requestReview('old'), now = s.requestReview('new');
  const tape = tapeFor(now.prepared); tape.steps[1].error = 'SCRIPTED FAILURE';
  await s.receiveReview(now.id, await Archive.recorded(now.prepared, tape));
  await s.receiveReview(old.id, await Archive.recorded(old.prepared, tapeFor(old.prepared)));
  assert.equal(s.view().current_review.id, 'new'); assert.equal(s.view().statuses.review, 'incomplete');
  assert.throws(() => confirm(s, 'bad'));
});
test('changed evidence and explicit draft revision stale old confirmation', async () => {
  const x = await reviewed(); confirm(x.session, 'old');
  x.session.registerSource({ id: 'brief', text: 'Changed original source', replaces_version: 1 });
  assert.equal(x.session.view().statuses.review, 'stale'); assert.equal(x.session.view().statuses.confirmation, 'stale');
  const y = await reviewed(); confirm(y.session, 'old'); revise(y.session);
  assert.equal(y.session.view().statuses.review, 'stale'); assert.equal(y.session.view().statuses.confirmation, 'stale');
});
test('registry change invalidates review/confirmation and is bound into a new review', async () => {
  const x = await reviewed(); confirm(x.session, 'old');
  const changed = structuredClone(x.job.prepared.input.targets).reverse(); x.session.selectRegister(changed, 'Changed explicit field register order');
  assert.equal(x.session.view().statuses.review, 'stale'); assert.equal(x.session.view().statuses.confirmation, 'stale');
  const next = x.session.requestReview('new-register'); assert.notEqual(next.prepared.input.registrySha256, x.job.prepared.input.registrySha256);
  await assert.rejects(() => x.session.receiveReview(next.id, x.archive), /REVIEW_REQUEST_BINDING/);
  const archive = await Archive.recorded(next.prepared, tapeFor(next.prepared)); await x.session.receiveReview(next.id, archive);
  assert.equal(x.session.view().statuses.review, 'current'); assert.equal(x.session.view().statuses.confirmation, 'stale');
  confirm(x.session, 'new'); assert.equal(x.session.createHandoff('ok').schema_version, 'ce3-onboarding-transfer/2');
});
test('required register fields cannot be removed to manufacture coverage', () => {
  const s = setup(), job = s.requestReview('r'), fields = structuredClone(job.prepared.input.targets); fields[0].fields.pop();
  const before = s.serialize(); assert.throws(() => s.selectRegister(fields, 'Reduce scope'), /REGISTER_REQUIRED_FIELDS_MISSING/); assert.deepEqual(s.serialize(), before);
});
test('requesting a new review invalidates confirmation before any answer arrives', async () => {
  const x = await reviewed(); confirm(x.session, 'old'); x.session.requestReview('pending');
  assert.equal(x.session.view().statuses.review, 'pending'); assert.equal(x.session.view().statuses.confirmation, 'stale'); assert.throws(() => x.session.createHandoff('bad'));
});
test('complete coverage with blockers and unanswered blocker questions cannot hand off', async () => {
  const x = await reviewed([problem]); confirm(x.session, 'c'); assert.equal(x.session.view().statuses.review, 'current'); assert.throws(() => x.session.createHandoff('bad'), /BLOCKING_FINDING/);
  const y = await reviewed(); y.session.addQuestions([oldExample.question('q', null)]); confirm(y.session, 'c'); assert.throws(() => y.session.createHandoff('bad'), /BLOCKING_QUESTION/);
});
test('partial/failed/unmapped reviews cannot satisfy handoff or confirmation', async () => {
  for (const mode of ['partial', 'failed', 'unmapped']) {
    const x = await reviewed(mode === 'unmapped' ? [{ target: 'context:analysis', field: 'question', classification: 'incorrect' }] : [], tape => {
      if (mode === 'partial') { const claim = tape.steps[0].data.claims.pop(); tape.steps[1].data.assessments = tape.steps[1].data.assessments.filter(a => a.claimId !== claim.id); }
      if (mode === 'failed') tape.steps[1].error = 'SCRIPTED FAILURE';
    });
    assert.equal(x.session.view().statuses.review, 'incomplete'); assert.throws(() => confirm(x.session, 'bad')); assert.throws(() => x.session.createHandoff('bad'));
    Session.restore(x.session.serialize());
  }
});
test('a customer answer does not resolve a finding without changed proposal and relevant review', async () => {
  const x = await reviewed([problem]), finding = x.archive.receipt.result.findings[0];
  x.session.addQuestions([A.customerQuestion(x.archive.receipt, x.job.id, finding.id, 'Är dag 2 ett mål?', 'q')]);
  x.session.answer({ id: 'a', question_id: 'q', text: 'Dag 2 är ett mål. Godkännande kräver ett separat besked.', replaces_answer_id: null });
  const resolve = () => x.session.handleFinding({ review_id: x.job.id, finding_id: finding.id, status: 'resolved', reason: 'Answered', by: 'Test' });
  assert.throws(resolve); x.session.submitProposal(oldExample.correctedProposal(x.session.view())); assert.throws(resolve);
  const job = x.session.requestReview('new'); await x.session.receiveReview(job.id, await Archive.recorded(job.prepared, tapeFor(job.prepared))); resolve();
  assert.equal(x.session.view().effective_dispositions[0].status, 'resolved');
  x.session.selectRegister([...job.prepared.input.targets].reverse(), 'New register');
  assert.equal(x.session.view().effective_dispositions[0].status, 'accepted');
});
test('migration preserves source history byte for byte but does not promote reviews/confirmations', async t => {
  const d = await oldExample.demonstrate(), source = d.session.serialize(), frozen = JSON.stringify(source), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const from = path.join(dir, 'session-1.json'), to = path.join(dir, 'session-2.json'); fs.writeFileSync(from, frozen);
  const migrated = Session.migrateFile(from, to);
  assert.equal(fs.readFileSync(from, 'utf8'), frozen); assert.deepEqual(migrated.serialize().origin.source, source);
  assert.deepEqual(migrated.view().reviews, d.session.view().reviews); assert.equal(migrated.view().structured_reviews.length, 0);
  assert.equal(migrated.view().statuses.review, 'stale'); assert.equal(migrated.view().statuses.confirmation, 'stale');
  assert.throws(() => migrated.createHandoff('forbidden')); assert.throws(() => Session.migrateFile(from, from), /EEXIST/);
  assert.equal(fs.readFileSync(from, 'utf8'), frozen); assert.deepEqual(Session.load(to).view(), migrated.view());
  const next = migrated.requestReview('v2-first'); await migrated.receiveReview(next.id, await Archive.recorded(next.prepared, tapeFor(next.prepared)));
  assert.equal(migrated.view().statuses.confirmation, 'stale'); confirm(migrated, 'v2-confirm'); migrated.createHandoff('v2-handoff');
});
test('invalid or implicit migration is rejected and source identity is retained', () => {
  const old = oldExample.setup().serialize(); assert.throws(() => Session.restore(old), /SESSION_2_SCHEMA/);
  const bad = structuredClone(old); bad.events[0].args.text += 'tamper'; assert.throws(() => Session.migrate(bad, 'test'));
  const v2 = Session.migrate(old, 'explicit source label').serialize(); v2.origin.source_checksum = '0'.repeat(64); reseal(v2, 'checksum'); assert.throws(() => Session.restore(v2), /MIGRATION_ORIGIN/);
});
test('older structured receipt can be explicitly imported without changing original digest', async () => {
  const s = setup(), job = s.requestReview('new'), old = await A.reviewRecorded(job.prepared.request, tapeFor(job.prepared));
  const archived = await Archive.fromReceipt(old); await s.receiveReview(job.id, archived);
  assert.equal(s.view().current_review.binding.receipt_digest, old.digest); assert.equal(s.view().current_review.binding.adapter, A.ADAPTER);
});
test('changing a synthetic mode label to live is rejected, never silently relabelled', async () => {
  const x = await reviewed(), bad = structuredClone(x.archive); bad.producer.mode = 'live'; reseal(bad);
  assert.throws(() => Archive.integrity(bad));
  const o = structuredClone(x.archive.receipt.original_sr_result); o.producer.mode = 'live';
  await assert.rejects(() => Archive.importLive(x.job.prepared, o, Archive.metadata(o, 'live', 'remote')), /LIVE_PRODUCER_RELABELLED/);
});
// Fully invented live-envelope metadata for format tests ONLY. No actual live
// origin is claimed by these fixtures; the demonstration always uses synthetic.
function liveFixture(archive) {
  const o = structuredClone(archive.receipt.original_sr_result), provider = 'unit-live-format-fixture', model = 'unit-local-model-fixture';
  o.producer = { name: provider, requestedModel: model, mode: 'live' };
  Object.assign(o.grounded.metadata, { provider, model, mode: 'live' });
  o.grounded.metadata.diagnostics.requestedModel = model; o.grounded.metadata.diagnostics.returnedModels = [model];
  for (const stage of o.stages) stage.providerDiagnostic.returnedModel = model;
  return o;
}
test('provider-neutral local live envelope preserves live identity and replay never invokes a model', async () => {
  const s = setup(), job = s.requestReview('future-live');
  const seed = await Archive.recorded(job.prepared, tapeFor(job.prepared)), o = liveFixture(seed);
  const archive = await Archive.importLive(job.prepared, o, Archive.metadata(o, 'live', 'local'));
  await s.receiveReview(job.id, archive);
  assert.equal(s.view().reviews[0].result.producer.mode, 'live'); assert.equal(s.view().current_review.binding.producer.location, 'local');
  assert.equal(s.view().reviews[0].result.producer.model, 'unit-local-model-fixture');
  assert.deepEqual(Session.restore(s.serialize()).view(), s.view()); assert.equal((await Archive.audit(archive)).model_calls, 0);
});
test('live envelope requires consistent returned-model and run metadata', async () => {
  const x = await reviewed(), o = liveFixture(x.archive), producer = Archive.metadata(o, 'live', 'remote');
  await assert.rejects(() => Archive.importLive(x.job.prepared, o, { ...producer, requested_model: 'different' }), /PRODUCER_RUN_METADATA_MISMATCH/);
  const bad = structuredClone(o); delete bad.stages[0].providerDiagnostic.returnedModel;
  await assert.rejects(() => Archive.importLive(x.job.prepared, bad, Archive.metadata(bad, 'live', 'remote')), /LIVE_STAGE_METADATA_REQUIRED/);
  const noRun = structuredClone(o); delete noRun.grounded.metadata.runId;
  await assert.rejects(() => Archive.importLive(x.job.prepared, noRun, producer), /PRODUCER_RUN_METADATA_MISMATCH/);
});
test('late response after confirmation makes shown review context stale, not silently accepted', async () => {
  const s = setup(), old = s.requestReview('old'), now = s.requestReview('now');
  await s.receiveReview(now.id, await Archive.recorded(now.prepared, tapeFor(now.prepared))); confirm(s, 'shown');
  assert.throws(() => s.createHandoff('pending'), /PENDING_STRUCTURED_REVIEW/);
  await s.receiveReview(old.id, await Archive.recorded(old.prepared, tapeFor(old.prepared)));
  assert.equal(s.view().current_review.id, 'now'); assert.equal(s.view().statuses.confirmation, 'stale');
});
test('historical unmapped findings remain blockers after newer complete coverage', async () => {
  const x = await reviewed([{ target: 'context:analysis', field: 'question', classification: 'incorrect' }]);
  revise(x.session); const job = x.session.requestReview('new');
  await x.session.receiveReview(job.id, await Archive.recorded(job.prepared, tapeFor(job.prepared))); confirm(x.session, 'new');
  assert.equal(x.session.view().statuses.review, 'current');
  assert.throws(() => x.session.createHandoff('lost-context'), /UNRESOLVED_UNMAPPED_HISTORY/);
  assert.throws(() => Session.restore(x.session.serialize()).createHandoff('lost-context'), /UNRESOLVED_UNMAPPED_HISTORY/);
});
test('complete field coverage and limited finding reporting stay distinct and block transfer', async () => {
  const s = setup(), job = s.requestReview('many');
  const problems = job.prepared.fields.filter(f => f.kind === 'item').slice(0, 13).map(f => ({ target: f.targetId, field: f.fieldId, classification: 'incorrect' }));
  const archive = await Archive.recorded(job.prepared, tapeFor(job.prepared, problems)); await s.receiveReview(job.id, archive);
  assert.equal(archive.receipt.field_coverage.status, 'complete'); assert.equal(archive.receipt.finding_reporting.status, 'partial');
  assert.equal(archive.receipt.original_sr_result.grounded.findings.length, 12); assert.equal(s.view().reviews[0].result.findings.length, 13);
  assert.throws(() => s.createHandoff('bad')); assert.deepEqual(Session.restore(s.serialize()).serialize(), s.serialize());
});
test('live provenance cannot enter the synthetic receipt path or be renamed to mock', async () => {
  const x = await reviewed(), o = liveFixture(x.archive);
  const live = await Archive.importLive(x.job.prepared, o, Archive.metadata(o, 'live', 'local'));
  await assert.rejects(() => Archive.fromReceipt(live.receipt));
  const bad = structuredClone(live); bad.producer = Archive.metadata(o, 'synthetic', 'none');
  bad.receipt.result.producer.mode = 'synthetic'; bad.receipt.result.producer.model = null; reseal(bad.receipt); reseal(bad);
  assert.throws(() => Archive.integrity(bad), /SYNTHETIC_PRODUCER_MISMATCH/);
});
test('pending legacy review is preserved as a blocker, not silently retired by migration', async () => {
  const old = oldExample.setup(); old.requestReview('legacy-pending');
  const s = Session.migrate(old.serialize(), 'pending-session-1'); const job = s.requestReview('new');
  await s.receiveReview(job.id, await Archive.recorded(job.prepared, tapeFor(job.prepared))); confirm(s, 'new');
  assert.throws(() => s.createHandoff('bad'), /PENDING_STRUCTURED_REVIEW/);
});
test('session without analysis can close and reopen without model, register or SR', () => {
  const s = new Session('no-analysis'); s.registerSource({ id: 'brief', text: 'Enbart en upplysning; ingen analys efterfrågas.', replaces_version: null });
  s.setLifecycle('closed_no_analysis', 'Inget analysbehov identifierat.');
  assert.equal(Session.restore(s.serialize()).view().lifecycle, 'closed_no_analysis');
  assert.equal(s.view().proposals.length, 0); assert.deepEqual(s.serialize().archives, {});
  assert.throws(() => s.createHandoff('no-model'));
});
