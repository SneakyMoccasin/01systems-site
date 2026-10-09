'use strict';
// Reads only the two locked draft files, never the separate historical gold.
const fs = require('node:fs'), path = require('node:path');
const C = require('../../contracts/onboarding-v1/contract.cjs');
const A = require('./adapter.cjs'), { tapeFor } = require('./test-tape.cjs');
const freeze = require('../diagnostic/manifest.json');
function inputs() {
  return ['c3-r1-proposal.json', 'clear-proposal.json'].map(file => {
    const draftText = fs.readFileSync(path.join(__dirname, '../diagnostic', file), 'utf8');
    if (C.hash(draftText) !== freeze.files[`diagnostic/${file}`]) throw new Error('FROZEN_DRAFT_CHANGED');
    const snapshot = JSON.parse(draftText);
    return { name: file.replace('-proposal.json', ''), draftText, request: { proposal_digest: C.digest(snapshot), snapshot, trigger: 'first_draft', changed_item_ids: [], prior_finding_ids: [], trust: 'data_only' } };
  });
}
async function runCases(directory) {
  fs.mkdirSync(directory);
  const summary = [];
  for (const { name, draftText, request } of inputs()) {
    const prepared = A.prepare(request, { draftText });
    // Prescribed responses are test outputs. They are never part of the review request.
    const problems = name === 'c3-r1' ? [{ target: 'assumption_test_day', field: 'type', classification: 'incorrect', sourceId: 'answer-new',
      explanation: 'TEST DOUBLE: en rättad faktisk bokning är inte ett uttryckligt kundvalt scenario. Detta svar är förskrivet, inte upptäckt av AI.' }] : [];
    const receipt = await A.reviewRecorded(request, tapeFor(prepared, problems), { draftText });
    await A.saveReceipt(path.join(directory, `${name}.receipt.json`), receipt);
    summary.push({ case: name, sr_status: receipt.original_sr_result.status, ce3_status: receipt.result.status, fields: receipt.field_coverage.fields.length,
      findings: receipt.result.findings.length, unmapped: receipt.unmapped.length, contract_valid: prepared.contract.valid });
  }
  fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify({ mode: 'OFFLINE INTEGRATION TEST DOUBLES; NOT DETECTION EVIDENCE', external_ai_calls: 0, cost_usd: 0, cases: summary }, null, 2) + '\n', { flag: 'wx' });
  return summary;
}
if (require.main === module) {
  if (!process.argv[2] || process.argv.length !== 3) { console.error('Usage: node diagnostic.cjs NEW_OUTPUT_DIRECTORY (offline only)'); process.exitCode = 1; }
  else runCases(process.argv[2]).then(x => console.log(JSON.stringify(x, null, 2))).catch(e => { console.error(e.message); process.exitCode = 1; });
}
module.exports = { inputs, runCases };
