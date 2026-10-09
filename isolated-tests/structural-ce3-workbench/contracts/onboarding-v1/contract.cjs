/* Offline contract checks only. No model generation, SR call, translation or replay. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true, coerceTypes: false, useDefaults: false, removeAdditional: false });
for (const name of ["proposal", "review", "dialogue", "handoff"]) {
  ajv.addSchema(JSON.parse(fs.readFileSync(path.join(__dirname, "schemas", `${name}.schema.json`), "utf8")));
}
const fail = (code, detail) => { throw new Error(`${code}: ${detail}`); };
const need = (ok, code, detail) => { if (!ok) fail(code, detail); };
function canonical(value) {
  if (typeof value === "number") need(Number.isFinite(value), "NON_FINITE", "JSON number");
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
const hash = text => crypto.createHash("sha256").update(text, "utf8").digest("hex");
const digest = value => hash(canonical(value));
const same = (a, b) => canonical(a) === canonical(b);
const active = p => p.items.filter(i => i.status !== "superseded");
const sourceKey = s => `${s.id}@${s.version ?? s.source_version}`;
const unique = (values, label) => need(new Set(values).size === values.length, "DUPLICATE", label);
const exactSet = (a, b) => same([...a].sort(), [...b].sort());
function schema(name, value) {
  const validate = ajv.getSchema(`urn:ce3:onboarding:${name}:1`);
  need(validate(value), "SCHEMA", `${name} ${ajv.errorsText(validate.errors)}`);
}
function sourceCheck(s) {
  if (["complete", "partial"].includes(s.extraction)) {
    need(typeof s.content === "string" && s.content_sha256 === hash(s.content), "SOURCE_HASH", sourceKey(s));
  } else {
    need(s.content === null && s.content_sha256 === null, "EXTRACTION_STATE", sourceKey(s));
  }
  if (s.extraction !== "complete") need(Boolean(s.extraction_note), "EXTRACTION_NOTE", sourceKey(s));
}
function checkRef(ref, sources) {
  const s = sources.find(s => s.id === ref.source_id && s.version === ref.source_version);
  need(s && typeof s.content === "string", "SOURCE_REFERENCE", `${ref.source_id}@${ref.source_version}`);
  need(ref.end > ref.start && s.content.slice(ref.start, ref.end) === ref.quote, "QUOTE", ref.source_id);
  return s;
}
function proposalCheck(p) {
  schema("proposal", p);
  unique(p.sources.map(sourceKey), "sources"); unique(p.items.map(i => i.id), "items"); unique(p.gaps.map(g => g.id), "gaps");
  p.sources.forEach(sourceCheck);
  const ids = new Set(p.items.map(i => i.id));
  const live = new Map(active(p).map(i => [i.id, i]));
  for (const item of p.items) {
    item.refs.forEach(r => checkRef(r, p.sources));
    unique(item.depends_on, item.id); unique(item.supersedes, item.id);
    for (const id of [...item.depends_on, ...item.supersedes]) need(ids.has(id) && id !== item.id, "ITEM_REFERENCE", id);
    for (const id of item.supersedes) need(p.items.find(i => i.id === id).status === "superseded", "SUPERSESSION", id);
    if (["unknown", "conflict"].includes(item.status)) need(item.value === null, "UNKNOWN_VALUE", item.id);
    if (item.status === "known") {
      need(item.value !== null, "KNOWN_VALUE", item.id);
      need(item.refs.length > 0 || item.type === "ai_proposal", "PROVENANCE", item.id);
    }
    if (item.type === "scenario_assumption" && item.status === "known") {
      need(item.scenario_choice !== null, "SCENARIO_CHOICE", item.id);
      need(checkRef(item.scenario_choice, p.sources).kind === "answer", "SCENARIO_CHOICE", item.id);
    } else need(item.scenario_choice === null, "SCENARIO_LABEL", item.id);
    if (item.status === "conflict") need(p.gaps.some(g => g.kind === "conflict" && g.status === "open" && g.item_ids.includes(item.id)), "CONFLICT_RECORD", item.id);
  }
  const a = p.analysis;
  for (const [key, kind] of [["plan_ids", "plan"], ["criterion_ids", "criterion"], ["changed_assumption_ids", "assumption"]]) {
    unique(a[key], key);
    for (const id of a[key]) need(live.get(id)?.kind === kind, "ANALYSIS_REFERENCE", id);
  }
  if (a.kind === "none") need(!a.plan_ids.length && !a.criterion_ids.length && !a.changed_assumption_ids.length, "NO_ANALYSIS", "No forced plans");
  else {
    need(a.plan_ids.length >= (a.kind === "choose" ? 2 : 1) && a.criterion_ids.length > 0, "ANALYSIS_SCOPE", a.kind);
    if (a.kind === "change") need(a.changed_assumption_ids.length > 0, "ANALYSIS_SCOPE", "Changed assumption missing");
  }
  for (const g of p.gaps) {
    for (const id of g.item_ids) need(ids.has(id), "GAP_REFERENCE", id);
    if (g.status !== "open") need(Boolean(g.resolution), "GAP_REASON", g.id);
    need(!(g.impact === "blocks_handoff" && g.status === "accepted_limit"), "BLOCKER_NOT_LIMIT", g.id);
  }
  unique(p.change.changed_item_ids, "changed items");
  for (const id of p.change.changed_item_ids) need(ids.has(id), "CHANGE_REFERENCE", id);
  need((p.revision === 1) === (p.change.parent_digest === null), "PARENT", p.id);
}
function reviewCheck(r) {
  schema("review", r); proposalCheck(r.request.snapshot);
  const p = r.request.snapshot;
  need(r.request.proposal_digest === digest(p), "REVIEW_DIGEST", r.id);
  need(r.request.trigger === (p.revision === 1 ? "first_draft" : "material_change") && exactSet(r.request.changed_item_ids, p.change.changed_item_ids) && exactSet(r.request.prior_finding_ids, p.change.affected_finding_ids), "REVIEW_CHANGE", r.id);
  const ids = active(p).map(i => i.id);
  unique(r.result.assessed_item_ids, "assessed items");
  for (const id of r.result.assessed_item_ids) need(ids.includes(id), "REVIEW_TARGET", id);
  if (r.result.status === "complete") need(exactSet(ids, r.result.assessed_item_ids), "REVIEW_COVERAGE", r.id);
  if (r.result.status !== "complete") need(r.result.limitations.length > 0, "REVIEW_LIMITATION", r.id);
  unique(r.result.findings.map(f => f.id), "findings");
  for (const f of r.result.findings) {
    for (const id of f.target_ids) need(ids.includes(id), "FINDING_TARGET", id);
    f.refs.forEach(ref => checkRef(ref, p.sources));
    for (const id of f.searched_source_ids) need(p.sources.some(s => s.id === id), "SEARCH_SCOPE", id);
    if (f.basis === "evidence") need(f.refs.length > 0, "FINDING_EVIDENCE", f.id);
    if (f.basis === "absence_in_supplied_material") {
      need(f.category === "unsupported" && f.searched_source_ids.length > 0, "ABSENCE_SCOPE", f.id);
    }
    need((f.basis === "review_hypothesis") === (f.category === "hypothesis"), "HYPOTHESIS_LABEL", f.id);
  }
}
function reviewStatus(p, reviews) {
  const matching = reviews.filter(r => r.request.proposal_digest === digest(p));
  if (matching.some(r => r.result.status === "complete")) return "current";
  if (matching.length) return "incomplete";
  return reviews.length ? "stale" : "not_requested";
}
function findingKey(r, f) { return `${r.id}/${f.id}`; }
function validatePacket(packet) {
  need(exactSet(Object.keys(packet), ["proposal", "reviews", "dialogue", "handoff"]), "PACKET_FIELDS", "Four envelopes");
  const { proposal: p, reviews, dialogue: d, handoff: h } = packet;
  proposalCheck(p); need(Array.isArray(reviews), "REVIEWS", "Expected array");
  reviews.forEach(reviewCheck); unique(reviews.map(r => r.id), "reviews");
  schema("dialogue", d); schema("handoff", h);
  need(d.proposal_digest === digest(p) && h.proposal_digest === digest(p), "CURRENT_DIGEST", p.id);
  need(h.review_status === reviewStatus(p, reviews), "REVIEW_STATUS", p.id);
  const items = new Set(p.items.map(i => i.id));
  const findings = new Map(reviews.flatMap(r => r.result.findings.map(f => [findingKey(r, f), f])));
  for (let index = 0; index < reviews.length; index++) {
    const prior = new Set(reviews.slice(0, index).flatMap(r => r.result.findings.map(f => findingKey(r, f))));
    for (const id of reviews[index].request.prior_finding_ids) need(prior.has(id), "PRIOR_FINDING", id);
  }
  unique(h.dispositions.map(x => `${x.review_id}/${x.finding_id}`), "dispositions");
  for (const disp of h.dispositions) {
    need(findings.has(`${disp.review_id}/${disp.finding_id}`), "DISPOSITION_TARGET", disp.finding_id);
    if (disp.status !== "open") need(Boolean(disp.reason && disp.by), "DISPOSITION_REASON", disp.finding_id);
    if (disp.status === "resolved") {
      const r = reviews.find(r => r.id === disp.review_id);
      need(r.request.proposal_digest !== digest(p) && h.review_status === "current", "RESOLUTION_REVIEW", disp.finding_id);
    }
  }
  for (const id of p.change.affected_finding_ids) need(findings.has(id), "FINDING_IMPACT", id);
  const unresolved = [...findings.keys()].filter(key => {
    const disp = h.dispositions.find(d => `${d.review_id}/${d.finding_id}` === key);
    return !disp || ["open", "accepted"].includes(disp.status);
  });
  need(exactSet(unresolved, h.unresolved_finding_ids), "OPEN_FINDINGS", "Includes prior reviews");
  unique(d.questions.map(q => q.id), "questions"); unique(d.answers.map(a => a.id), "answers");
  for (const q of d.questions) {
    q.target_ids.forEach(id => need(items.has(id), "QUESTION_TARGET", id));
    for (const o of q.origins) {
      if (o.actor === "sr") need(findings.has(o.ref_id), "QUESTION_ORIGIN", o.ref_id);
      if (o.actor === "ai") need(items.has(o.ref_id) || p.gaps.some(g => g.id === o.ref_id), "QUESTION_ORIGIN", o.ref_id);
      if (o.actor === "customer") need(p.sources.some(s => s.id === o.ref_id && s.kind === "answer"), "QUESTION_ORIGIN", o.ref_id);
    }
    q.answer_ids.forEach(id => need(d.answers.some(a => a.id === id && [q.id, ...q.merged_from].includes(a.question_id)), "QUESTION_ANSWER", id));
    if (q.status === "answered") need(q.answer_ids.length > 0, "ANSWER_MISSING", q.id);
    if (["deferred", "withdrawn"].includes(q.status)) need(Boolean(q.resolution), "QUESTION_REASON", q.id);
  }
  for (const a of d.answers) {
    need(d.questions.some(q => [q.id, ...q.merged_from].includes(a.question_id)), "ANSWER_QUESTION", a.id);
    const s = p.sources.find(s => s.id === a.source_id && s.version === a.source_version);
    need(s?.kind === "answer" && s.content === a.text, "ANSWER_SOURCE", a.id);
    if (a.replaces_answer_id !== null) need(d.answers.slice(0, d.answers.indexOf(a)).some(old => old.id === a.replaces_answer_id && old.question_id === a.question_id), "ANSWER_REPLACEMENT", a.id);
  }
  need(exactSet(d.questions.filter(q => ["open", "deferred"].includes(q.status)).map(q => q.id), h.unresolved_question_ids), "OPEN_QUESTIONS", p.id);
  const conf = h.confirmation;
  if (conf.status !== "not_requested") {
    need(Boolean(conf.proposal_digest && conf.by && conf.record && conf.scope_acknowledged), "CONFIRMATION_RECORD", p.id);
    sourceCheck(conf.record);
    need(conf.record.kind === "answer" && conf.record.extraction === "complete", "CONFIRMATION_RECORD", p.id);
    need((conf.status === "confirmed") === (conf.proposal_digest === digest(p)), "CONFIRMATION_STALE", p.id);
    if (conf.status === "confirmed") need(exactSet(conf.item_ids, active(p).map(i => i.id)), "CONFIRMATION_SCOPE", p.id);
  } else need(conf.proposal_digest === null && conf.record === null && conf.item_ids.length === 0 && conf.by === null && !conf.scope_acknowledged, "CONFIRMATION_RECORD", "Unexpected confirmation data");
  if (h.dialogue_status === "closed_no_analysis") need(p.analysis.kind === "none", "NO_ANALYSIS", p.id);
  if (h.readiness === "candidate_for_validation" || h.dialogue_status === "ready_for_translation") {
    need(h.readiness === "candidate_for_validation" && h.dialogue_status === "ready_for_translation", "HANDOFF_STATUS", p.id);
    need(p.analysis.kind !== "none" && h.review_status === "current" && conf.status === "confirmed", "HANDOFF_GATES", p.id);
    need(p.profile === "fixed-replay/0.1", "PROFILE_UNASSESSED", p.profile);
    const latestSources = p.sources.filter(s => !p.sources.some(t => t.id === s.id && t.version > s.version));
    need(latestSources.every(s => s.extraction === "complete") && active(p).every(i => i.refs.every(r => checkRef(r, p.sources).extraction === "complete")), "EXTRACTION_BLOCK", p.id);
    need(active(p).every(i => i.status === "known" && i.type !== "ai_proposal"), "UNRESOLVED_ITEM", p.id);
    need(!p.gaps.some(g => g.status === "open"), "OPEN_GAP", p.id);
    need(!d.questions.some(q => ["open", "deferred"].includes(q.status) && q.impact === "blocks_handoff"), "BLOCKING_QUESTION", p.id);
    need(!unresolved.some(key => findings.get(key).impact === "blocks_handoff"), "BLOCKING_FINDING", p.id);
    const scopeItems = [...d.questions.filter(q => ["open", "deferred"].includes(q.status)).flatMap(q => q.target_ids), ...unresolved.flatMap(key => findings.get(key).target_ids)];
    need(scopeItems.every(id => p.gaps.some(g => g.status === "accepted_limit" && g.item_ids.includes(id))), "UNACKNOWLEDGED_LIMIT", p.id);
  }
  return true;
}
/* Only explicitly equivalent open questions merge; no NLP or invented answer. */
function mergeQuestions(questions) {
  const groups = new Map();
  for (const q of structuredClone(questions)) {
    const key = q.status === "open" ? canonical([q.equivalence_key, [...q.target_ids].sort()]) : q.id;
    if (!groups.has(key)) { groups.set(key, q); continue; }
    const first = groups.get(key);
    first.reasons = [...new Set([...first.reasons, ...q.reasons])];
    first.origins = [...new Map([...first.origins, ...q.origins].map(o => [canonical(o), o])).values()];
    first.merged_from = [...new Set([...first.merged_from, q.id, ...q.merged_from])];
    first.priority = Math.min(first.priority, q.priority);
    if (q.impact === "blocks_handoff") first.impact = "blocks_handoff";
  }
  return [...groups.values()].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
}
function validateTransition(before, after) {
  validatePacket(before); validatePacket(after);
  const a = before.proposal, b = after.proposal;
  need(a.id === b.id && b.revision === a.revision + 1 && b.change.parent_digest === digest(a), "REVISION_CHAIN", b.id);
  for (const s of a.sources) need(b.sources.some(t => sourceKey(s) === sourceKey(t) && same(s, t)), "SOURCE_REWRITE", sourceKey(s));
  for (const i of a.items) need(b.items.some(j => i.id === j.id), "ITEM_HISTORY", i.id);
  for (const i of b.items) {
    const old = a.items.find(j => j.id === i.id);
    if (old && ["unknown", "conflict"].includes(old.status) && i.status === "known") {
      need(!same(old.refs, i.refs) || (i.type === "scenario_assumption" && i.scenario_choice !== null), "RESOLUTION_SOURCE", i.id);
    }
  }
  const changed = new Set(b.items.filter(i => !same(i, a.items.find(j => j.id === i.id))).map(i => i.id));
  if (!same(a.sources, b.sources) || !same(a.analysis, b.analysis) || !same(a.scope, b.scope) || a.profile !== b.profile || !same(a.gaps, b.gaps)) active(b).forEach(i => changed.add(i.id));
  let size;
  do { size = changed.size; b.items.filter(i => i.depends_on.some(id => changed.has(id))).forEach(i => changed.add(i.id)); } while (size !== changed.size);
  need([...changed].every(id => b.change.changed_item_ids.includes(id)), "CHANGE_IMPACT", [...changed].join(","));
  for (const r of before.reviews) {
    need(after.reviews.some(s => same(r, s)), "REVIEW_HISTORY", r.id);
    for (const f of r.result.findings) if (f.target_ids.some(id => changed.has(id))) need(b.change.affected_finding_ids.includes(findingKey(r, f)), "FINDING_IMPACT", f.id);
  }
  for (const ans of before.dialogue.answers) need(after.dialogue.answers.some(x => same(x, ans)), "ANSWER_HISTORY", ans.id);
  for (const q of before.dialogue.questions) need(after.dialogue.questions.some(x => x.id === q.id || x.merged_from.includes(q.id)), "QUESTION_HISTORY", q.id);
  for (const disp of before.handoff.dispositions) need(after.handoff.dispositions.some(x => x.review_id === disp.review_id && x.finding_id === disp.finding_id), "DISPOSITION_HISTORY", disp.finding_id);
  return true;
}
module.exports = { schema, digest, hash, active, reviewStatus, validatePacket, validateTransition, mergeQuestions };
