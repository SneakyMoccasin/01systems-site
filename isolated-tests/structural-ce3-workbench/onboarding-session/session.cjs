"use strict";
// Local, manual onboarding only. No model interpretation, network, compiler or CE runtime.
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const Ajv = require("ajv");
const C = require("../contracts/onboarding-v1/contract.cjs");
const ajv = new Ajv({ allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
for (const name of ["proposal", "review", "dialogue", "handoff"]) {
  ajv.addSchema(require(`../contracts/onboarding-v1/schemas/${name}.schema.json`));
}
const questionSchema = ajv.compile({ $ref: "urn:ce3:onboarding:dialogue:1#/properties/questions/items" });
const logSchema = ajv.compile(require("./session.schema.json"));
const transferSchema = ajv.compile(require("./transfer.schema.json"));
const copy = x => structuredClone(x);
const same = (a, b) => C.digest(a) === C.digest(b);
const need = (ok, message) => { if (!ok) throw new Error(message); };
const text = x => need(typeof x === "string" && x.trim().length > 0, "Text måste vara angiven.");
const id = x => need(typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(x), "ID måste vara stabilt, utan sökvägsseparatorer.");
function keys(value, expected) {
  need(value && typeof value === "object" && !Array.isArray(value) && same(Object.keys(value).sort(), [...expected].sort()), "Felaktiga kommandofält.");
}
function manualSource(sourceId, version, content, kind) {
  id(sourceId); text(content);
  return { id: sourceId, version, kind, original_ref: `manual:${sourceId}@${version}`, original_sha256: C.hash(content), extraction: "complete", content, content_sha256: C.hash(content), extraction_note: null, trust: "data_only" };
}
const current = s => s.proposals.at(-1) ?? null;
const evidenceDigest = s => C.digest(s.sources);
const aligned = s => current(s) !== null && same(current(s).sources, s.sources);
const findingKey = d => `${d.review_id}/${d.finding_id}`;
function effectiveDispositions(s) {
  const latest = new Map(s.dispositions.map(d => [findingKey(d), d]));
  return [...latest.values()].map(d => {
    const { proposal_digest, evidence_digest, ...value } = d;
    // A resolution on an older context is retained in history but must be reconsidered.
    if (value.status === "resolved" && (!current(s) || proposal_digest !== C.digest(current(s)) || evidence_digest !== evidenceDigest(s))) {
      return { ...value, status: "accepted", reason: `Tidigare åtgärd behöver omprövas efter ändring. ${value.reason}` };
    }
    return value;
  });
}
function contextDigest(s) {
  return C.digest({ proposal: current(s), evidence: s.sources, requests: s.requests, reviews: s.reviews, questions: s.questions, answers: s.answers, dispositions: effectiveDispositions(s) });
}
function statuses(s) {
  const p = current(s), conf = s.confirmations.at(-1);
  return {
    review: !p ? "not_requested" : !aligned(s) ? "stale" : C.reviewStatus(p, s.reviews),
    confirmation: !conf ? "not_requested" : aligned(s) && conf.context_digest === contextDigest(s) ? "confirmed" : "stale",
    pending_evidence: !p ? s.sources.length > 0 : !aligned(s),
  };
}
function emptyConfirmation() {
  return { status: "not_requested", proposal_digest: null, item_ids: [], scope_acknowledged: false, by: null, record: null };
}
function packet(s, proposal = current(s), bare = false) {
  need(proposal, "Inget modellförslag registrerat.");
  const digest = C.digest(proposal), last = s.confirmations.at(-1);
  const dispositions = bare ? [] : effectiveDispositions(s);
  const questions = bare ? [] : s.questions, answers = bare ? [] : s.answers;
  const unresolved = s.reviews.flatMap(r => r.result.findings.filter(f => {
    const d = dispositions.find(d => d.review_id === r.id && d.finding_id === f.id);
    return !d || ["open", "accepted"].includes(d.status);
  }).map(f => `${r.id}/${f.id}`));
  const confirmation = bare || !last ? emptyConfirmation() : { ...copy(last.confirmation), status: last.confirmation.proposal_digest === digest ? "confirmed" : "stale" };
  return { proposal: copy(proposal), reviews: copy(s.reviews), dialogue: { schema_version: "ce3-onboarding-dialogue/1", proposal_digest: digest, questions: copy(questions), answers: copy(answers) }, handoff: { schema_version: "ce3-onboarding-handoff/1", proposal_digest: digest, review_status: C.reviewStatus(proposal, s.reviews), dispositions, confirmation, dialogue_status: "active", summary: "Sessionsunderlag; CE3 är inte kompilerad, validerad eller körd.", unresolved_question_ids: questions.filter(q => ["open", "deferred"].includes(q.status)).map(q => q.id), unresolved_finding_ids: unresolved, readiness: "not_assessed", ce3_validation_status: "not_run", ce3_run_status: "not_run" } };
}
function checkQuestion(s, q) {
  need(questionSchema(q), `Ogiltig fråga: ${ajv.errorsText(questionSchema.errors)}`);
  id(q.id);
  const p = current(s); need(p, "Frågor kräver ett modellförslag.");
  for (const target of q.target_ids) need(p.items.some(i => i.id === target), "Frågan saknar modellkoppling.");
  for (const origin of q.origins) {
    const valid = origin.actor === "sr" ? s.reviews.some(r => r.result.findings.some(f => `${r.id}/${f.id}` === origin.ref_id))
      : origin.actor === "ai" ? [...p.items, ...p.gaps].some(i => i.id === origin.ref_id)
      : s.sources.some(x => x.kind === "answer" && x.id === origin.ref_id);
    need(valid, "Frågans ursprung saknas.");
  }
}
function checkState(s) {
  for (const q of s.questions) checkQuestion(s, q);
  if (aligned(s)) C.validatePacket(packet(s));
}
function transfer(s, transferId) {
  need(s.lifecycle === "active", "Sessionen är inte aktiv.");
  const status = statuses(s);
  need(aligned(s), "Nytt underlag kräver ett uttryckligt uppdaterat modellförslag.");
  need(status.review === "current", "Aktuell granskning saknas.");
  need(status.confirmation === "confirmed", "Aktuell kundbekräftelse saknas.");
  // Unanswered review requests may still introduce blockers: do not export early.
  need(!s.requests.some(j => !s.reviews.some(r => r.id === j.id)), "En granskningsbegäran väntar fortfarande på svar.");
  const p = packet(s);
  p.handoff.dialogue_status = "ready_for_translation";
  p.handoff.readiness = "candidate_for_validation";
  C.validatePacket(p);
  const review = [...s.reviews].reverse().find(r => r.request.proposal_digest === C.digest(p.proposal) && r.result.status === "complete");
  const conf = s.confirmations.at(-1);
  return { schema_version: "ce3-onboarding-transfer/1", id: transferId, session_id: s.id, status: "ready_for_separate_compilation_and_validation", context_digest: contextDigest(s), model: { id: p.proposal.id, revision: p.proposal.revision, digest: C.digest(p.proposal) }, evidence: { digest: evidenceDigest(s), sources: s.sources.map(x => ({ id: x.id, version: x.version, original_sha256: x.original_sha256, content_sha256: x.content_sha256 })) }, review: { id: review.id, digest: C.digest(review), assessed_item_ids: copy(review.result.assessed_item_ids), limitations: copy(review.result.limitations), producer: copy(review.result.producer) }, confirmation: copy(conf), limitations: p.proposal.gaps.filter(g => g.status === "accepted_limit"), assumptions: C.active(p.proposal).filter(i => i.kind === "assumption" || i.type === "scenario_assumption"), scope: copy(p.proposal.scope), packet: p };
}
function apply(s, op, a) {
  need(s.lifecycle !== "closed_no_analysis", "Avslutad session utan analysbehov.");
  switch (op) {
    case "register_source": {
      keys(a, ["id", "text", "replaces_version"]); id(a.id);
      const old = s.sources.filter(x => x.id === a.id).at(-1);
      need(old ? old.kind === "document" && a.replaces_version === old.version : a.replaces_version === null, "Källrättelsen måste ange senaste tidigare version.");
      s.sources.push(manualSource(a.id, old ? old.version + 1 : 1, a.text, "document"));
      break;
    }
    case "submit_proposal": {
      C.schema("proposal", a);
      need(s.lifecycle === "active", "Sessionen är inte aktiv.");
      need(same(a.sources, s.sources), "Förslaget måste använda exakt registrerat underlag.");
      a.items.forEach(i => id(i.id));
      const before = current(s) ? packet(s, current(s), true) : null;
      s.proposals.push(copy(a));
      const after = packet(s);
      if (before) C.validateTransition(before, after);
      else { need(a.revision === 1, "Första modellversionen måste vara 1."); C.validatePacket(after); }
      break;
    }
    case "request_review": {
      keys(a, ["id"]); id(a.id);
      need(s.lifecycle === "active" && aligned(s), "Granskning kräver ett förslag för aktuellt underlag.");
      need(!s.requests.some(j => j.id === a.id), "Gransknings-ID finns redan.");
      const p = current(s);
      s.requests.push({ id: a.id, evidence_digest: evidenceDigest(s), request: { proposal_digest: C.digest(p), snapshot: copy(p), trigger: p.revision === 1 ? "first_draft" : "material_change", changed_item_ids: copy(p.change.changed_item_ids), prior_finding_ids: copy(p.change.affected_finding_ids), trust: "data_only" } });
      break;
    }
    case "complete_review": {
      keys(a, ["id", "result"]);
      applyReview(s, a, true);
      break;
    }
    case "add_questions": {
      keys(a, ["questions"]); need(Array.isArray(a.questions), "Frågelista krävs.");
      for (const q of a.questions) {
        checkQuestion(s, q);
        need(q.status === "open" && q.answer_ids.length === 0 && q.merged_from.length === 0 && q.resolution === null, "En ny fråga ska vara öppen och obesvarad.");
        need(!s.questions.some(x => [x.id, ...x.merged_from].includes(q.id)), "Fråge-ID finns redan.");
        s.questions.push(copy(q));
      }
      s.questions = C.mergeQuestions(s.questions);
      break;
    }
    case "answer": {
      keys(a, ["id", "question_id", "text", "replaces_answer_id"]); id(a.id); text(a.text);
      need(!s.answers.some(x => x.id === a.id), "Svars-ID finns redan.");
      const q = s.questions.find(q => [q.id, ...q.merged_from].includes(a.question_id));
      need(q, "Frågan finns inte.");
      const old = s.answers.filter(x => [q.id, ...q.merged_from].includes(x.question_id)).at(-1);
      need(old ? a.replaces_answer_id === old.id : a.replaces_answer_id === null, "Rättelsen måste ersätta frågans senaste svar.");
      const sourceId = old ? old.source_id : `answer-${a.id}`, version = old ? old.source_version + 1 : 1;
      need(!s.sources.some(x => x.id === sourceId && x.version === version), "Svarskällans identitet upptagen.");
      s.sources.push(manualSource(sourceId, version, a.text, "answer"));
      s.answers.push({ id: a.id, question_id: old ? old.question_id : q.id, text: a.text, source_id: sourceId, source_version: version, replaces_answer_id: a.replaces_answer_id });
      q.answer_ids.push(a.id); q.status = "answered"; q.resolution = null;
      break;
    }
    case "question_status": {
      keys(a, ["id", "status", "reason"]); text(a.reason);
      need(["deferred", "withdrawn"].includes(a.status), "Tillåtet är uppskjuten eller återtagen fråga med skäl.");
      const q = s.questions.find(q => q.id === a.id); need(q, "Okänd fråga.");
      q.status = a.status; q.resolution = a.reason;
      break;
    }
    case "disposition": {
      keys(a, ["review_id", "finding_id", "status", "reason", "by"]); text(a.reason); text(a.by);
      need(["accepted", "rejected", "resolved"].includes(a.status), "Ogiltig fyndhantering.");
      const r = s.reviews.find(r => r.id === a.review_id);
      need(r?.result.findings.some(f => f.id === a.finding_id), "Okänt fynd.");
      if (a.status === "resolved") need(aligned(s) && statuses(s).review === "current" && r.request.proposal_digest !== C.digest(current(s)), "Åtgärdat fynd kräver en ny aktuell granskning av ändrat förslag.");
      s.dispositions.push({ ...copy(a), proposal_digest: C.digest(current(s)), evidence_digest: evidenceDigest(s) });
      break;
    }
    case "confirm": {
      keys(a, ["id", "proposal_digest", "evidence_digest", "context_digest", "by", "text", "scope_acknowledged"]); id(a.id); text(a.by); text(a.text);
      need(aligned(s), "Nytt underlag måste först tas in i ett uttryckligt modellförslag.");
      need(a.proposal_digest === C.digest(current(s)) && a.evidence_digest === evidenceDigest(s) && a.context_digest === contextDigest(s), "Kunden har inte sett aktuell version och granskningskontext.");
      need(a.scope_acknowledged === true, "Avgränsningar och begränsningar måste bekräftas.");
      need(!s.confirmations.some(c => c.id === a.id), "Bekräftelse-ID finns redan.");
      s.confirmations.push({ id: a.id, evidence_digest: a.evidence_digest, context_digest: a.context_digest, confirmation: { status: "confirmed", proposal_digest: a.proposal_digest, item_ids: C.active(current(s)).map(i => i.id), scope_acknowledged: true, by: a.by, record: manualSource(`confirmation-${a.id}`, 1, a.text, "answer") } });
      break;
    }
    case "handoff": {
      keys(a, ["id"]); id(a.id); need(!s.transfers.some(t => t.id === a.id), "Överlämnings-ID finns redan.");
      const value = transfer(s, a.id);
      need(transferSchema(value), `Ogiltigt överlämningsformat: ${ajv.errorsText(transferSchema.errors)}`);
      s.transfers.push(value); break;
    }
    case "lifecycle": {
      keys(a, ["status", "summary"]); text(a.summary);
      need(["active", "paused", "closed_limited", "closed_no_analysis"].includes(a.status), "Ogiltigt sessionsläge.");
      if (a.status === "closed_no_analysis") need(!current(s) && s.requests.length === 0, "Avslut utan analys ska inte skapa eller dölja en modell.");
      s.lifecycle = a.status; s.summary = a.summary; break;
    }
    default: throw new Error("Okänt sessionskommando.");
  }
  checkState(s);
}

// Shared state transitions, not a public session/1 bypass. Session/2 validates its
// archive/producer before calling this helper; session/1 retains its mock guard.
function applyReview(s, a, syntheticOnly = false) {
  keys(a, ["id", "result"]);
  const job = s.requests.find(j => j.id === a.id);
  need(job && !s.reviews.some(r => r.id === a.id), "Okänd eller redan besvarad granskning.");
  const review = { schema_version: "ce3-onboarding-review/1", id: a.id, request: copy(job.request), result: copy(a.result) };
  C.schema("review", review);
  if (syntheticOnly) need(review.result.producer.mode === "synthetic" && review.result.producer.model === null, "Endast tydligt syntetiska mockbesked tillåts.");
  review.result.findings.forEach(f => id(f.id)); s.reviews.push(review);
  C.validatePacket(packet(s, job.request.snapshot, true));
}
function initialState(sessionId) {
  id(sessionId);
  return { id: sessionId, lifecycle: "active", summary: "Manuell onboarding; ingen CE3-körning.", sources: [], proposals: [], requests: [], reviews: [], questions: [], answers: [], dispositions: [], confirmations: [], transfers: [] };
}

class Session {
  #state; #events = []; #binding = null;
  constructor(sessionId) {
    id(sessionId);
    this.#state = initialState(sessionId);
  }
  #commit(op, args) {
    // No externally held reference is adopted; invalid operations publish nothing.
    const draft = copy(this.#state), input = copy(args);
    apply(draft, op, input);
    const event = { sequence: this.#events.length + 1, op, args: input, previous_digest: this.#events.at(-1)?.digest ?? null, state_digest: C.digest(draft) };
    event.digest = C.digest(event);
    this.#state = draft; this.#events.push(event);
    return this.view();
  }
  view() {
    return copy({ ...this.#state, statuses: statuses(this.#state), evidence_digest: evidenceDigest(this.#state), context_digest: contextDigest(this.#state), proposal_digest: current(this.#state) ? C.digest(current(this.#state)) : null, effective_dispositions: effectiveDispositions(this.#state), transfers: this.#state.transfers.map(t => ({ ...t, current: t.context_digest === contextDigest(this.#state) && this.#state.lifecycle === "active" })) });
  }
  registerSource(a) { return this.#commit("register_source", a); }
  submitProposal(proposal) { return this.#commit("submit_proposal", proposal); }
  requestReview(reviewId) { this.#commit("request_review", { id: reviewId }); return copy(this.#state.requests.at(-1)); }
  completeReview(reviewId, result) { return this.#commit("complete_review", { id: reviewId, result }); }
  async runReview(reviewId, adapter) {
    need(adapter && typeof adapter.review === "function", "Granskningsadapter saknas.");
    const job = this.#state.requests.find(j => j.id === reviewId); need(job, "Okänd granskningsbegäran.");
    const result = await adapter.review(copy(job.request));
    return this.completeReview(reviewId, result);
  }
  addQuestions(questions) { return this.#commit("add_questions", { questions }); }
  answer(a) { return this.#commit("answer", a); }
  setQuestionStatus(a) { return this.#commit("question_status", a); }
  handleFinding(a) { return this.#commit("disposition", a); }
  confirm(a) { return this.#commit("confirm", a); }
  createHandoff(transferId) { this.#commit("handoff", { id: transferId }); return copy(this.#state.transfers.at(-1)); }
  setLifecycle(status, summary) { return this.#commit("lifecycle", { status, summary }); }
  serialize() {
    const payload = { schema_version: "ce3-onboarding-session/1", session_id: this.#state.id, events: copy(this.#events) };
    return { ...payload, checksum: C.digest(payload) };
  }
  static restore(value) {
    need(logSchema(value), `Ogiltig sessionsfil: ${ajv.errorsText(logSchema.errors)}`);
    const { checksum, ...payload } = value;
    need(checksum === C.digest(payload), "Sessionsfilens checksumma stämmer inte.");
    const session = new Session(payload.session_id);
    for (const event of payload.events) {
      session.#commit(event.op, event.args);
      need(same(session.#events.at(-1), event), "Historikkedjan eller sessionsövergången stämmer inte.");
    }
    return session;
  }
  static load(filename) {
    const file = path.resolve(filename), raw = fs.readFileSync(file, "utf8");
    const session = Session.restore(JSON.parse(raw));
    session.#binding = { file, file_digest: C.hash(raw) };
    return session;
  }
  save(filename) {
    const file = path.resolve(filename), lock = `${file}.lock`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const lockFd = fs.openSync(lock, "wx", 0o600);
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
      if (fs.existsSync(file)) need(this.#binding?.file === file && this.#binding.file_digest === C.hash(fs.readFileSync(file, "utf8")), "Filen finns redan eller har ändrats av en annan sessionshållare.");
      else need(this.#binding?.file !== file, "Den tidigare sparade sessionsfilen har försvunnit.");
      const raw = JSON.stringify(this.serialize(), null, 2) + "\n";
      const fd = fs.openSync(temp, "wx", 0o600);
      try { fs.writeFileSync(fd, raw); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      fs.renameSync(temp, file);
      this.#binding = { file, file_digest: C.hash(raw) };
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
      fs.closeSync(lockFd); fs.unlinkSync(lock);
    }
    return file;
  }
}
module.exports = { Session, sessionCore: { initialState, apply, applyReview, packet, contextDigest, manualSource, checkState, effectiveDispositions, aligned, current } };
