'use strict';
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const C = require('../../contracts/onboarding-v1/contract.cjs');
const pin = require('./sr-code-pin.json');
const STAGES = ['grounded_claim_extraction', 'grounded_support_assessment', 'grounded_adjudication'];
function verifyCode(root = '/Users/christian/Projects/skeptical-reader') {
  let head;
  try { head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch { throw new Error('SR_VERSION_UNAVAILABLE: kan inte verifiera SR:s fullständiga commitidentitet.'); }
  if (head !== pin.commit) throw new Error(`SR_VERSION_MISMATCH: kräver ${pin.commit}, hittade ${head}. Ingen granskning startad.`);
  for (const [file, expected] of Object.entries(pin.files)) {
    let hash; try { hash = C.hash(fs.readFileSync(path.join(root, file))); } catch { /* missing file is a mismatch */ }
    if (hash !== expected) throw new Error(`SR_FILE_MISMATCH: ${file}. Återställ exakt pinnad kod; ingen granskning startad.`);
  }
  // Untracked sibling modules could otherwise shadow a verified extensionless import.
  const extra = execFileSync('git', ['-C', root, 'ls-files', '--others', '--exclude-standard', '--', 'src/lib'], { encoding: 'utf8' }).trim();
  if (extra) throw new Error('SR_UNTRACKED_CODE: oregistrerade filer i src/lib kan påverka importerna. Ingen granskning startad.');
  return { root, identity: { commit: head, pin_digest: C.digest(pin), contract: pin.contract } };
}
function loadSR(root) {
  const verified = verifyCode(root);
  const loader = require(path.join(verified.root, 'node_modules/tsx/dist/cjs/api/index.cjs'));
  const load = file => loader.require(path.join(verified.root, 'src/lib', file), __filename);
  return { ...load('grounded/structured-v1/run.ts'), contracts: load('grounded/structured-v1/contracts.ts'),
    ...load('text.ts'), ...verified };
}
async function runRecorded(input, script, options = {}) {
  const sr = loadSR(options.srRoot), tape = structuredClone(script);
  if (tape.label !== 'SYNTHETIC TEST DOUBLE — NOT AI DETECTION' || !Array.isArray(tape.steps)) throw new Error('EXPLICIT_TEST_TAPE_REQUIRED');
  let index = 0;
  const provider = { name: 'ce3-structured-sr-test-double', model: 'offline-scripted-data', mode: 'mock', async generateStructured(request) {
    const step = tape.steps[index++];
    if (!step || step.stage !== request.stage || STAGES[index - 1] !== request.stage) throw new Error('RECORDED_STAGE_MISMATCH');
    if (step.error) throw new Error('RECORDED_PROVIDER_FAILURE');
    // Actual SR validates the untouched data and records malformed responses itself.
    return { data: structuredClone(step.data), usage: { apiCalls: 0, estimatedCostUsd: 0 }, diagnostic: { repairUsed: false, returnedModel: 'offline-scripted-data' } };
  }};
  const original = await sr.runStructuredGroundedReview(input, provider, 'sv', { fingerprintKey: 'ce3-structured-offline-fingerprint-0001' });
  return { original: JSON.parse(JSON.stringify(original)), sr_code: sr.identity };
}
// These are the only nondeterministic fields produced by real SR during replay.
function replayComparable(value) {
  const r = structuredClone(value);
  for (const stage of r.stages) delete stage.durationMs;
  if (r.grounded) for (const key of ['runId', 'durationMs', 'stageDurationsMs', 'completedAt']) delete r.grounded.metadata[key];
  return r;
}
module.exports = { verifyCode, loadSR, runRecorded, replayComparable, STAGES };
