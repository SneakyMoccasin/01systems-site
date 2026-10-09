'use strict';
const fs = require('node:fs');
const C = require('../../contracts/onboarding-v1/contract.cjs');
const legacy = require('../adapter.cjs');
const { loadSR, runRecorded, replayComparable } = require('./runtime.cjs');
const need = (ok, code) => { if (!ok) throw new Error(code); };
const same = (a, b) => C.digest(a) === C.digest(b);
const ADAPTER = 'ce3-structured-sr-offline/1';
const ITEM_FIELDS = [['statement', 'text'], ['type', 'type'], ['status', 'status'], ['value', 'value'], ['scenario_choice', 'scenario_choice'], ['depends_on', 'dependencies'], ['refs', 'source_support']];
const fields = entries => entries.map(([fieldId, role]) => ({ fieldId, role, path: `/${fieldId}` }));
function registry(proposal) {
  return [
    ...proposal.items.map((item, i) => ({ targetId: item.id, kind: 'item', path: `/items/${i}`, fields: fields(ITEM_FIELDS) })),
    { targetId: 'context:analysis', kind: 'analysis', path: '/analysis', fields: fields([['kind', 'type'], ['question', 'text'], ['plan_ids', 'dependencies'], ['criterion_ids', 'dependencies'], ['changed_assumption_ids', 'dependencies']]) },
    { targetId: 'context:scope', kind: 'scope', path: '/scope', fields: fields([['includes', 'text'], ['excludes', 'text']]) },
    ...proposal.gaps.map((gap, i) => ({ targetId: gap.id, kind: 'gap', path: `/gaps/${i}`, fields: fields([['kind', 'type'], ['status', 'status'], ['impact', 'type'], ['explanation', 'text'], ['item_ids', 'dependencies'], ['resolution', 'text']]) })),
  ];
}
function prepare(request, options = {}) {
  const sr = loadSR(options.srRoot), base = legacy.prepare(request);
  const draftText = options.draftText ?? JSON.stringify(request.snapshot, null, 2) + '\n';
  need(same(JSON.parse(draftText), request.snapshot), 'DRAFT_BYTES_DO_NOT_MATCH_SNAPSHOT');
  const targets = registry(request.snapshot), evidenceDigest = base.evidence_digest;
  const input = {
    contractVersion: 'structured-grounded/1', classificationContract: 'ce3-onboarding-proposal/1',
    requestId: `ce3-${C.digest(request)}`, source: { id: 'ce3-evidence', version: evidenceDigest, text: base.input.sourceMaterial, sha256: C.hash(base.input.sourceMaterial) },
    draft: { id: request.snapshot.id, version: String(request.snapshot.revision), text: draftText, sha256: C.hash(draftText) },
    question: 'Granska varje begärt fälts innehåll och klassificering mot originalunderlaget och onboardingkontraktets betydelser. Bevara rättelser, osäkerhet och avgränsningar. Granskningen är inte CE3-validering eller körning.',
    targets, registrySha256: sr.contracts.sha256(sr.contracts.canonical(targets)),
  };
  const manifest = sr.contracts.prepare(input); // Real SR validates registry, identity, bytes and limits.
  const payload = { schema_version: 'ce3-structured-sr-prepared/1', request: structuredClone(request), model_digest: request.proposal_digest,
    evidence_digest: evidenceDigest, input, binding: manifest.binding, fields: manifest.fields, source_spans: base.sources, contract: base.contract, sr_code: sr.identity };
  return { ...payload, digest: C.digest(payload) };
}
function assertPrepared(prepared, options) {
  need(same(prepared, prepare(prepared.request, { ...options, draftText: prepared.input.draft.text })), 'PREPARED_CHANGED');
}
function translate(prepared, srResult, options = {}) {
  assertPrepared(prepared, options);
  const sr = loadSR(options.srRoot), proposal = prepared.request.snapshot;
  need(srResult.contractVersion === 'structured-grounded/1' && same(srResult.binding, prepared.binding) && same(srResult.request, prepared.input), 'SR_RESULT_BINDING');
  need(srResult.producer.mode === 'mock' && srResult.producer.name === 'ce3-structured-sr-test-double', 'LIVE_SESSION_NOT_ENABLED');
  const activeIds = new Set(C.active(proposal).map(i => i.id)), findings = [], mappings = [], unmapped = [], limitations = [];
  if (srResult.status !== 'complete') limitations.push(`SR-status: ${srResult.status}; fälttäckning ${srResult.fieldCoverage.status}; fyndredovisning ${srResult.findingReporting.status}.`);
  if (!prepared.contract.valid) limitations.push(`Kontraktsogiltigt utkast bevarat för diagnostik: ${prepared.contract.error}`);
  const rows = srResult.fieldCoverage.fields;
  const assessed = srResult.status === 'failed' ? [] : [...activeIds].filter(id => ITEM_FIELDS.every(([field]) => rows.some(r => r.targetId === id && r.fieldId === field && r.status === 'assessed')));
  const sourceRefs = quotes => quotes.map(q => {
    const ref = sr.resolveExactReference(prepared.input.source.text, q.exactText, q.occurrenceIndex);
    const spans = prepared.source_spans.filter(s => ref.startOffset >= s.start && ref.endOffset <= s.end);
    if (spans.length !== 1) return null;
    const s = spans[0]; return { source_id: s.id, source_version: s.version, quote: ref.exactText, start: ref.startOffset - s.start, end: ref.endOffset - s.start, location: null };
  });
  for (const [index, assessment] of srResult.assessments.entries()) {
    const row = rows.find(r => r.assessmentId === assessment.id && r.status === 'assessed');
    const originalFindingIds = (srResult.grounded?.findings ?? []).filter(f => f.assessmentIds.includes(assessment.id)).map(f => f.id);
    const dimensions = [];
    if (assessment.outcome !== 'supported') dimensions.push({ dimension: 'support', outcome: assessment.outcome, explanation: assessment.explanation, quotes: assessment.sourceQuotes });
    if (assessment.classification.outcome !== 'correct') dimensions.push({ dimension: 'classification', ...assessment.classification, quotes: assessment.classification.sourceQuotes });
    for (const d of dimensions) {
      const refs = sourceRefs(d.quotes), target = prepared.input.targets.find(t => t.targetId === assessment.targetId);
      const canMap = row && target?.kind === 'item' && activeIds.has(assessment.targetId) && refs.every(Boolean);
      const mapping = { assessment_id: assessment.id, target_id: assessment.targetId, field_id: assessment.fieldId, dimension: d.dimension,
        original_outcome: d.outcome, original_finding_ids: originalFindingIds, origin: originalFindingIds.length ? 'sr_finding_and_assessment' : 'sr_assessment_without_final_finding',
        ce3_finding_id: canMap ? `srf-${index + 1}-${d.dimension}` : null };
      mappings.push(mapping);
      if (!canMap) { unmapped.push({ ...mapping, reason: !row ? 'field_not_assessed' : target?.kind !== 'item' ? 'context_target_not_representable_in_review_1' : !activeIds.has(assessment.targetId) ? 'historical_item_not_active' : 'source_quote_not_inside_one_source' }); continue; }
      const category = d.dimension === 'classification' && d.outcome === 'incorrect' ? 'meaning_shift' : d.outcome === 'contradicted' ? 'contradiction' : d.outcome === 'unsupported' ? 'unsupported' : 'hypothesis';
      const basis = ['meaning_shift', 'contradiction'].includes(category) ? 'evidence' : category === 'unsupported' ? 'absence_in_supplied_material' : 'review_hypothesis';
      findings.push({ id: mapping.ce3_finding_id, target_ids: [assessment.targetId], category, basis, refs,
        searched_source_ids: [...new Set(proposal.sources.map(s => s.id))],
        explanation: `SR ${assessment.id}, ${assessment.fieldId}, ${d.dimension}=${d.outcome}: ${d.explanation}`,
        suggested_question: null, impact: 'blocks_handoff' });
    }
  }
  if (unmapped.length) limitations.push(`${unmapped.length} relevanta fältbedömningar saknar förlustfri CE3-koppling; se unmapped i granskningsunderlaget.`);
  if (assessed.length !== activeIds.size) limitations.push('Alla aktiva uppgifter har inte sju uttryckligt bedömda registerfält.');
  const status = srResult.status === 'failed' ? 'failed' : srResult.status === 'partial' || limitations.length ? 'partial' : 'complete';
  const result = { status, assessed_item_ids: assessed, findings, limitations, producer: { mode: 'synthetic', adapter: ADAPTER, model: null, prompt_version: 'SR-structured-grounded/1;CE3-registry/1' } };
  C.schema('review', { schema_version: 'ce3-onboarding-review/1', id: 'adapter-check', request: prepared.request, result });
  return { result, mappings, unmapped, field_coverage: structuredClone(srResult.fieldCoverage), finding_reporting: structuredClone(srResult.findingReporting) };
}
async function reviewRecorded(request, script, options = {}) {
  const prepared = prepare(request, options), execution = await runRecorded(prepared.input, script, options);
  const payload = { schema_version: 'ce3-structured-sr-receipt/1', prepared, sr_code: execution.sr_code, original_sr_result: execution.original,
    test_tape: structuredClone(script), ...translate(prepared, execution.original, options) };
  return { ...payload, digest: C.digest(payload) };
}
async function verifyReceipt(receipt, options = {}) {
  need(receipt.schema_version === 'ce3-structured-sr-receipt/1', 'RECEIPT_VERSION');
  const { digest, ...payload } = receipt;
  need(digest === C.digest(payload), 'RECEIPT_CHANGED');
  assertPrepared(receipt.prepared, options);
  const replay = await runRecorded(receipt.prepared.input, receipt.test_tape, options);
  need(same(receipt.sr_code, replay.sr_code), 'SR_CODE_IDENTITY_CHANGED');
  need(same(replayComparable(receipt.original_sr_result), replayComparable(replay.original)), 'SR_REPLAY_MISMATCH');
  const expected = translate(receipt.prepared, replay.original, options);
  for (const key of Object.keys(expected)) need(same(receipt[key], expected[key]), `TRANSLATION_CHANGED: ${key}`);
  return receipt;
}
async function saveReceipt(file, receipt, options = {}) {
  receipt = structuredClone(receipt);
  await verifyReceipt(receipt, options);
  const fd = fs.openSync(file, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(receipt, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
async function loadReceipt(file, options = {}) { const r = JSON.parse(fs.readFileSync(file, 'utf8')); await verifyReceipt(r, options); return r; }
async function attachOffline(session, jobId, receipt, options = {}) {
  receipt = structuredClone(receipt);
  await verifyReceipt(receipt, options);
  const job = session.view().requests.find(j => j.id === jobId);
  need(job && same(job.request, receipt.prepared.request) && job.evidence_digest === receipt.prepared.evidence_digest, 'SESSION_BINDING');
  return session.completeReview(jobId, receipt.result);
}
function customerQuestion(receipt, jobId, findingId, text, id) {
  const { digest, ...payload } = receipt;
  need(digest === C.digest(payload), 'RECEIPT_CHANGED');
  const finding = receipt.result.findings.find(f => f.id === findingId);
  need(finding && typeof text === 'string' && text.trim(), 'EXPLICIT_MAPPED_QUESTION_REQUIRED');
  return { id, equivalence_key: `${jobId}-${findingId}`, text, reasons: [finding.explanation], target_ids: structuredClone(finding.target_ids),
    origins: [{ actor: 'sr', ref_id: `${jobId}/${findingId}` }], impact: finding.impact, priority: 1, status: 'open', answer_ids: [], merged_from: [], resolution: null };
}
module.exports = { ADAPTER, ITEM_FIELDS, registry, prepare, translate, reviewRecorded, verifyReceipt, saveReceipt, loadReceipt, attachOffline, customerQuestion };
