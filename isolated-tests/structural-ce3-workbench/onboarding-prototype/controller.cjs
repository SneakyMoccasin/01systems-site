'use strict';
const fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');
const { Session } = require('../onboarding-session/v2/session.cjs');
const Archive = require('../onboarding-session/v2/archive.cjs');
const { tapeFor } = require('../onboarding-sr/structured/test-tape.cjs');
const { customerQuestion } = require('../onboarding-sr/structured/adapter.cjs');
const Scenario = require('./scenario.cjs');
const need = (v, code) => { if (!v) throw Error(code); };
const caseOf = s => s.view().id.split('_')[0];
const confirmationText = 'Jag bekräftar att sammanfattningen återger vår situation och de antaganden vi vill använda.';
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
  if (v.proposals.length && !v.statuses.pending_evidence && !(['misread', 'warehouseerror'].includes(caseOf(session)) && v.proposals.at(-1).items.find(i => i.id === 'approval').type === 'document_fact' && v.current_review)) return false;
  try { Scenario.proposal(v, caseOf(session)); return true; } catch { return false; }
}
function timingQuestion() {
  return { id: 'timing', equivalence_key: 'timing', text: 'Är dag 2 ett mål eller ett godkännande?', reasons: ['Ett mål visar vad ni hoppas uppnå. Driftstart måste fortfarande vänta på ansvarigs besked.'], target_ids: ['approval'], origins: [{ actor: 'ai', ref_id: 'approval' }], impact: 'blocks_handoff', priority: 1, status: 'open', answer_ids: [], merged_from: [], resolution: null };
}
function roleQuestion() {
  return { ...timingQuestion(), id: 'approver', equivalence_key: 'approver', text: 'Vem ska lämna godkännandet före driftstart?', reasons: ['Analysen behöver veta vems besked som uppfyller startvillkoret. Utan den uppgiften går det inte att bekräfta underlaget.'], target_ids: ['approver'], origins: [{ actor: 'ai', ref_id: 'approver' }] };
}
function questionFor(id) {
  if (id === 'warehousegap') return { ...timingQuestion(), id: 'start-condition', equivalence_key: 'start-condition', text: 'Måste beställarens klartecken komma innan ni börjar använda systemet?', reasons: ['Svaret avgör om klartecken ska vara ett villkor för starten. ”Vet inte ännu” lämnar villkoret öppet; då kan underlaget inte bekräftas ännu.'], target_ids: ['approval'] };
  if (id.startsWith('warehouse')) return { ...timingQuestion(), text: 'Vilken startdag vill ni använda som mål?', reasons: ['Tidsmålet ändras, men beställarens klartecken är fortfarande ett separat besked.'], target_ids: ['target-day'], origins: [{ actor: 'ai', ref_id: 'target-day' }] };
  return id === 'gap' ? roleQuestion() : timingQuestion();
}
function answersFor(id) {
  if (id === 'warehousegap') return Scenario.Warehouse.conditionAnswers;
  if (id.startsWith('warehouse')) return Scenario.Warehouse.timingAnswers;
  return id === 'gap' ? Scenario.roleAnswers : [Scenario.answer(2), Scenario.answer(3)];
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
      if (bad && caseOf(s) === 'unclear' && !v.questions.length) {
        const q = customerQuestion(archive.receipt, job.id, archive.receipt.result.findings[0].id, timingQuestion().text, 'timing');
        q.reasons = timingQuestion().reasons; s.addQuestions([q]);
      }
      if (caseOf(s) === 'gap' && !v.questions.some(q => q.id === 'approver')) s.addQuestions([roleQuestion()]);
      if (caseOf(s) === 'gap' && v.proposals.at(-1).items.find(i => i.id === 'approver').status === 'unknown' && v.answers.length) s.setQuestionStatus({ id: 'approver', status: 'deferred', reason: 'Kunden vet inte ännu. Godkännandeansvarig är fortsatt okänd och blockerar underlaget.' });
      if (caseOf(s) === 'warehousegap') {
        const q = questionFor(caseOf(s));
        if (!v.questions.some(x => x.id === q.id)) s.addQuestions([q]);
        if (v.answers.length && v.proposals.at(-1).items.find(i => i.id === 'approval').status === 'unknown') s.setQuestionStatus({ id: q.id, status: 'deferred', reason: 'Vet inte ännu: startvillkoret förblir okänt.' });
      }
      if (!bad) for (const r of v.reviews) for (const f of r.result.findings) {
        s.handleFinding({ review_id: r.id, finding_id: f.id, status: 'resolved', reason: 'Förskriven hantering: nytt uttryckligt förslag håller tidsmål och kontrollvillkor isär; ny strukturerad granskning täcker uppgiften.', by: 'Demonstrationsgranskare (förskrivet)' });
      }
      break;
    }
    case 'answer': {
      need(v.proposals.length && typeof command.text === 'string' && command.text.trim() && command.text.length <= 5000, 'ANSWER_REQUIRED');
      const q = questionFor(caseOf(s));
      if (!v.questions.some(x => x.id === q.id)) s.addQuestions([q]);
      const old = v.answers.filter(a => a.question_id === q.id).at(-1);
      s.answer({ id: `answer-${next}`, question_id: q.id, text: command.text, replaces_answer_id: old?.id ?? null }); break;
    }
    case 'correct': {
      need(['misread', 'warehouseerror'].includes(caseOf(s)) && v.current_review && v.proposals.at(-1).items.find(i => i.id === 'approval').type === 'document_fact', 'CORRECTION_NOT_AVAILABLE');
      return act(await act(s, { action: 'propose' }), { action: 'review' });
    }
    case 'update': return act(await act(s, { action: 'propose' }), { action: 'review' });
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
    case_id: caseOf(s), legacy: !caseOf(s).startsWith('warehouse'), answer_options: answersFor(caseOf(s)), question_template: questionFor(caseOf(s)),
    summary: Scenario.summary(p),
    changes: p && prev ? Scenario.summary(p).flatMap(field => { const old = Scenario.summary(prev).find(x => x.id === field.id); return old?.text === field.text ? [] : [{ field: field.id, label: field.label, before: old?.text ?? 'Inte angivet', after: field.text }]; }) : [],
    technical: s.serialize() };
}
// Snapshot storage only. Session/2 owns all versions, history and validation.
class Store {
  constructor(root) { this.root = path.resolve(root); fs.mkdirSync(this.root, { recursive: true, mode: 0o700 }); }
  directory(id) { need(/^(unclear|clear|misread|gap|warehouse|warehouseerror|warehousegap)_[a-f0-9-]{36}$/.test(id), 'SESSION_ID'); return path.join(this.root, id); }
  versions(id) { return fs.readdirSync(this.directory(id)).filter(n => /^\d{6}\.json$/.test(n)).sort(); }
  load(id, snapshot) {
    const names = this.versions(id), name = snapshot ?? names.at(-1); need(names.includes(name), 'SNAPSHOT_NOT_FOUND');
    return { session: Session.load(path.join(this.directory(id), name)), snapshot: name, latest: name === names.at(-1), snapshots: names };
  }
  save(s) {
    const id = s.view().id, dir = this.directory(id); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const snapshot = `${String(this.versions(id).length + 1).padStart(6, '0')}.json`; s.save(path.join(dir, snapshot)); return this.open(id);
  }
  open(id, snapshot) {
    const saved = this.load(id, snapshot);
    const labels = { register_source: 'Underlag sparat', submit_proposal: 'Förslag uppdaterat', receive_structured_review: 'Granskning sparad', answer: 'Komplettering sparad', disposition: 'Feltolkning hanterad', question_status: 'Okänd uppgift bevarad', add_questions: 'Fråga tillagd', handoff_structured: 'Underlag bekräftat' };
    let previousCount = 0;
    const history = saved.snapshots.map(name => {
      const file = path.join(this.directory(id), name), at = fs.statSync(file).mtime.toISOString();
      let log;
      try { log = JSON.parse(fs.readFileSync(file, 'utf8')); need(Array.isArray(log.events), 'INVALID_HISTORY'); }
      catch { return { snapshot: name, at, label: 'Skadad kopia – kan inte läsas' }; }
      const added = log.events.slice(previousCount); previousCount = log.events.length;
      const ops = added.map(e => e.op);
      const label = !added.length ? 'Extra sparad kopia' : ops.includes('submit_proposal') && ops.includes('receive_structured_review') ? 'Förslag uppdaterat och granskat' : labels[added.at(-1).op] ?? 'Sessionssteg sparat';
      return { snapshot: name, at, label };
    });
    return { ...describe(saved.session), id, snapshot: saved.snapshot, latest: saved.latest, snapshots: saved.snapshots, history };
  }
  async dispatch(c) {
    if (c.action === 'list') return { cases: Scenario.cases.filter(c => !c.legacy), role_answers: Scenario.roleAnswers, answers: [Scenario.answer(2), Scenario.answer(3)], sessions: fs.readdirSync(this.root).filter(n => /^(unclear|clear|misread|gap|warehouse|warehouseerror|warehousegap)_[a-f0-9-]{36}$/.test(n)).map(id => {
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
