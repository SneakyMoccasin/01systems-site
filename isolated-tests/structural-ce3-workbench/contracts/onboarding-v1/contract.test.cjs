"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("./contract.cjs");
const F = require("./examples/fixtures.cjs");
const catalog = require("./examples/catalog.json");
const clone = x => structuredClone(x);
const rejects = (fn, code) => assert.throws(fn, new RegExp(`^Error: ${code}:`));
const refresh = x => { x.reviews = [F.review(x.proposal)]; return F.sync(x); };

for (const entry of catalog) test(`synthetic contract: ${entry.id}`, () => {
  const value = F[entry.id]();
  if (value.before) assert.equal(C.validateTransition(value.before, value.after), true);
  else assert.equal(C.validatePacket(value), true);
});

test("no analysis can close without a plan, confirmation or review", () => {
  const x = F.noAnalysis(); C.validatePacket(x);
  assert.equal(x.reviews.length, 0); assert.equal(x.proposal.items.length, 0);
  rejects(() => C.validatePacket(F.candidate(x)), "HANDOFF_GATES");
});
test("single plan may reach translation candidate; this never grants CE3 validation", () => {
  const x = F.candidate(F.base()); C.validatePacket(x);
  assert.equal(x.proposal.analysis.plan_ids.length, 1);
  assert.equal(x.handoff.ce3_validation_status, "not_run");
  x.handoff.ce3_validation_status = "pass";
  rejects(() => C.validatePacket(x), "SCHEMA");
});
test("choosing needs alternatives; changed-assumption analysis needs its assumption", () => {
  const x = F.base(); x.proposal.analysis.kind = "choose"; refresh(x);
  rejects(() => C.validatePacket(x), "ANALYSIS_SCOPE");
  x.proposal.analysis.kind = "change"; refresh(x);
  rejects(() => C.validatePacket(x), "ANALYSIS_SCOPE");
  const s = F.source("scenario-choice", "Jag väljer uttryckligen scenariot med två demonstrationspass.", "answer");
  x.proposal.sources.push(s); const i = F.item("assumption", "assumption", "Hypotetiskt antal pass", "scenario_assumption", 2, [F.ref(s)]); i.scenario_choice = F.ref(s);
  x.proposal.items.push(i); x.proposal.analysis.changed_assumption_ids = [i.id]; refresh(x);
  C.validatePacket(x);
});
test("semantic mistakes are represented by supplied findings, not detected by a mock", () => {
  for (const build of [F.goalAsApproval, F.inventedDependency]) {
    const x = build(); C.validatePacket(x);
    rejects(() => C.validatePacket(F.candidate(x)), "BLOCKING_FINDING");
    x.reviews = [F.review(x.proposal)]; F.sync(x);
    // A real but insufficient quote still passes mechanical provenance checks.
    // This assertion makes the missing semantic detector explicit.
    C.validatePacket(x);
  }
});
test("invented cost stays a proposal even when its SR finding is dismissed", () => {
  const x = F.inventedCost(); x.handoff.dispositions = [{ review_id: "review-1", finding_id: "finding-1", status: "rejected", by: "tester", reason: "Syntetiskt test av separat modellspärr" }];
  rejects(() => C.validatePacket(F.candidate(x)), "UNRESOLVED_ITEM");
});
test("unknown cannot contain zero, absent or approved", () => {
  for (const value of [0, "absent", "approved"]) {
    const x = F.base(); x.proposal.items[0].status = "unknown"; x.proposal.items[0].value = value; refresh(x);
    rejects(() => C.validatePacket(x), "UNKNOWN_VALUE");
  }
  const x = F.base(); x.proposal.items[0].status = "unknown"; x.proposal.items[0].value = null; refresh(x); C.validatePacket(x);
  rejects(() => C.validatePacket(F.candidate(x)), "UNRESOLVED_ITEM");
});
test("changing unknown to a concrete value cannot reuse its unresolved provenance", () => {
  const before = F.base(); before.proposal.items[0].status = "unknown"; before.proposal.items[0].value = null; refresh(before);
  const after = clone(before); after.proposal.revision = 2; after.proposal.change = { parent_digest: C.digest(before.proposal), changed_item_ids: ["plan-p"], affected_finding_ids: [], reason: "Ogiltig automatisk ifyllnad" }; after.proposal.items[0].status = "known"; after.proposal.items[0].value = 0; F.sync(after);
  rejects(() => C.validateTransition(before, after), "RESOLUTION_SOURCE");
});
test("scenario needs explicit customer-answer provenance and retains hypothetical type", () => {
  const x = F.base(); const i = x.proposal.items[0]; i.type = "scenario_assumption"; refresh(x);
  rejects(() => C.validatePacket(x), "SCENARIO_CHOICE");
  i.scenario_choice = F.ref(x.proposal.sources[0]); refresh(x);
  rejects(() => C.validatePacket(x), "SCENARIO_CHOICE");
  const s = F.source("selected-scenario", "Jag väljer uttryckligen denna hypotetiska demonstrationsplan.", "answer"); x.proposal.sources.push(s); i.refs = [F.ref(s)]; i.scenario_choice = F.ref(s); refresh(x); C.validatePacket(F.candidate(x)); assert.equal(i.type, "scenario_assumption");
});
test("profile gap blocks even after empty findings and customer confirmation", () => {
  rejects(() => C.validatePacket(F.candidate(F.profileGap())), "OPEN_GAP");
  const x = F.profileGap(); x.proposal.gaps[0].status = "accepted_limit"; x.proposal.gaps[0].resolution = "Ignorera"; refresh(x);
  rejects(() => C.validatePacket(x), "BLOCKER_NOT_LIMIT");
});
test("review hypotheses can be rejected with reasons but cannot masquerade as evidence", () => {
  const x = F.unsupportedFinding(); C.validatePacket(x);
  const unchanged = C.digest(x.proposal); C.validatePacket(F.candidate(x)); assert.equal(C.digest(x.proposal), unchanged);
  x.handoff.dispositions[0].reason = null; rejects(() => C.validatePacket(x), "DISPOSITION_REASON");
  const y = F.unsupportedFinding(); y.reviews[0].result.findings[0].basis = "evidence";
  rejects(() => C.validatePacket(y), "FINDING_EVIDENCE");
});
test("duplicate questions preserve both origins, reasons and strongest priority", () => {
  const x = F.duplicateQuestions(); const original = clone(x.dialogue.questions);
  x.dialogue.questions = C.mergeQuestions(x.dialogue.questions); F.sync(x); C.validatePacket(x);
  assert.equal(x.dialogue.questions.length, 1); const q = x.dialogue.questions[0];
  assert.equal(q.origins.length, 2); assert.equal(q.reasons.length, 2); assert.equal(q.priority, 1); assert.equal(q.impact, "blocks_handoff"); assert.deepEqual(q.merged_from, ["q-sr"]);
  assert.equal(original[0].origins.length, 1);
  const different = clone(original); different[1].target_ids = ["plan-p"]; assert.equal(C.mergeQuestions(different).length, 2);
});
test("corrected answer preserves both versions and invalidates approval and review", () => {
  const { before, after } = F.correctedAnswer(); C.validateTransition(before, after);
  assert.equal(after.dialogue.answers.length, 2); assert.equal(after.handoff.review_status, "stale"); assert.equal(after.handoff.confirmation.status, "stale");
  after.handoff.confirmation.status = "confirmed"; rejects(() => C.validatePacket(after), "CONFIRMATION_STALE");
});
test("old findings and unanswered questions survive a paused correction", () => {
  const { before, after } = F.staleReview(); C.validateTransition(before, after);
  assert.deepEqual(after.handoff.unresolved_finding_ids, ["review-1/finding-1"]); assert.deepEqual(after.handoff.unresolved_question_ids, ["q-time"]);
  after.handoff.review_status = "current"; rejects(() => C.validatePacket(after), "REVIEW_STATUS");
});
test("changed proposal cannot relabel an old snapshot as current", () => {
  const { after } = F.staleReview(); after.reviews[0].request.proposal_digest = C.digest(after.proposal);
  rejects(() => C.validatePacket(after), "REVIEW_DIGEST");
});
test("new review cannot silently discard prior findings or history", () => {
  const { before, after } = F.staleReview(); after.reviews.push(F.review(after.proposal, [], "review-2")); F.sync(after); C.validateTransition(before, after);
  assert.deepEqual(after.handoff.unresolved_finding_ids, ["review-1/finding-1"]);
  after.reviews.shift(); F.sync(after); rejects(() => C.validateTransition(before, after), "PRIOR_FINDING");
});
test("resolution needs a later current review and a human reason", () => {
  const { after } = F.staleReview(); after.handoff.dispositions.push({ review_id: "review-1", finding_id: "finding-1", status: "resolved", reason: "Målstatus återställd", by: "tester" }); F.sync(after);
  rejects(() => C.validatePacket(after), "RESOLUTION_REVIEW");
  after.reviews.push(F.review(after.proposal, [], "review-2")); F.sync(after); C.validatePacket(after);
});
test("review coverage is explicit; zero findings never means all items assessed", () => {
  const x = F.base(); x.reviews[0].result.assessed_item_ids.pop(); rejects(() => C.validatePacket(x), "REVIEW_COVERAGE");
  x.reviews[0].result.status = "partial"; F.sync(x); C.validatePacket(x);
  rejects(() => C.validatePacket(F.candidate(x)), "HANDOFF_GATES");
});
test("SR receives exact proposal sources including answers, not an AI summary", () => {
  const x = F.base(); x.reviews[0].request.snapshot.sources[0].content = "AI:s sammanfattning";
  rejects(() => C.validatePacket(x), "SOURCE_HASH");
  const y = F.base(); y.reviews[0].request.snapshot.scope.excludes.push("En ny avgränsning");
  rejects(() => C.validatePacket(y), "REVIEW_DIGEST");
});
test("incorrect quote, source version and extraction hash are rejected", () => {
  const x = F.base(); x.proposal.items[0].refs[0].quote = "Påhittat citat"; refresh(x); rejects(() => C.validatePacket(x), "QUOTE");
  const y = F.base(); y.proposal.items[0].refs[0].source_version = 99; refresh(y); rejects(() => C.validatePacket(y), "SOURCE_REFERENCE");
});
test("failed, missing and partial extraction are explicit and block handoff", () => {
  for (const status of ["failed", "missing", "partial"]) {
    const x = F.base(), s = F.source("unread-document", "Delvis läsbart underlag"); s.extraction = status; s.extraction_note = "Syntetiskt extraktionsfel";
    if (status !== "partial") s.content = s.content_sha256 = null;
    x.proposal.sources.push(s); refresh(x); C.validatePacket(x);
    rejects(() => C.validatePacket(F.candidate(x)), "EXTRACTION_BLOCK");
  }
});
test("document instructions stay data; test does not prove LLM injection resistance", () => {
  const x = F.embeddedInstructions(); const old = C.digest(x.proposal.items); C.validatePacket(x); C.validatePacket(x);
  assert.equal(C.digest(x.proposal.items), old); assert.equal(x.handoff.ce3_run_status, "not_run");
  x.proposal.sources[1].trust = "instructions"; refresh(x); rejects(() => C.validatePacket(x), "SCHEMA");
});
test("unknown contract fields and implicit type coercion are rejected", () => {
  const x = F.base(); x.proposal.ce3_model = {}; refresh(x); rejects(() => C.validatePacket(x), "SCHEMA");
  const y = F.base(); y.proposal.revision = "1"; refresh(y); rejects(() => C.validatePacket(y), "SCHEMA");
});
test("changed inputs invalidate dependent rules and link old findings", () => {
  const { before, after } = F.staleReview(); after.proposal.change.affected_finding_ids = []; F.sync(after);
  rejects(() => C.validateTransition(before, after), "FINDING_IMPACT");
  const a = F.base(); a.proposal.items[1].depends_on = ["plan-p"]; refresh(a);
  const b = clone(a); b.proposal.revision = 2; b.proposal.items[0].statement = "Ändrad demonstrationsplan"; b.proposal.change = { parent_digest: C.digest(a.proposal), changed_item_ids: ["plan-p"], affected_finding_ids: [], reason: "Ändrad plan" }; F.sync(b);
  rejects(() => C.validateTransition(a, b), "CHANGE_IMPACT");
});
test("source versions and prior answers cannot be overwritten", () => {
  const { before, after } = F.correctedAnswer(); after.proposal.sources[0].original_ref = "rewritten"; F.sync(after);
  rejects(() => C.validateTransition(before, after), "SOURCE_REWRITE");
  const pair = F.correctedAnswer(); pair.after.dialogue.answers.shift(); pair.after.dialogue.questions[0].answer_ids = ["a2"]; pair.after.dialogue.answers[0].replaces_answer_id = null;
  rejects(() => C.validateTransition(pair.before, pair.after), "ANSWER_HISTORY");
});
test("unanswered scope question can remain only with an acknowledged limitation", () => {
  const x = F.base(); x.dialogue.questions = [F.question("scope-question", "ai", "limits_conclusion")];
  rejects(() => C.validatePacket(F.candidate(x)), "UNACKNOWLEDGED_LIMIT");
  x.proposal.gaps = [{ id: "scope-gap", item_ids: ["criterion"], kind: "scope_limit", impact: "limits_conclusion", status: "accepted_limit", explanation: "Kontrolltid verifieras inte", resolution: "Begränsad slutsats redovisas i kundutkastet" }]; refresh(x); C.validatePacket(F.candidate(x));
});
test("conflicts stay explicit and cannot be approved into executable facts", () => {
  const x = F.base(); x.proposal.items[0].status = "conflict"; x.proposal.items[0].value = null; refresh(x);
  rejects(() => C.validatePacket(x), "CONFLICT_RECORD");
  x.proposal.gaps = [{ id: "conflict", item_ids: ["plan-p"], kind: "conflict", impact: "blocks_handoff", status: "open", explanation: "Två oförenliga användarsvar", resolution: null }]; refresh(x); C.validatePacket(x);
  rejects(() => C.validatePacket(F.candidate(x)), "UNRESOLVED_ITEM");
});
test("review change manifest must match the exact proposal revision", () => {
  const x = F.base(); x.reviews[0].request.trigger = "material_change";
  rejects(() => C.validatePacket(x), "REVIEW_CHANGE");
});
test("a failed extraction can be replaced without deleting its history", () => {
  const x = F.base(), broken = F.source("appendix", "Unreadable"); broken.content = broken.content_sha256 = null; broken.extraction = "failed"; broken.extraction_note = "Syntetiskt fel";
  x.proposal.sources.push(broken, F.source("appendix", "Komplett extraktion av bilagan", "document", 2)); refresh(x);
  C.validatePacket(F.candidate(x)); assert.equal(x.proposal.sources.filter(s => s.id === "appendix").length, 2);
});
