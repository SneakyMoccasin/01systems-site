"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Session } = require("./session.cjs");
const { MockReviewAdapter, mockResult } = require("./mock-review.cjs");
const E = require("./manual-example.cjs");
const C = require("../contracts/onboarding-v1/contract.cjs");
const copy = x => structuredClone(x);
function unchangedOnError(s, fn, message) {
  const log = s.serialize(), view = s.view();
  assert.throws(fn, message); assert.deepEqual(s.serialize(), log); assert.deepEqual(s.view(), view);
}
function review(s, id, findings = []) {
  const job = s.requestReview(id); s.completeReview(id, mockResult(job.request.snapshot, findings));
  return job;
}
function updated(s, edit = () => {}) {
  const v = s.view(), old = v.proposals.at(-1), p = copy(old);
  p.revision++; p.sources = v.sources; edit(p);
  p.change = { parent_digest: C.digest(old), changed_item_ids: p.items.map(i => i.id), affected_finding_ids: v.reviews.flatMap(r => r.result.findings.map(f => `${r.id}/${f.id}`)), reason: "Uttrycklig teständring av förslaget" };
  return p;
}
function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ce3-session-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, "session.json");
}

test("complete synthetic cycle preserves goal, separate approval, evidence and handoff boundaries", async () => {
  const { session: s, checkpoints, handoff } = await E.demonstrate();
  assert.equal(checkpoints[1].review, "stale"); assert.equal(checkpoints[1].confirmation, "stale");
  assert.equal(checkpoints[2].review, "stale");
  const v = s.view(); assert.equal(v.proposals.length, 2); assert.equal(v.reviews.length, 2); assert.equal(v.confirmations.length, 2);
  const p = v.proposals[1]; assert.equal(p.items.find(i => i.id === "target-day").type, "goal"); assert.match(p.items.find(i => i.id === "approval").value, /Separat/);
  assert.equal(handoff.model.digest, C.digest(p)); assert.equal(handoff.evidence.digest, C.digest(v.sources));
  assert.equal(handoff.review.id, "review-2"); assert.deepEqual(handoff.review.assessed_item_ids, C.active(p).map(i => i.id));
  assert.equal(handoff.confirmation.context_digest, handoff.context_digest);
  assert.equal(handoff.packet.handoff.ce3_validation_status, "not_run"); assert.equal(handoff.packet.handoff.ce3_run_status, "not_run");
  assert.equal(handoff.status, "ready_for_separate_compilation_and_validation");
  C.validatePacket(handoff.packet);
});
test("blocking question alone blocks export despite review and confirmation", () => {
  const s = E.setup(); review(s, "r"); s.addQuestions([E.question("q", null)]); E.confirm(s, "c");
  unchangedOnError(s, () => s.createHandoff("h"), /BLOCKING_QUESTION/);
});
test("blocking finding alone blocks export and accepted is not resolved", () => {
  const s = E.setup(); review(s, "r", [E.meaningFinding(s.view().proposals[0])]);
  s.handleFinding({ review_id: "r", finding_id: "meaning-shift", status: "accepted", reason: "Problemet erkänns men har inte rättats.", by: "Tester" }); E.confirm(s, "c");
  unchangedOnError(s, () => s.createHandoff("h"), /BLOCKING_FINDING/);
});
test("answer invalidates old review and confirmation without inventing a revised proposal", () => {
  const s = E.setup(); review(s, "r"); s.addQuestions([E.question("q", null)]); E.confirm(s, "c");
  const old = s.view().proposals[0]; s.answer({ id: "a", question_id: "q", text: "Ett förtydligande som sessionshållaren inte tolkar.", replaces_answer_id: null });
  assert.deepEqual(s.view().proposals, [old]); assert.equal(s.view().statuses.pending_evidence, true);
  assert.equal(s.view().statuses.review, "stale"); assert.equal(s.view().statuses.confirmation, "stale");
  unchangedOnError(s, () => s.createHandoff("h"), /Nytt underlag/);
  unchangedOnError(s, () => s.requestReview("stale-request"), /aktuellt underlag/);
});
test("late empty review remains attached to old version and cannot approve the new one", () => {
  const s = E.setup(), job = s.requestReview("slow");
  s.submitProposal(updated(s, p => { p.items[0].statement = "Reviderad plantext"; }));
  s.completeReview("slow", mockResult(job.request.snapshot));
  assert.equal(s.view().reviews[0].request.snapshot.revision, 1); assert.equal(s.view().statuses.review, "stale"); E.confirm(s, "c");
  unchangedOnError(s, () => s.createHandoff("h"), /Aktuell granskning saknas/);
});
test("pending review blocks export; late old blocker survives a clean current review", () => {
  const s = E.setup(), oldJob = s.requestReview("slow"); s.submitProposal(updated(s)); review(s, "current"); E.confirm(s, "c");
  unchangedOnError(s, () => s.createHandoff("h"), /väntar fortfarande/);
  s.completeReview("slow", mockResult(oldJob.request.snapshot, [E.meaningFinding(oldJob.request.snapshot)]));
  assert.equal(s.view().statuses.review, "current"); assert.equal(s.view().statuses.confirmation, "stale"); E.confirm(s, "c2");
  unchangedOnError(s, () => s.createHandoff("h"), /BLOCKING_FINDING/);
});
test("open findings and questions survive new versions and clean reviews", () => {
  const s = E.setup(); review(s, "review-1", [E.meaningFinding(s.view().proposals[0])]); s.addQuestions([E.question()]);
  s.submitProposal(updated(s)); review(s, "r2");
  assert.equal(s.view().questions[0].status, "open"); assert.equal(s.view().reviews[0].result.findings.length, 1);
  E.confirm(s, "c"); unchangedOnError(s, () => s.createHandoff("h"), /BLOCKING_QUESTION/);
});
test("answer is not finding resolution; resolution needs a new current review", () => {
  const s = E.setup(); review(s, "review-1", [E.meaningFinding(s.view().proposals[0])]); s.addQuestions([E.question()]);
  const disposition = { review_id: "review-1", finding_id: "meaning-shift", status: "resolved", reason: "Rättat i nytt förslag", by: "Tester" };
  unchangedOnError(s, () => s.handleFinding(disposition), /ny aktuell granskning/);
  s.answer({ id: "a", question_id: "q-approval", text: "Dag 2 är ett mål. Godkännande kräver ett separat besked.", replaces_answer_id: null }); s.submitProposal(E.correctedProposal(s.view()));
  assert.equal(s.view().dispositions.length, 0); unchangedOnError(s, () => s.handleFinding(disposition), /ny aktuell granskning/);
  review(s, "r2"); s.handleFinding(disposition); E.confirm(s, "c"); s.createHandoff("h");
});
test("reasoned rejection remains linked to finding across revisions", () => {
  const s = E.setup(); review(s, "r", [E.meaningFinding(s.view().proposals[0])]);
  const disposition = { review_id: "r", finding_id: "meaning-shift", status: "rejected", reason: "Handskrivet test av motiverat avvisande, ingen kvalitetsbedömning.", by: "Tester" };
  unchangedOnError(s, () => s.handleFinding({ ...disposition, reason: "" }), /Text måste/);
  s.handleFinding(disposition); s.submitProposal(updated(s)); review(s, "r2");
  assert.deepEqual(s.view().effective_dispositions, [disposition]);
});
test("invalid adapter data rejected atomically, including bad evidence and live mode", () => {
  for (const mutate of [r => { r.extra = true; }, r => { r.assessed_item_ids = []; }, r => { r.producer.mode = "live"; }, r => { r.findings[0].refs[0].quote = "Påhittat citat"; }]) {
    const s = E.setup(), job = s.requestReview("r"), result = mockResult(job.request.snapshot, [E.meaningFinding(job.request.snapshot)]); mutate(result);
    unchangedOnError(s, () => s.completeReview("r", result), /./);
    s.completeReview("r", mockResult(job.request.snapshot)); assert.equal(s.view().reviews.length, 1);
    unchangedOnError(s, () => s.completeReview("r", mockResult(job.request.snapshot)), /redan besvarad/);
  }
});
test("async adapter rejection/mutation cannot change state or the bound request", async () => {
  const s = E.setup(); s.requestReview("r"); const before = s.serialize();
  await assert.rejects(s.runReview("r", { async review(request) { request.snapshot.sources[0].content = "Ändrat"; throw new Error("Adapterfel"); } }), /Adapterfel/);
  assert.deepEqual(s.serialize(), before);
  await assert.rejects(s.runReview("r", new MockReviewAdapter({})), /Inget mockbesked/); assert.deepEqual(s.serialize(), before);
  await assert.rejects(s.runReview("r", { async review() { return { status: "complete", unexpected: true }; } }), /SCHEMA/); assert.deepEqual(s.serialize(), before);
});
test("async reply can arrive after explicit revision without approving it", async () => {
  const s = E.setup(); s.requestReview("r"); let finish;
  const promise = s.runReview("r", { review(request) { return new Promise(resolve => { finish = () => resolve(mockResult(request.snapshot)); }); } });
  s.submitProposal(updated(s)); finish(); await promise;
  assert.equal(s.view().proposals.at(-1).revision, 2); assert.equal(s.view().statuses.review, "stale");
});
test("source and answer corrections keep stable IDs and explicit predecessor links", () => {
  const s = E.setup(); s.registerSource({ id: "brief", text: E.original + " Manuellt tillägg.", replaces_version: 1 });
  assert.deepEqual(s.view().sources.map(x => [x.id, x.version]), [["brief", 1], ["brief", 2]]);
  unchangedOnError(s, () => s.registerSource({ id: "brief", text: "Fel föregångare", replaces_version: 1 }), /senaste tidigare/);
  s.submitProposal(updated(s)); s.addQuestions([E.question("q", null)]);
  s.answer({ id: "a1", question_id: "q", text: "Ett första svar", replaces_answer_id: null });
  unchangedOnError(s, () => s.answer({ id: "a2", question_id: "q", text: "Ett korrigerat svar", replaces_answer_id: null }), /ersätta frågans senaste/);
  s.answer({ id: "a2", question_id: "q", text: "Ett korrigerat svar", replaces_answer_id: "a1" });
  const [a, b] = s.view().answers; assert.equal(a.source_id, b.source_id); assert.equal(b.source_version, 2); assert.equal(b.replaces_answer_id, a.id);
});
test("proposal cannot replace sources, drop items or omit required change references", () => {
  const s = E.setup(); review(s, "r", [E.meaningFinding(s.view().proposals[0])]);
  const p = updated(s); p.sources[0].content = "Felaktig omskrivning";
  unchangedOnError(s, () => s.submitProposal(p), /exakt registrerat/);
  const q = updated(s, p => { p.items.find(i => i.id === "approval").statement = "Ändrad kontrollregel"; }); q.change.affected_finding_ids = []; unchangedOnError(s, () => s.submitProposal(q), /FINDING_IMPACT/);
  const removed = updated(s); removed.items = removed.items.filter(i => i.id !== "approval"); removed.change.changed_item_ids = removed.items.map(i => i.id);
  unchangedOnError(s, () => s.submitProposal(removed), /ITEM_HISTORY/);
});
test("duplicate questions retain origins, reasons and identity aliases", () => {
  const s = E.setup(); review(s, "review-1", [E.meaningFinding(s.view().proposals[0])]);
  const ai = E.question("q-ai", null), sr = E.question("q-sr"); sr.reasons = ["Mockfyndet behöver ett kundförtydligande."];
  s.addQuestions([ai, sr]); assert.equal(s.view().questions.length, 1); assert.equal(s.view().questions[0].origins.length, 2); assert.equal(s.view().questions[0].reasons.length, 2);
  s.answer({ id: "a", question_id: "q-sr", text: "Svar via tidigare fråge-ID", replaces_answer_id: null }); assert.equal(s.view().questions[0].status, "answered");
});
test("scope limits need documented treatment and current customer acceptance", () => {
  const s = E.setup(); const p = updated(s);
  p.gaps.push({ id: "limit", item_ids: ["approval"], kind: "scope_limit", impact: "limits_conclusion", status: "accepted_limit", explanation: "Verklig beskedstid utanför denna regelkontroll", resolution: "Begränsningen visas i kundutkastet" });
  s.submitProposal(p); s.addQuestions([E.question("scope-question", null, "limits_conclusion")]); s.setQuestionStatus({ id: "scope-question", status: "deferred", reason: "Utanför avgränsad regelkontroll" }); review(s, "r");
  unchangedOnError(s, () => s.createHandoff("h"), /kundbekräftelse/); E.confirm(s, "c"); const h = s.createHandoff("h");
  assert.equal(h.limitations[0].id, "limit"); assert.deepEqual(h.packet.handoff.unresolved_question_ids, ["scope-question"]);
});
test("new context rejects old confirmation tokens and makes prior export historical", async () => {
  const { session: s } = await E.demonstrate(); const old = s.view(); s.addQuestions([E.question("extra", null)]);
  unchangedOnError(s, () => s.confirm({ id: "stale", proposal_digest: old.proposal_digest, evidence_digest: old.evidence_digest, context_digest: old.context_digest, by: "Tester", text: "Ja", scope_acknowledged: true }), /inte sett aktuell/);
  assert.equal(s.view().transfers[0].current, false); assert.equal(s.view().statuses.confirmation, "stale");
});
test("a previously resolved finding is reopened conservatively on another revision", async () => {
  const { session: s } = await E.demonstrate(); s.submitProposal(updated(s)); review(s, "review-3");
  assert.equal(s.view().dispositions[0].status, "resolved");
  assert.equal(s.view().effective_dispositions[0].status, "accepted");
  E.confirm(s, "revision-3"); unchangedOnError(s, () => s.createHandoff("h3"), /BLOCKING_FINDING/);
});
test("explicit scenario assumptions and their customer choice survive handoff", () => {
  const s = E.setup(); s.addQuestions([E.question("scenario", null)]);
  const answer = "Jag väljer uttryckligen ett hypotetiskt scenario med två demonstrationer.";
  s.answer({ id: "choice", question_id: "scenario", text: answer, replaces_answer_id: null });
  const p = updated(s), chosen = E.ref(s.view().sources.at(-1), answer);
  p.items.push({ ...copy(p.items[0]), id: "chosen-scenario", kind: "assumption", statement: "Två demonstrationer i valt hypotetiskt scenario", type: "scenario_assumption", value: 2, refs: [chosen], scenario_choice: chosen });
  p.change.changed_item_ids.push("chosen-scenario"); s.submitProposal(p); review(s, "r"); E.confirm(s, "c");
  const h = s.createHandoff("h"); assert.equal(h.assumptions.length, 1); assert.equal(h.assumptions[0].type, "scenario_assumption"); assert.deepEqual(h.assumptions[0].scenario_choice, chosen);
});
test("save/reopen preserves full histories, links, statuses and rejected findings", async t => {
  const { session: s } = await E.demonstrate(); const file = temp(t);
  const f = E.meaningFinding(s.view().proposals[0]); f.id = "extra-hypothesis"; f.category = "hypothesis"; f.basis = "review_hypothesis"; f.refs = []; f.searched_source_ids = [];
  review(s, "review-3", [f]); s.handleFinding({ review_id: "review-3", finding_id: f.id, status: "rejected", reason: "Testhypotesen saknar stöd och inför ett extra krav.", by: "Tester" }); E.confirm(s, "after-rejection");
  s.save(file); const loaded = Session.load(file); assert.deepEqual(loaded.view(), s.view()); assert.deepEqual(loaded.serialize(), s.serialize());
  assert.equal(loaded.view().effective_dispositions.at(-1).status, "rejected");
  loaded.setLifecycle("paused", "Paus med alla historiska uppgifter bevarade"); loaded.save(file);
  assert.deepEqual(Session.load(file).view(), loaded.view());
});
test("pending sources and unresolved review jobs survive reopen", t => {
  const s = E.setup(); s.requestReview("pending"); s.registerSource({ id: "extra", text: "Ännu ej infört i modellen", replaces_version: null });
  const file = temp(t); s.save(file); const loaded = Session.load(file); assert.deepEqual(loaded.view(), s.view());
  loaded.completeReview("pending", mockResult(loaded.view().requests[0].request.snapshot)); assert.equal(loaded.view().statuses.review, "stale");
});
test("invalid saved data and even rehashed invalid transitions are rejected", () => {
  const s = E.setup(); const broken = s.serialize(); broken.events[0].args.text = "Manipulerat";
  assert.throws(() => Session.restore(broken), /checksumma/);
  const { checksum, ...body } = broken; broken.checksum = C.digest(body);
  assert.throws(() => Session.restore(broken), /Historikkedjan/);
});
test("existing files, stale writers and active save locks cannot be overwritten", t => {
  const file = temp(t), s = E.setup(); s.save(file); const a = Session.load(file), b = Session.load(file);
  a.setLifecycle("paused", "Första hållarens ändring"); a.save(file); const bytes = fs.readFileSync(file);
  b.setLifecycle("paused", "Andra hållarens ändring"); assert.throws(() => b.save(file), /annan sessionshållare/); assert.deepEqual(fs.readFileSync(file), bytes);
  assert.throws(() => E.setup().save(file), /finns redan/); assert.deepEqual(fs.readFileSync(file), bytes);
  fs.writeFileSync(`${file}.lock`, "held"); assert.throws(() => a.save(file), /EEXIST/); assert.deepEqual(fs.readFileSync(file), bytes);
});
test("no-analysis flow ends without a model, review, confirmation or handoff", t => {
  const s = new Session("no-analysis"); s.registerSource({ id: "note", text: "Jag behöver bara en sammanfattning.", replaces_version: null });
  s.setLifecycle("closed_no_analysis", "Inget analysbehov identifierat; avslutat med sammanfattning.");
  assert.deepEqual(s.view().proposals, []); assert.deepEqual(s.view().reviews, []); assert.deepEqual(s.view().confirmations, []);
  unchangedOnError(s, () => s.createHandoff("h"), /Avslutad session/);
  const file = temp(t); s.save(file); assert.deepEqual(Session.load(file).view(), s.view());
});
test("exposed objects are copies and demonstrations are deterministic", async () => {
  const a = await E.demonstrate(), b = await E.demonstrate(); assert.deepEqual(a.session.serialize(), b.session.serialize());
  const before = a.session.serialize(), view = a.session.view(); view.sources[0].content = "Ändrad utifrån"; a.handoff.model.revision = 99;
  assert.deepEqual(a.session.serialize(), before);
});
