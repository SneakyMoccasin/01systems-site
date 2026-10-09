"use strict";
const { Session } = require("./session.cjs");
const { demonstrate } = require("./manual-example.cjs");
const C = require("../contracts/onboarding-v1/contract.cjs");
async function main() {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) throw new Error("Använd: node demo.cjs /ny/lokal/sessionsfil.json");
  const result = await demonstrate();
  const saved = result.session.save(file), reopened = Session.load(saved);
  if (C.digest(result.session.view()) !== C.digest(reopened.view())) throw new Error("Återöppningen ändrade sessionsläget.");
  process.stdout.write(JSON.stringify({ synthetic_test_data: true, saved, checkpoints: result.checkpoints, premature_handoff_rejected: result.premature_handoff_rejected, reopened_identically: true, model: result.handoff.model, evidence: result.handoff.evidence, review: result.handoff.review, status: result.handoff.status, ce3_validation_status: "not_run", ce3_run_status: "not_run" }, null, 2) + "\n");
}
if (require.main === module) main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
