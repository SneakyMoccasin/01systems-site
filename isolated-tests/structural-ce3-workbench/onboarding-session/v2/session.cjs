'use strict';
const fs = require('node:fs'), path = require('node:path');
const Ajv = require('ajv');
const C = require('../../contracts/onboarding-v1/contract.cjs');
const { Session: Session1, sessionCore: core } = require('../session.cjs');
const Archive = require('./archive.cjs');
const ajv = new Ajv({ allErrors: true });
for (const name of ['proposal', 'review', 'dialogue', 'handoff']) ajv.addSchema(require(`../../contracts/onboarding-v1/schemas/${name}.schema.json`));
ajv.addSchema(require('./archive.schema.json'));
const schema = ajv.compile(require('./session.schema.json'));
const transferSchema = ajv.compile(require('./transfer.schema.json'));
const copy = x => structuredClone(x), same = (a, b) => C.digest(a) === C.digest(b);
const need = (ok, code) => { if (!ok) throw new Error(code); };
const keys = (x, wanted) => need(x && same(Object.keys(x).sort(), [...wanted].sort()), 'COMMAND_FIELDS');
const id = x => need(typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(x), 'INVALID_ID');
const text = x => need(typeof x === 'string' && x.trim(), 'TEXT_REQUIRED');
function initialize(sessionId, origin) {
  const s = core.initialState(sessionId);
  if (origin) {
    need(origin.schema_version === 'ce3-session-migration/1' && origin.source_format === 'ce3-onboarding-session/1' && origin.source_checksum === origin.source.checksum, 'MIGRATION_ORIGIN');
    keys(origin, ['schema_version', 'source_format', 'source_checksum', 'source_label', 'source']); text(origin.source_label);
    Session1.restore(origin.source); need(origin.source.session_id === sessionId, 'MIGRATION_ID');
    for (const e of origin.source.events) core.apply(s, e.op, copy(e.args));
  }
  return { ...s, register: null, register_epoch: 0, structured_jobs: [], structured_reviews: [], confirmations_v2: [], transfers_v2: [], resolution_bindings: [] };
}
function selected(s) {
  if (!core.aligned(s) || !s.register || s.register.proposal_digest !== C.digest(core.current(s))) return null;
  // Request order determines the current review; arrival order never does.
  const job = s.structured_jobs.filter(j => j.epoch === s.register_epoch && j.proposal_digest === C.digest(core.current(s)) && j.evidence_digest === C.digest(s.sources)).at(-1);
  if (!job) return null;
  return { job, review: s.structured_reviews.find(r => r.id === job.id) ?? null };
}
function dispositions(s) {
  const values = core.effectiveDispositions(s);
  return values.map(d => {
    const recorded = s.resolution_bindings.filter(b => b.review_id === d.review_id && b.finding_id === d.finding_id).at(-1);
    if (d.status === 'resolved' && recorded && (recorded.epoch !== s.register_epoch || recorded.proposal_digest !== C.digest(core.current(s)) || recorded.evidence_digest !== C.digest(s.sources))) return { ...d, status: 'accepted', reason: `Åtgärd behöver omprövas efter ändring. ${d.reason}` };
    return d;
  });
}
function context(s) {
  return C.digest({ proposal: core.current(s), evidence: s.sources, register: s.register, epoch: s.register_epoch,
    jobs: s.structured_jobs, reviews: s.reviews, bindings: s.structured_reviews, questions: s.questions, answers: s.answers,
    dispositions: dispositions(s), lifecycle: s.lifecycle });
}
function statuses(s) {
  const current = selected(s), conf = s.confirmations_v2.at(-1);
  const review = !current ? (s.reviews.length || s.structured_jobs.length ? 'stale' : 'not_requested') : !current.review ? 'pending' : current.review.status === 'complete' ? 'current' : 'incomplete';
  return { review, confirmation: !conf ? (s.confirmations.length ? 'stale' : 'not_requested') : review === 'current' && conf.context_digest === context(s) && same(conf.review_binding, current.review.binding) ? 'confirmed' : 'stale',
    pending_evidence: !core.aligned(s) && s.sources.length > 0 };
}
function requestFor(s) {
  const p = core.current(s); need(p && core.aligned(s), 'ALIGNED_PROPOSAL_REQUIRED');
  return { proposal_digest: C.digest(p), snapshot: copy(p), trigger: p.revision === 1 ? 'first_draft' : 'material_change', changed_item_ids: copy(p.change.changed_item_ids), prior_finding_ids: copy(p.change.affected_finding_ids), trust: 'data_only' };
}
function setRegister(s, prepared) {
  Archive.checkPrepared(prepared); need(same(prepared.request, requestFor(s)), 'REGISTER_CONTEXT');
  s.register_epoch++;
  s.register = { proposal_digest: prepared.model_digest, registry_digest: prepared.input.registrySha256, targets: copy(prepared.input.targets) };
}
function apply(s, op, a, archives) {
  need(s.lifecycle !== 'closed_no_analysis', 'SESSION_CLOSED');
  switch (op) {
    case 'select_register':
      keys(a, ['prepared', 'reason']); text(a.reason); setRegister(s, a.prepared); break;
    case 'request_structured_review': {
      keys(a, ['id', 'prepared']); id(a.id); Archive.checkPrepared(a.prepared);
      need(same(a.prepared.request, requestFor(s)), 'REQUEST_CONTEXT');
      if (!s.register || s.register.proposal_digest !== a.prepared.model_digest) setRegister(s, a.prepared);
      need(same(s.register.targets, a.prepared.input.targets), 'REQUEST_REGISTER');
      core.apply(s, 'request_review', { id: a.id });
      s.structured_jobs.push({ id: a.id, epoch: s.register_epoch, proposal_digest: a.prepared.model_digest, evidence_digest: a.prepared.evidence_digest, prepared: copy(a.prepared) });
      break;
    }
    case 'receive_structured_review': {
      keys(a, ['id', 'binding']); const job = s.structured_jobs.find(j => j.id === a.id);
      need(job && !s.structured_reviews.some(r => r.id === a.id), 'UNKNOWN_OR_COMPLETED_JOB');
      const archive = archives[a.binding.archive_digest]; need(archive, 'MISSING_REVIEW_ARCHIVE'); Archive.integrity(archive);
      need(same(a.binding, Archive.binding(archive)), 'REVIEW_EVENT_BINDING');
      const r = archive.receipt;
      const body = p => { const { digest, schema_version, ...rest } = p; return rest; };
      need(same(body(job.prepared), body(r.prepared)), 'REVIEW_REQUEST_BINDING');
      core.applyReview(s, { id: a.id, result: r.result });
      s.structured_reviews.push({ id: a.id, epoch: job.epoch, status: r.result.status, binding: copy(a.binding) });
      break;
    }
    case 'disposition': {
      if (a.status === 'resolved') {
        need(statuses(s).review === 'current', 'CURRENT_STRUCTURED_REVIEW_REQUIRED');
        const review = s.reviews.find(r => r.id === a.review_id), p = core.current(s);
        need(review && review.request.proposal_digest !== C.digest(p), 'UPDATED_PROPOSAL_REQUIRED');
        const finding = review.result.findings.find(f => f.id === a.finding_id), now = selected(s).review;
        const currentResult = s.reviews.find(r => r.id === now.id).result;
        need(finding && finding.target_ids.every(t => currentResult.assessed_item_ids.includes(t)), 'RELEVANT_NEW_REVIEW_REQUIRED');
      }
      core.apply(s, op, a);
      if (a.status === 'resolved') s.resolution_bindings.push({ review_id: a.review_id, finding_id: a.finding_id, epoch: s.register_epoch, proposal_digest: C.digest(core.current(s)), evidence_digest: C.digest(s.sources) });
      break;
    }
    case 'confirm_structured': {
      keys(a, ['id', 'proposal_digest', 'evidence_digest', 'context_digest', 'review_binding', 'by', 'text', 'scope_acknowledged']); id(a.id); text(a.by); text(a.text);
      need(![...s.confirmations, ...s.confirmations_v2].some(c => c.id === a.id), 'CONFIRMATION_ID_EXISTS');
      need(statuses(s).review === 'current' && a.scope_acknowledged === true, 'CURRENT_REVIEW_AND_SCOPE_REQUIRED');
      need(a.proposal_digest === C.digest(core.current(s)) && a.evidence_digest === C.digest(s.sources) && a.context_digest === context(s) && same(a.review_binding, selected(s).review.binding), 'CONFIRMATION_STALE');
      s.confirmations_v2.push({ ...copy(a), confirmation: { status: 'confirmed', proposal_digest: a.proposal_digest, item_ids: C.active(core.current(s)).map(i => i.id), scope_acknowledged: true, by: a.by, record: core.manualSource(`confirmation-${a.id}`, 1, a.text, 'answer') } });
      break;
    }
    case 'handoff_structured': {
      keys(a, ['id']); id(a.id);
      need(![...s.transfers, ...s.transfers_v2].some(t => t.id === a.id), 'HANDOFF_ID_EXISTS');
      need(s.lifecycle === 'active' && statuses(s).review === 'current' && statuses(s).confirmation === 'confirmed', 'HANDOFF_REVIEW_OR_CONFIRMATION');
      need(s.requests.every(j => s.reviews.some(r => r.id === j.id)), 'PENDING_STRUCTURED_REVIEW');
      // review/1 has no lossless disposition for context/unmapped findings. Keep
      // every such historical blocker until a future explicit resolution format.
      need(s.structured_reviews.every(r => archives[r.binding.archive_digest].receipt.unmapped.length === 0), 'UNRESOLVED_UNMAPPED_HISTORY');
      const review = selected(s).review, archive = archives[review.binding.archive_digest]; Archive.integrity(archive);
      need(archive.receipt.unmapped.length === 0 && archive.receipt.field_coverage.status === 'complete' && archive.receipt.finding_reporting.status === 'complete', 'HANDOFF_COVERAGE');
      const p = core.packet(s), conf = s.confirmations_v2.at(-1);
      p.handoff.confirmation = copy(conf.confirmation); p.handoff.dispositions = dispositions(s);
      p.handoff.unresolved_finding_ids = s.reviews.flatMap(r => r.result.findings.filter(f => !p.handoff.dispositions.some(d => d.review_id === r.id && d.finding_id === f.id && ['resolved', 'rejected'].includes(d.status))).map(f => `${r.id}/${f.id}`));
      Object.assign(p.handoff, { review_status: 'current', dialogue_status: 'ready_for_translation', readiness: 'candidate_for_validation' });
      C.validatePacket(p);
      const transfer = { schema_version: 'ce3-onboarding-transfer/2', id: a.id, session_id: s.id, status: 'ready_for_separate_compilation_and_validation',
        context_digest: context(s), model_digest: C.digest(core.current(s)), evidence_digest: C.digest(s.sources), review_binding: copy(review.binding), confirmation: copy(conf), packet: p,
        ce3_validation_status: 'not_run', ce3_run_status: 'not_run' };
      need(transferSchema(transfer), 'TRANSFER_2_SCHEMA'); s.transfers_v2.push(transfer);
      break;
    }
    default:
      need(['register_source', 'submit_proposal', 'add_questions', 'answer', 'question_status', 'lifecycle'].includes(op), 'UNSUPPORTED_V2_OPERATION');
      core.apply(s, op, a);
  }
  core.checkState(s);
}
class Session {
  #state; #origin; #events = []; #archives = {};
  constructor(sessionId, origin = null) { this.#origin = copy(origin); this.#state = initialize(sessionId, origin); }
  #commit(op, args, archive = null) {
    const s = copy(this.#state), archives = { ...this.#archives };
    if (archive) archives[archive.digest] = copy(archive);
    apply(s, op, copy(args), archives);
    const e = { sequence: this.#events.length + 1, op, args: copy(args), previous_digest: this.#events.at(-1)?.digest ?? null, state_digest: C.digest(s) }; e.digest = C.digest(e);
    this.#state = s; this.#archives = archives; this.#events.push(e); return this.view();
  }
  view() {
    const s = this.#state; return copy({ ...s, statuses: statuses(s), proposal_digest: core.current(s) ? C.digest(core.current(s)) : null,
      evidence_digest: C.digest(s.sources), context_digest: context(s), current_review: selected(s)?.review ?? null, effective_dispositions: dispositions(s),
      transfers_v2: s.transfers_v2.map(t => ({ ...t, current: t.context_digest === context(s) && s.lifecycle === 'active' })), origin: this.#origin && { source_format: this.#origin.source_format, source_checksum: this.#origin.source_checksum } });
  }
  registerSource(a) { return this.#commit('register_source', a); }
  submitProposal(p) { return this.#commit('submit_proposal', p); }
  selectRegister(targets, reason, options = {}) { return this.#commit('select_register', { prepared: Archive.prepare(requestFor(this.#state), targets, options), reason }); }
  requestReview(id, options = {}) {
    const s = this.#state, request = requestFor(s), targets = s.register?.proposal_digest === request.proposal_digest ? s.register.targets : undefined;
    const prepared = Archive.prepare(request, targets, options);
    this.#commit('request_structured_review', { id, prepared }); return copy(this.#state.structured_jobs.at(-1));
  }
  async receiveReview(id, archive, options = {}) {
    archive = copy(archive); await Archive.audit(archive, options); // local recorded-response audit, never model inference
    return this.#commit('receive_structured_review', { id, binding: Archive.binding(archive) }, archive);
  }
  addQuestions(questions) { return this.#commit('add_questions', { questions }); }
  answer(a) { return this.#commit('answer', a); }
  setQuestionStatus(a) { return this.#commit('question_status', a); }
  handleFinding(a) { return this.#commit('disposition', a); }
  confirm(a) { return this.#commit('confirm_structured', a); }
  createHandoff(id) { this.#commit('handoff_structured', { id }); return copy(this.#state.transfers_v2.at(-1)); }
  setLifecycle(status, summary) { return this.#commit('lifecycle', { status, summary }); }
  serialize() {
    const payload = { schema_version: 'ce3-onboarding-session/2', session_id: this.#state.id, origin: copy(this.#origin), events: copy(this.#events), archives: copy(this.#archives) };
    return { ...payload, checksum: C.digest(payload) };
  }
  static restore(log) {
    need(schema(log), 'SESSION_2_SCHEMA'); const { checksum, ...payload } = log; need(checksum === C.digest(payload), 'SESSION_2_CHECKSUM');
    const session = new Session(log.session_id, log.origin), used = new Set();
    for (const [digest, archive] of Object.entries(log.archives)) { need(digest === archive.digest, 'ARCHIVE_KEY'); Archive.integrity(archive); }
    for (const event of log.events) {
      const archive = event.op === 'receive_structured_review' ? log.archives[event.args.binding.archive_digest] : null;
      if (archive) used.add(archive.digest);
      session.#commit(event.op, event.args, archive);
      need(same(session.#events.at(-1), event), 'SESSION_2_EVENT_CHAIN');
    }
    need(same([...used].sort(), Object.keys(log.archives).sort()), 'ORPHAN_ARCHIVE'); return session;
  }
  async auditArchives(options = {}) { const results = []; for (const archive of Object.values(this.#archives)) results.push(await Archive.audit(archive, options)); return results; }
  static migrate(log, sourceLabel) {
    Session1.restore(log); text(sourceLabel);
    return new Session(log.session_id, { schema_version: 'ce3-session-migration/1', source_format: 'ce3-onboarding-session/1', source_checksum: log.checksum, source_label: sourceLabel, source: copy(log) });
  }
  static load(file) { return Session.restore(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  save(file) {
    const value = this.serialize(); Session.restore(value);
    const destination = path.resolve(file), fd = fs.openSync(destination, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return destination;
  }
  static migrateFile(source, destination) { const result = Session.migrate(JSON.parse(fs.readFileSync(source, 'utf8')), path.resolve(source)); result.save(destination); return result; }
}
module.exports = { Session };
