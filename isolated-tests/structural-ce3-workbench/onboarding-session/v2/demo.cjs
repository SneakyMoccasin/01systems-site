'use strict';
const { Session } = require('./session.cjs'), Archive = require('./archive.cjs');
const { original, firstProposal, correctedProposal } = require('../manual-example.cjs');
const { tapeFor } = require('../../onboarding-sr/structured/test-tape.cjs');
const { customerQuestion } = require('../../onboarding-sr/structured/adapter.cjs');
function setup() {
  const session = new Session('synthetic-session-v2');
  session.registerSource({ id: 'brief', text: original, replaces_version: null });
  session.submitProposal(firstProposal(session.view().sources)); return session;
}
function confirm(session, id) {
  const v = session.view(); return session.confirm({ id, proposal_digest: v.proposal_digest, evidence_digest: v.evidence_digest,
    context_digest: v.context_digest, review_binding: v.current_review.binding, by: 'Syntetisk testkund', text: 'Jag bekräftar exakt detta utkast och granskningsunderlag. Ingen CE3-körning.', scope_acknowledged: true });
}
async function demonstrate() {
  const session = setup(), checkpoints = [];
  const take = label => checkpoints.push({ label, ...session.view().statuses });
  const first = session.requestReview('first');
  const a1 = await Archive.recorded(first.prepared, tapeFor(first.prepared, [{ target: 'approval', field: 'type', classification: 'incorrect' }]));
  await session.receiveReview(first.id, a1);
  const f = a1.receipt.result.findings[0];
  session.addQuestions([customerQuestion(a1.receipt, first.id, f.id, 'Är dag 2 ett mål, och kräver godkännande ett separat besked?', 'q')]);
  confirm(session, 'early'); take('Fullständig granskning men blockerande fynd och fråga');
  let blocked = false; try { session.createHandoff('too-early'); } catch { blocked = true; }
  if (!blocked) throw new Error('BLOCKER_DID_NOT_BLOCK');
  session.answer({ id: 'clarification', question_id: 'q', text: 'Dag 2 är ett mål. Godkännande kräver ett separat besked.', replaces_answer_id: null });
  take('Kundsvaret gör tidigare granskning och bekräftelse inaktuella; fyndet kvarstår');
  session.submitProposal(correctedProposal(session.view()));
  const second = session.requestReview('second');
  const a2 = await Archive.recorded(second.prepared, tapeFor(second.prepared));
  await session.receiveReview(second.id, a2);
  session.handleFinding({ review_id: first.id, finding_id: f.id, status: 'resolved', reason: 'Uttryckligt uppdaterat förslag och relevant ny strukturerad offlinegranskning.', by: 'Syntetisk testgranskare' });
  confirm(session, 'current');
  const handoff = session.createHandoff('separate-validation'); take('Aktuell versionsbunden bekräftelse; redo för separat validering');
  return { session, checkpoints, handoff, premature_handoff_rejected: blocked };
}
if (require.main === module) demonstrate().then(d => {
  if (process.argv[2]) d.session.save(process.argv[2]);
  console.log(JSON.stringify({ mode: 'OFFLINE: scripted responses through real SR; not quality evidence', external_ai_calls: 0, cost_usd: 0,
    checkpoints: d.checkpoints, handoff: d.handoff.status, session_version: d.session.serialize().schema_version }, null, 2));
}).catch(e => { console.error(e.stack); process.exitCode = 1; });
module.exports = { setup, confirm, demonstrate };
