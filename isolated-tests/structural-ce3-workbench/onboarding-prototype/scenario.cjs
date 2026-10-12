'use strict';
// Explicit demonstration data. No text interpretation or model calls.
const C = require('../contracts/onboarding-v1/contract.cjs');
const { ref } = require('../onboarding-session/manual-example.cjs');
const question = 'Vad krävs innan vi får starta driften?';
const answer = day => `Dag ${day} är ett mål. Godkännande kräver ett separat besked.`;
const base = 'Vi planerar ett funktionsprov. Driftstart kräver ett godkännande från ansvarig.';
const limit = 'Kostnaden är inte känd. Vi vill bara kontrollera villkoret för driftstart, inte förutsäga tid eller kostnad.';
const cases = [
  { id: 'unclear', title: 'En viktig oklarhet', description: 'Ett tidsmål har blivit ett godkännande.', question, situation: `${base} Förhoppningsvis klart dag 2. ${limit}` },
  { id: 'clear', title: 'Tydligt underlag', description: 'Mål och godkännande hålls isär från början.', question, situation: `${base} ${answer(2)} ${limit}` },
];
function item(id, kind, statement, type, value, source, quote, depends_on = []) {
  return { id, kind, statement, type, status: 'known', value, unit: null, refs: [ref(source, quote)], depends_on, supersedes: [], rationale: 'Förskrivet demonstrationsförslag; inte AI-genererat.', scenario_choice: null };
}
function proposal(view, caseId) {
  const brief = view.sources.find(s => s.id === 'situation'), goal = view.sources.find(s => s.id === 'question');
  const fixture = cases.find(c => c.id === caseId);
  if (!fixture || brief.content !== fixture.situation || goal.content !== fixture.question) throw Error('UNSCRIPTED_INPUT');
  const previous = view.proposals.at(-1), latestAnswer = view.answers.at(-1);
  if (previous && !latestAnswer) throw Error('ANSWER_REQUIRED');
  if (latestAnswer && ![answer(2), answer(3)].includes(latestAnswer.text)) throw Error('UNSCRIPTED_ANSWER');
  const source = latestAnswer ? view.sources.find(s => s.id === latestAnswer.source_id && s.version === latestAnswer.source_version) : brief;
  const day = latestAnswer?.text === answer(3) ? 3 : 2;
  const corrected = Boolean(latestAnswer) || caseId === 'clear';
  const items = [
    item('plan', 'plan', 'Genomför ett funktionsprov', 'user_fact', 'Funktionsprov', brief, 'Vi planerar ett funktionsprov.'),
    item('criterion', 'criterion', 'Driftstart kräver ansvarigs godkännande', 'requirement', 'Godkännande före driftstart', brief, 'Driftstart kräver ett godkännande från ansvarig.', ['approval']),
    item('approval', 'rule', corrected ? 'Godkännande kräver ett separat besked' : 'Godkänt dag 2', corrected ? 'requirement' : 'document_fact', corrected ? 'Separat besked' : 'Godkänt dag 2', source, corrected ? 'Godkännande kräver ett separat besked.' : 'Förhoppningsvis klart dag 2.'),
  ];
  if (corrected) items.push({ ...item('target-day', 'value', `Dag ${day} är ett mål, ingen garanti`, 'goal', day, source, `Dag ${day} är ett mål.`), unit: 'dag enligt underlaget' });
  return { schema_version: 'ce3-onboarding-proposal/1', id: 'customer-demo', revision: (previous?.revision ?? 0) + 1, profile: 'fixed-replay/0.1',
    analysis: { kind: 'check', question: goal.content, plan_ids: ['plan'], criterion_ids: ['criterion'], changed_assumption_ids: [] },
    scope: { includes: ['Kontroll av en plans deklarerade villkor för driftstart'], excludes: ['Faktisk godkännandetid och leveranstid', 'Kostnad och lönsamhet', 'Kompilering, profilvalidering och CE3-körning'] },
    sources: structuredClone(view.sources), items, gaps: [], change: { parent_digest: previous ? C.digest(previous) : null, changed_item_ids: previous ? items.map(i => i.id) : [], affected_finding_ids: view.reviews.flatMap(r => r.result.findings.map(f => `${r.id}/${f.id}`)), reason: previous ? 'Uttryckligt demosvar införs i ett nytt förskrivet förslag. Okända kostnader och godkännandetider fylls inte i.' : 'Förskrivet utkast för kunddialog. Oklarhetsfallet innehåller ett avsiktligt betydelsefel.' } };
}
module.exports = { cases, answer, proposal };
