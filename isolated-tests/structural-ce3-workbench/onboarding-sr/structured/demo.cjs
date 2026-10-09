'use strict';
const A = require('./adapter.cjs'), B = require('./bundle.cjs');
const { tapeFor } = require('./test-tape.cjs');
const { setup, correctedProposal, confirm } = require('../../onboarding-session/manual-example.cjs');
async function demonstrate() {
  const session = setup(), receipts = [], checkpoints = [];
  const take = label => checkpoints.push({ label, ...session.view().statuses });
  const first = session.requestReview('structured-first'), p1 = A.prepare(first.request);
  const r1 = await A.reviewRecorded(first.request, tapeFor(p1, [{ target: 'approval', field: 'type', classification: 'incorrect' }]));
  await A.attachOffline(session, first.id, r1); receipts.push({ job_id: first.id, receipt: r1 });
  const finding = r1.result.findings[0];
  session.addQuestions([A.customerQuestion(r1, first.id, finding.id, 'Är dag 2 ett mål, och kräver godkännande ett separat besked?', 'approval-question')]);
  confirm(session, 'early-confirmation'); take('Complete granskning med blockerande fynd och fråga');
  let blocked = false; try { session.createHandoff('premature'); } catch { blocked = true; }
  if (!blocked) throw new Error('BLOCKER_DID_NOT_BLOCK');
  session.answer({ id: 'clarification', question_id: 'approval-question', text: 'Dag 2 är ett mål. Godkännande kräver ett separat besked.', replaces_answer_id: null });
  take('Kundsvaret gör gammal granskning och bekräftelse inaktuella; fyndet kvarstår');
  session.submitProposal(correctedProposal(session.view()));
  const second = session.requestReview('structured-second'), p2 = A.prepare(second.request);
  const r2 = await A.reviewRecorded(second.request, tapeFor(p2));
  await A.attachOffline(session, second.id, r2); receipts.push({ job_id: second.id, receipt: r2 });
  session.handleFinding({ review_id: first.id, finding_id: finding.id, status: 'resolved', reason: 'Uttrycklig korrigering i version 2 och ny komplett offlinegranskning; ingen livekvalitet hävdas.', by: 'Syntetisk testgranskare' });
  confirm(session, 'current-confirmation');
  const handoff = session.createHandoff('separate-validation-only'); take('Redo för separat kompilering och validering; ingen CE3-körning');
  return { session, receipts, checkpoints, handoff, premature_handoff_rejected: blocked };
}
if (require.main === module) demonstrate().then(async d => {
  if (process.argv[2]) await B.save(process.argv[2], d.session, d.receipts);
  console.log(JSON.stringify({ mode: 'OFFLINE integration only; real SR code, scripted answers', external_ai_calls: 0, cost_usd: 0,
    checkpoints: d.checkpoints, handoff: d.handoff.status, premature_handoff_rejected: d.premature_handoff_rejected }, null, 2));
}).catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { demonstrate };
