'use strict';
const fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');
const { Session } = require('../onboarding-session/v2/session.cjs');
const Archive = require('../onboarding-session/v2/archive.cjs');
const { tapeFor } = require('../onboarding-sr/structured/test-tape.cjs');
const { customerQuestion } = require('../onboarding-sr/structured/adapter.cjs');
const Scenario = require('./scenario.cjs');
const need = (v, code) => { if (!v) throw Error(code); };
const caseOf = s => s.view().id.split('_')[0];
const confirmationText = 'Jag bekräftar detta förslag, underlag och granskning. Tidsmålet är ingen garanti. Kostnad och faktisk godkännandetid är okända och ingår inte. Detta är inte en validerad eller körd CE3-modell.';
function confirm(session, by, suffix) {
  const v = session.view();
  session.confirm({ id: `confirmation-${suffix}`, proposal_digest: v.proposal_digest, evidence_digest: v.evidence_digest, context_digest: v.context_digest, review_binding: v.current_review?.binding, by, text: confirmationText, scope_acknowledged: true });
}
// Reuse the real handoff gate on a disposable session; do not duplicate its rules.
function gate(session) {
  try {
    const trial = Session.restore(session.serialize()), suffix = `probe-${trial.serialize().events.length}`;
    confirm(trial, 'Offline kontroll av godkännandegrinden', suffix);
    trial.createHandoff(`handoff-${suffix}`);
    return { allowed: true, code: null };
  } catch (error) { return { allowed: false, code: error.message }; }
}
function canPropose(session) {
  const v = session.view();
  if (v.proposals.length && !v.statuses.pending_evidence) return false;
  try { Scenario.proposal(v, caseOf(session)); return true; } catch { return false; }
}
function timingQuestion() {
  return { id: 'timing', equivalence_key: 'timing', text: 'Är dag 2 ett mål eller ett godkännande?', reasons: ['Ett mål visar vad ni hoppas uppnå. Driftstart måste fortfarande vänta på ansvarigs besked.'], target_ids: ['approval'], origins: [{ actor: 'ai', ref_id: 'approval' }], impact: 'blocks_handoff', priority: 1, status: 'open', answer_ids: [], merged_from: [], resolution: null };
}
async function act(session, command) {
  // All mutations operate on an isolated clone and publish only on success.
  const s = Session.restore(session.serialize()), v = s.view(), next = s.serialize().events.length + 1;
  switch (command.action) {
    case 'propose': need(canPropose(s), 'UNSCRIPTED_INPUT'); s.submitProposal(Scenario.proposal(v, caseOf(s))); break;
    case 'review': {
      need(v.proposals.length && !v.statuses.pending_evidence && v.statuses.review !== 'current', 'REVIEW_NOT_AVAILABLE');
      const job = s.requestReview(`review-${next}`), bad = v.proposals.at(-1).items.find(i => i.id === 'approval').type === 'document_fact';
      const archive = await Archive.recorded(job.prepared, tapeFor(job.prepared, bad ? [{ target: 'approval', field: 'type', classification: 'incorrect', explanation: 'FÖRSKRIVET DEMOFYND: ett försiktigt mål visar inte att ett godkännande har lämnats.' }] : []));
      await s.receiveReview(job.id, archive);
      if (bad && !v.questions.length) {
        const q = customerQuestion(archive.receipt, job.id, archive.receipt.result.findings[0].id, timingQuestion().text, 'timing');
        q.reasons = timingQuestion().reasons; s.addQuestions([q]);
      }
      if (!bad) for (const r of v.reviews) for (const f of r.result.findings) {
        s.handleFinding({ review_id: r.id, finding_id: f.id, status: 'resolved', reason: 'Förskriven hantering: nytt uttryckligt förslag håller tidsmål och kontrollvillkor isär; ny strukturerad granskning täcker uppgiften.', by: 'Demonstrationsgranskare (förskrivet)' });
      }
      break;
    }
    case 'answer': {
      need(v.proposals.length && typeof command.text === 'string' && command.text.trim() && command.text.length <= 5000, 'ANSWER_REQUIRED');
      if (!v.questions.some(q => q.id === 'timing')) s.addQuestions([timingQuestion()]);
      const old = v.answers.at(-1);
      s.answer({ id: `answer-${next}`, question_id: 'timing', text: command.text, replaces_answer_id: old?.id ?? null }); break;
    }
    case 'confirm': {
      need(command.acknowledged === true && typeof command.by === 'string' && command.by.trim() && command.by.length <= 100, 'ACKNOWLEDGEMENT_REQUIRED');
      need(gate(s).allowed, 'CONFIRMATION_BLOCKED');
      confirm(s, command.by.trim(), next); s.createHandoff(`handoff-${next}`); break;
    }
    case 'save': break;
    default: throw Error('UNKNOWN_ACTION');
  }
  return s;
}
function create(caseId, question, situation) {
  need(Scenario.cases.some(c => c.id === caseId), 'UNKNOWN_CASE');
  need([question, situation].every(s => typeof s === 'string' && s.trim() && s.length <= 5000), 'INPUT_REQUIRED');
  const s = new Session(`${caseId}_${randomUUID()}`);
  s.registerSource({ id: 'question', text: question, replaces_version: null });
  s.registerSource({ id: 'situation', text: situation, replaces_version: null }); return s;
}
function describe(s) {
  const v = s.view(), p = v.proposals.at(-1), prev = v.proposals.at(-2);
  return { view: v, checksum: s.serialize().checksum, can_propose: canPropose(s), gate: gate(s), confirmation_text: confirmationText,
    changes: p && prev ? p.items.filter(i => JSON.stringify(i) !== JSON.stringify(prev.items.find(x => x.id === i.id))).map(i => ({ before: prev.items.find(x => x.id === i.id)?.statement ?? 'Saknades', after: i.statement })) : [],
    technical: s.serialize() };
}
// Snapshot storage only. Session/2 owns all versions, history and validation.
class Store {
  constructor(root) { this.root = path.resolve(root); fs.mkdirSync(this.root, { recursive: true, mode: 0o700 }); }
  directory(id) { need(/^(unclear|clear)_[a-f0-9-]{36}$/.test(id), 'SESSION_ID'); return path.join(this.root, id); }
  versions(id) { return fs.readdirSync(this.directory(id)).filter(n => /^\d{6}\.json$/.test(n)).sort(); }
  load(id, snapshot) {
    const names = this.versions(id), name = snapshot ?? names.at(-1); need(names.includes(name), 'SNAPSHOT_NOT_FOUND');
    return { session: Session.load(path.join(this.directory(id), name)), snapshot: name, latest: name === names.at(-1), snapshots: names };
  }
  save(s) {
    const id = s.view().id, dir = this.directory(id); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const snapshot = `${String(this.versions(id).length + 1).padStart(6, '0')}.json`; s.save(path.join(dir, snapshot)); return this.open(id);
  }
  open(id, snapshot) { const saved = this.load(id, snapshot); return { ...describe(saved.session), id, snapshot: saved.snapshot, latest: saved.latest, snapshots: saved.snapshots }; }
  async dispatch(c) {
    if (c.action === 'list') return { cases: Scenario.cases, answers: [Scenario.answer(2), Scenario.answer(3)], sessions: fs.readdirSync(this.root).filter(n => /^(unclear|clear)_[a-f0-9-]{36}$/.test(n)).map(id => {
      const { session, snapshot } = this.load(id), v = session.view(); return { id, snapshot, title: Scenario.cases.find(x => x.id === caseOf(session)).title, revision: v.proposals.at(-1)?.revision ?? 0 };
    }) };
    if (c.action === 'create') return this.save(create(c.case_id, c.question, c.situation));
    if (c.action === 'open') return this.open(c.id, c.snapshot);
    const old = this.load(c.id); need(c.snapshot === old.snapshot && c.checksum === old.session.serialize().checksum, 'STALE_SCREEN');
    return this.save(await act(old.session, c));
  }
}
if (require.main === module) {
  // This process cannot use any network provider, even through an accidental import.
  global.fetch = () => { throw Error('OFFLINE_ONLY'); };
  for (const name of ['node:http', 'node:https']) { const m = require(name); m.request = m.get = () => { throw Error('OFFLINE_ONLY'); }; }
  const net = require('node:net'); net.connect = net.createConnection = () => { throw Error('OFFLINE_ONLY'); };
  let input = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', s => { input += s; });
  process.stdin.on('end', async () => {
    try { console.log(JSON.stringify(await new Store(process.argv[2]).dispatch(JSON.parse(input)))); }
    catch (e) { console.log(JSON.stringify({ error: e.message })); process.exitCode = 1; }
  });
}
module.exports = { create, act, gate, describe, Store };
