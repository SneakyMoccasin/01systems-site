'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');
const C = require('../../contracts/onboarding-v1/contract.cjs');
const { setup, correctedProposal, confirm, question } = require('../../onboarding-session/manual-example.cjs');
const A = require('./adapter.cjs'), B = require('./bundle.cjs'), R = require('./runtime.cjs'), { tapeFor } = require('./test-tape.cjs');
const originalFetch = global.fetch;
test.before(() => { global.fetch = () => assert.fail('External calls forbidden'); });
test.after(() => { global.fetch = originalFetch; });
function job() { const session = setup(), job = session.requestReview('review-1'), prepared = A.prepare(job.request); return { session, job, prepared }; }
async function make(problems = []) { const x = job(); return { ...x, receipt: await A.reviewRecorded(x.job.request, tapeFor(x.prepared, problems)) }; }
const problem = { target: 'approval', field: 'type', classification: 'incorrect' };
function rehash(value) { const { digest, ...rest } = value; value.digest = C.digest(rest); return value; }

test('full commit and relevant hashes are verified before loading real SR', t => {
  assert.equal(R.loadSR().identity.commit, 'e7308010ecbea1ebe46c3298aa6a96f06381ad0a');
  assert.equal(typeof R.loadSR().runStructuredGroundedReview, 'function');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ce3-sr-pin-')); t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', '--no-checkout', '/Users/christian/Projects/skeptical-reader', tmp]);
  // Exact commit, but missing/modified relevant content fails before any import.
  assert.throws(() => R.loadSR(tmp), /SR_FILE_MISMATCH/);
  execFileSync('git', ['-C', tmp, 'checkout', '--quiet', '10d2482186e0d116506f215bdbdbd70f009ab18b']);
  assert.throws(() => R.loadSR(tmp), /SR_VERSION_MISMATCH.*e730801/);
  execFileSync('git', ['-C', tmp, 'checkout', '--quiet', 'e7308010ecbea1ebe46c3298aa6a96f06381ad0a']);
  R.verifyCode(tmp);
  const file = path.join(tmp, 'src/lib/grounded/structured-v1/run.ts'), original = fs.readFileSync(file);
  fs.appendFileSync(file, '\n// altered'); assert.throws(() => R.loadSR(tmp), /SR_FILE_MISMATCH.*run.ts/); fs.writeFileSync(file, original);
  fs.writeFileSync(path.join(tmp, 'src/lib/grounded/structured-v1/run.js'), '// untracked shadow');
  assert.throws(() => R.loadSR(tmp), /SR_UNTRACKED_CODE/);
});
test('deterministic registry preserves roles, exact source spans and all requested context fields', () => {
  const x = job(), p = x.prepared;
  assert.deepEqual(p, A.prepare(x.job.request));
  assert.equal(p.fields.length, 28); assert.equal(p.fields.filter(f => f.kind === 'item').length, 21);
  assert(p.fields.some(f => f.kind === 'analysis' && f.fieldId === 'question'));
  assert(p.fields.some(f => f.kind === 'scope' && f.fieldId === 'includes'));
  for (const span of p.source_spans) assert.equal(p.input.source.text.slice(span.start, span.end), x.job.request.snapshot.sources.find(s => s.id === span.id).content);
  assert.equal(p.input.draft.sha256, C.hash(p.input.draft.text)); assert.equal(p.binding.registrySha256, p.input.registrySha256);
});
test('complete explicit coverage without findings preserves complete status through session/1', async () => {
  const x = await make(); assert.equal(x.receipt.original_sr_result.status, 'complete'); assert.equal(x.receipt.result.status, 'complete');
  assert.deepEqual(x.receipt.result.assessed_item_ids, ['plan', 'criterion', 'approval']); assert.deepEqual(x.receipt.result.findings, []);
  await A.attachOffline(x.session, x.job.id, x.receipt); confirm(x.session, 'confirm');
  assert.equal(x.session.createHandoff('handoff').status, 'ready_for_separate_compilation_and_validation');
});
test('complete coverage with a blocking finding never means approved handoff', async () => {
  const x = await make([problem]); assert.equal(x.receipt.result.status, 'complete'); assert.equal(x.receipt.result.findings[0].impact, 'blocks_handoff');
  await A.attachOffline(x.session, x.job.id, x.receipt); confirm(x.session, 'confirm'); assert.throws(() => x.session.createHandoff('blocked'));
});
test('an unresolved blocking question blocks a complete finding-free review', async () => {
  const x = await make(); await A.attachOffline(x.session, x.job.id, x.receipt);
  x.session.addQuestions([question('q', null)]); confirm(x.session, 'confirm'); assert.throws(() => x.session.createHandoff('blocked'));
});
test('partial field coverage cannot become whole-item coverage despite empty findings', async () => {
  const x = job(), tape = tapeFor(x.prepared);
  const removed = tape.steps[0].data.claims.find(c => c.targetId === 'approval' && c.fieldId === 'status');
  tape.steps[0].data.claims = tape.steps[0].data.claims.filter(c => c.id !== removed.id);
  tape.steps[1].data.assessments = tape.steps[1].data.assessments.filter(a => a.claimId !== removed.id);
  const receipt = await A.reviewRecorded(x.job.request, tape);
  assert.equal(receipt.result.status, 'partial'); assert(!receipt.result.assessed_item_ids.includes('approval'));
  assert.equal(receipt.field_coverage.fields.find(f => f.targetId === 'approval' && f.fieldId === 'status').status, 'unassessed');
  assert.equal(receipt.finding_reporting.status, 'complete'); assert.deepEqual(receipt.result.findings, []);
});
test('whole-object quotation cannot replace an explicitly registered field quote', async () => {
  const x = job(), tape = tapeFor(x.prepared); tape.steps[0].data.claims[0].quote.exactText = x.prepared.input.draft.text;
  const receipt = await A.reviewRecorded(x.job.request, tape);
  assert.equal(receipt.result.status, 'partial'); assert(!receipt.result.assessed_item_ids.includes('plan'));
});
test('failed review preserves original stages and exposes failed rather than empty success', async () => {
  const x = job(), tape = tapeFor(x.prepared); tape.steps[1] = { stage: R.STAGES[1], error: 'SCRIPTED FAILURE' };
  const receipt = await A.reviewRecorded(x.job.request, tape);
  assert.equal(receipt.original_sr_result.status, 'failed'); assert.equal(receipt.result.status, 'failed');
  assert.equal(receipt.original_sr_result.stages.length, 2); assert.equal(receipt.original_sr_result.stages[1].error, 'stage_failed');
  await A.verifyReceipt(receipt);
});
test('source support and classification remain two judgments, not one combined native label', async () => {
  const x = await make([{ ...problem, support: 'unsupported' }]);
  const rows = x.receipt.mappings.filter(m => m.target_id === 'approval');
  assert.deepEqual(rows.map(m => [m.dimension, m.original_outcome]), [['support', 'unsupported'], ['classification', 'incorrect']]);
  assert.deepEqual(x.receipt.result.findings.map(f => [f.category, f.basis]), [['unsupported', 'absence_in_supplied_material'], ['meaning_shift', 'evidence']]);
  assert.equal(x.receipt.original_sr_result.assessments.find(a => a.targetId === 'approval' && a.fieldId === 'type').classification.outcome, 'incorrect');
});
test('source-supported but incorrectly classified booking translates as meaning shift, not contradiction', async () => {
  const x = await make([problem]); assert.equal(x.receipt.result.findings[0].category, 'meaning_shift');
  assert.equal(x.receipt.mappings[0].dimension, 'classification'); assert.equal(x.receipt.original_sr_result.grounded.findings[0].outcome, 'partially_supported');
});
test('context findings remain unmapped and downgrade otherwise complete SR', async () => {
  const x = await make([{ target: 'context:analysis', field: 'question', classification: 'incorrect' }]);
  assert.equal(x.receipt.original_sr_result.status, 'complete'); assert.equal(x.receipt.result.status, 'partial');
  assert.equal(x.receipt.unmapped[0].reason, 'context_target_not_representable_in_review_1'); assert.deepEqual(x.receipt.result.findings, []);
});
test('evidence quotes outside a source body remain unmapped', async () => {
  const x = job(), tape = tapeFor(x.prepared, [problem]);
  const assessment = tape.steps[1].data.assessments.find(a => a.classification.outcome === 'incorrect');
  assessment.classification.sourceQuotes = [{ exactText: 'CE3 ORIGINALUNDERLAG', occurrenceIndex: 0 }];
  const r = await A.reviewRecorded(x.job.request, tape);
  assert.equal(r.original_sr_result.status, 'complete'); assert.equal(r.result.status, 'partial');
  assert.equal(r.unmapped[0].reason, 'source_quote_not_inside_one_source');
});
test('finding cap stays partial while retaining every relevant assessment', async () => {
  const x = job(), problems = x.prepared.fields.filter(f => f.kind === 'item').slice(0, 13).map(f => ({ target: f.targetId, field: f.fieldId, classification: 'incorrect' }));
  const r = await A.reviewRecorded(x.job.request, tapeFor(x.prepared, problems));
  assert.equal(r.field_coverage.status, 'complete'); assert.equal(r.finding_reporting.status, 'partial'); assert.equal(r.result.status, 'partial');
  assert.equal(r.original_sr_result.grounded.findings.length, 12); assert.equal(r.result.findings.length, 13);
  assert.equal(r.mappings.filter(m => m.origin === 'sr_assessment_without_final_finding').length, 1);
});
test('late review cannot approve changed evidence/model and an answer never resolves a finding', async () => {
  const x = await make([problem]), late = x.session.requestReview('late');
  await A.attachOffline(x.session, x.job.id, x.receipt);
  x.session.addQuestions([A.customerQuestion(x.receipt, x.job.id, x.receipt.result.findings[0].id, 'Är dag 2 ett mål?', 'q')]); confirm(x.session, 'old');
  x.session.answer({ id: 'a', question_id: 'q', text: 'Dag 2 är ett mål. Godkännande kräver ett separat besked.', replaces_answer_id: null });
  assert.equal(x.session.view().statuses.review, 'stale'); assert.equal(x.session.view().statuses.confirmation, 'stale');
  x.session.submitProposal(correctedProposal(x.session.view()));
  await A.attachOffline(x.session, late.id, x.receipt);
  assert.equal(x.session.view().statuses.review, 'stale'); assert.equal(x.session.view().reviews[0].result.findings.length, 1);
  assert.throws(() => x.session.handleFinding({ review_id: x.job.id, finding_id: x.receipt.result.findings[0].id, status: 'resolved', reason: 'Answer alone', by: 'Test' }));
});
test('wrong source/model/registry digest is rejected and late step binding produces failed receipt', async () => {
  const x = job(); const bad = structuredClone(x.job.request); bad.proposal_digest = '0'.repeat(64);
  assert.throws(() => A.prepare(bad), /MODEL_DIGEST/);
  const changed = structuredClone(x.prepared); changed.input.registrySha256 = '0'.repeat(64);
  assert.throws(() => A.translate(changed, {}), /PREPARED_CHANGED/);
  const tape = tapeFor(x.prepared); tape.steps[1].data.binding.sourceSha256 = '0'.repeat(64);
  const r = await A.reviewRecorded(x.job.request, tape); assert.equal(r.result.status, 'failed'); await A.verifyReceipt(r);
});
test('save and reopen retain originals, prompts, separate judgments and session/1 history', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ce3-structured-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const d = await require('./demo.cjs').demonstrate();
  const file = path.join(dir, 'bundle.json'); await B.save(file, d.session, d.receipts);
  const restored = await B.load(file); assert.deepEqual(restored.session.view(), d.session.view()); assert.deepEqual(restored.receipts, d.receipts);
  assert.equal(restored.session.serialize().schema_version, 'ce3-onboarding-session/1');
  const receiptFile = path.join(dir, 'receipt.json'); await A.saveReceipt(receiptFile, d.receipts[0].receipt); assert.deepEqual(await A.loadReceipt(receiptFile), d.receipts[0].receipt);
  await assert.rejects(() => B.bundle(d.session, []), /MISSING_STRUCTURED/);
});
test('tampering, even with recomputed outer checksum, fails deterministic replay/translation', async () => {
  const x = await make([problem]), before = x.session.serialize();
  for (const edit of [
    r => { r.result.findings = []; },
    r => { r.original_sr_result.assessments[0].classification.outcome = 'incorrect'; },
    r => { r.original_sr_result.fieldCoverage.fields[0].status = 'unassessed'; },
    r => { r.prepared.input.source.sha256 = '0'.repeat(64); },
    r => { r.prepared.input.targets[0].fields.pop(); },
    r => { r.sr_code.commit = '0'.repeat(40); },
  ]) { const r = structuredClone(x.receipt); edit(r); rehash(r); await assert.rejects(() => A.attachOffline(x.session, x.job.id, r)); assert.deepEqual(x.session.serialize(), before); }
});
test('session request binding rejects another version without partial mutation', async () => {
  const x = await make(), y = job(); y.session.registerSource({ id: 'brief', text: 'New evidence', replaces_version: 1 });
  const r = structuredClone(x.receipt); r.prepared.evidence_digest = '0'.repeat(64); rehash(r);
  const before = y.session.serialize(); await assert.rejects(() => A.attachOffline(y.session, y.job.id, r)); assert.deepEqual(y.session.serialize(), before);
});
test('live-labelled data cannot enter session/1', async () => {
  const x = await make(), r = structuredClone(x.receipt); r.original_sr_result.producer.mode = 'live'; rehash(r);
  await assert.rejects(() => A.attachOffline(x.session, x.job.id, r), /SR_REPLAY_MISMATCH/); assert.equal(x.session.view().reviews.length, 0);
});
test('unchanged c3 and correct control pass through real SR; gold is never review input', async () => {
  const gold = require('../diagnostic/gold.json');
  for (const c of require('./diagnostic.cjs').inputs()) {
    const p = A.prepare(c.request, { draftText: c.draftText });
    assert.equal(p.input.draft.text, fs.readFileSync(path.join(__dirname, '../diagnostic', c.name === 'c3-r1' ? 'c3-r1-proposal.json' : 'clear-proposal.json'), 'utf8'));
    assert(!JSON.stringify(p.input).includes(gold['c3-r1'].expected_question)); assert(!JSON.stringify(p.input).includes('expected_issue'));
    const r = await A.reviewRecorded(c.request, tapeFor(p, c.name === 'c3-r1' ? [{ target: 'assumption_test_day', field: 'type', classification: 'incorrect', sourceId: 'answer-new' }] : []), { draftText: c.draftText });
    assert.equal(r.original_sr_result.status, 'complete'); assert.equal(r.original_sr_result.stages.length, 3);
    assert.equal(r.result.status, c.name === 'c3-r1' ? 'partial' : 'complete');
    assert.equal(r.result.findings.length, c.name === 'c3-r1' ? 1 : 0);
    assert(!r.original_sr_result.stages[0].input.includes(gold['c3-r1'].expected_question));
    await A.verifyReceipt(r);
  }
});
test('saved diagnostic receipts reopen and replay all three actual SR stages', async () => {
  for (const name of ['c3-r1', 'clear']) {
    const receipt = await A.loadReceipt(path.join(__dirname, 'offline-records', `${name}.receipt.json`));
    assert.equal(receipt.sr_code.commit, 'e7308010ecbea1ebe46c3298aa6a96f06381ad0a');
    assert.deepEqual(receipt.original_sr_result.stages.map(s => s.stage), R.STAGES);
    assert.equal(receipt.original_sr_result.grounded.metadata.usage.apiCalls, 0);
  }
});
