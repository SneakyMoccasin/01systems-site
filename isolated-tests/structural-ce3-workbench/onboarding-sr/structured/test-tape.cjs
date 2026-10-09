'use strict';
// Explicit, scripted integration fixtures. No inference, detection or gold-file reader.
const { loadSR, STAGES } = require('./runtime.cjs');
function tapeFor(prepared, problems = [], options = {}) {
  const sr = loadSR(options.srRoot), manifest = sr.contracts.prepare(prepared.input);
  const claims = manifest.fields.map((f, i) => ({ id: `claim-${i}`, targetId: f.targetId, fieldId: f.fieldId,
    statement: `TEST DOUBLE: requested ${f.role} field`, quote: { exactText: f.quote, occurrenceIndex: 0 } }));
  const assessments = claims.map((c, i) => {
    const scripted = problems.find(p => p.target === c.targetId && p.field === c.fieldId) ?? {};
    const source = prepared.request.snapshot.sources.find(s => s.id === scripted.sourceId) ?? prepared.request.snapshot.sources[0];
    const quote = { exactText: source.content, occurrenceIndex: 0 };
    return { id: `assessment-${i}`, claimId: c.id, targetId: c.targetId, fieldId: c.fieldId, claimQuote: c.quote,
      outcome: scripted.support ?? 'supported', explanation: scripted.explanation ?? 'TEST DOUBLE: prescribed source-support judgment; not AI detection.', sourceQuotes: [quote],
      classification: { outcome: scripted.classification ?? 'correct', explanation: scripted.explanation ?? 'TEST DOUBLE: prescribed classification judgment; not AI detection.', sourceQuotes: [quote] },
      recommendedAction: 'TEST DOUBLE: separate human review.', confidence: 0.5 };
  });
  const findings = assessments.filter(a => a.outcome !== 'supported' || a.classification.outcome !== 'correct').map((a, i) => ({
    id: `finding-${i}`, assessmentIds: [a.id], title: 'TEST DOUBLE: field judgment', explanation: 'Prescribed integration fixture; not detected by AI.', recommendedAction: a.recommendedAction, confidence: 0.5,
  }));
  return { label: 'SYNTHETIC TEST DOUBLE — NOT AI DETECTION', steps: [
    { stage: STAGES[0], data: { binding: structuredClone(manifest.binding), claims } },
    { stage: STAGES[1], data: { binding: structuredClone(manifest.binding), assessments } },
    { stage: STAGES[2], data: { binding: structuredClone(manifest.binding), findings, summary: { overview: 'TEST DOUBLE ONLY', supported: 'Prescribed answers', nextStep: 'No quality conclusion' } } },
  ] };
}
module.exports = { tapeFor };
