"use strict";
// Explicit model proposals for a synthetic demonstration, never warehouse plans.
const C = require("../contracts/onboarding-v1/contract.cjs");
const { Session } = require("./session.cjs");
const { MockReviewAdapter, mockResult } = require("./mock-review.cjs");
const original = "Plan P är att genomföra en demonstration. En ansvarig ska godkänna resultatet. Förhoppningsvis klart dag 2.";
function ref(source, quote) {
  const start = source.content.indexOf(quote);
  if (start < 0) throw new Error("Citatet finns inte i manuellt underlag.");
  return { source_id: source.id, source_version: source.version, quote, start, end: start + quote.length, location: "Manuellt syntetiskt exempel" };
}
function item(id, kind, statement, type, value, refs) {
  return { id, kind, statement, type, status: "known", value, unit: null, refs, depends_on: [], supersedes: [], rationale: "Uttryckligen skrivet syntetiskt modellförslag.", scenario_choice: null };
}
function firstProposal(sources) {
  const s = sources[0];
  return { schema_version: "ce3-onboarding-proposal/1", id: "demo-plan", revision: 1, profile: "fixed-replay/0.1", analysis: { kind: "check", question: "Bevarar planen kravet på ansvarigs godkännande?", plan_ids: ["plan"], criterion_ids: ["criterion"], changed_assumption_ids: [] }, scope: { includes: ["Kontroll av en plans deklarerade godkännanderegel"], excludes: ["Verklig tidpunkt för godkännande, faktisk leverans, ekonomi och CE3-körning"] }, sources: structuredClone(sources), items: [item("plan", "plan", "Planerad demonstration", "document_fact", "Plan P", [ref(s, "Plan P är att genomföra en demonstration.")]), item("criterion", "criterion", "Ansvarigs godkännande krävs", "requirement", "Ansvarig godkänner", [ref(s, "En ansvarig ska godkänna resultatet.")]), item("approval", "rule", "Godkänt dag 2", "document_fact", "Godkänt dag 2", [ref(s, "Förhoppningsvis klart dag 2.")])], gaps: [], change: { parent_digest: null, changed_item_ids: [], affected_finding_ids: [], reason: "Första samlade utkastet; avsiktligt fel för sessionsprovet." } };
}
function meaningFinding(proposal) {
  return { id: "meaning-shift", target_ids: ["approval"], category: "meaning_shift", basis: "evidence", refs: [ref(proposal.sources[0], "Förhoppningsvis klart dag 2.")], searched_source_ids: [proposal.sources[0].id], explanation: "MOCK: Ett försiktigt tidsmål har blivit ett godkänt kontrollutfall. Testdata, ingen automatisk upptäckt.", suggested_question: "Är dag 2 ett mål, och hur ska resultatet godkännas?", impact: "blocks_handoff" };
}
function question(id = "q-approval", origin = "review-1/meaning-shift", impact = "blocks_handoff") {
  return { id, equivalence_key: "approval-vs-time", text: "Är dag 2 ett mål, och hur ska resultatet godkännas?", reasons: ["Förslaget räknar med ett godkännande som underlaget inte visar."], target_ids: ["approval"], origins: [{ actor: origin ? "sr" : "ai", ref_id: origin || "approval" }], impact, priority: 1, status: "open", answer_ids: [], merged_from: [], resolution: null };
}
function correctedProposal(view) {
  const previous = view.proposals.at(-1), p = structuredClone(previous), answer = view.sources.at(-1);
  p.sources = structuredClone(view.sources); p.revision = previous.revision + 1;
  p.items.find(i => i.id === "approval").statement = "Godkännande kräver ett separat besked";
  Object.assign(p.items.find(i => i.id === "approval"), { type: "requirement", value: "Separat godkännandebesked krävs", refs: [ref(answer, "Godkännande kräver ett separat besked.")] });
  p.items.push(item("target-day", "value", "Dag 2 är ett mål", "goal", 2, [ref(answer, "Dag 2 är ett mål.")])); p.items.at(-1).unit = "dag enligt underlag; kalender ej fastställd";
  p.change = { parent_digest: C.digest(previous), changed_item_ids: p.items.map(i => i.id), affected_finding_ids: view.reviews.flatMap(r => r.result.findings.map(f => `${r.id}/${f.id}`)), reason: "Kunden förtydligar mål respektive separat kontrollvillkor. Ingen godkännandetid anges." };
  return p;
}
function confirm(session, id) {
  const v = session.view();
  return session.confirm({ id, proposal_digest: v.proposal_digest, evidence_digest: v.evidence_digest, context_digest: v.context_digest, by: "Syntetisk testkund", text: "Testdata: jag bekräftar detta utkast och dess avgränsningar, inte CE3-körbarhet.", scope_acknowledged: true });
}
function setup() {
  const session = new Session("synthetic-session");
  session.registerSource({ id: "brief", text: original, replaces_version: null });
  session.submitProposal(firstProposal(session.view().sources));
  return session;
}
async function demonstrate() {
  const session = setup(), checkpoints = [];
  const take = label => checkpoints.push({ label, revision: session.view().proposals.at(-1).revision, ...session.view().statuses });
  const first = session.view().proposals[0];
  session.requestReview("review-1");
  await session.runReview("review-1", new MockReviewAdapter({ [C.digest(first)]: mockResult(first, [meaningFinding(first)]) }));
  session.addQuestions([question()]);
  // Deliberately early confirmation: it cannot override the blocking finding/question.
  confirm(session, "early-confirmation");
  take("Första förslaget har mockfynd och en blockerande fråga");
  let refused = false;
  try { session.createHandoff("premature"); } catch { refused = true; }
  if (!refused) throw new Error("För tidig överlämning accepterades.");
  session.answer({ id: "answer-1", question_id: "q-approval", text: "Dag 2 är ett mål. Godkännande kräver ett separat besked.", replaces_answer_id: null });
  take("Nytt kundsvar gör granskning och tidig bekräftelse inaktuella");
  const corrected = correctedProposal(session.view());
  session.submitProposal(corrected);
  take("Uttryckligt nytt förslag; gamla fyndet finns kvar");
  session.requestReview("review-2");
  await session.runReview("review-2", new MockReviewAdapter({ [C.digest(corrected)]: mockResult(corrected) }));
  session.handleFinding({ review_id: "review-1", finding_id: "meaning-shift", status: "resolved", reason: "Mål dag 2 och separat godkännandebesked är åtskilda i version 2; ny mockgranskning finns.", by: "Syntetisk testgranskare" });
  confirm(session, "current-confirmation");
  const handoff = session.createHandoff("handoff-1");
  take("Redo för separat kompilering och validering; inte körd");
  return { session, checkpoints, handoff, premature_handoff_rejected: refused };
}
module.exports = { original, ref, firstProposal, correctedProposal, meaningFinding, question, confirm, setup, demonstrate };
