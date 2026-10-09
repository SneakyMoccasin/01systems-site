"use strict";
const C = require("../contracts/onboarding-v1/contract.cjs");

// Adapter boundary: review(exactContractRequest) -> Promise<contractReviewResult>.
// Responses are explicitly authored test data, keyed by the exact proposal digest.
class MockReviewAdapter {
  #responses;
  constructor(responses) { this.#responses = new Map(Object.entries(structuredClone(responses))); }
  async review(request) {
    const result = this.#responses.get(request.proposal_digest);
    if (!result) throw new Error("Inget mockbesked angivet för denna exakta modellversion.");
    return structuredClone(result);
  }
}
function mockResult(proposal, findings = []) {
  return { status: "complete", assessed_item_ids: C.active(proposal).map(i => i.id), findings: structuredClone(findings), limitations: ["SYNTETISKA TESTDATA: handskrivet mockbesked; ingen AI eller Skeptical Reader har körts."], producer: { mode: "synthetic", adapter: "manual-session-mock/1", model: null, prompt_version: "not-a-prompt/mock-data-1" } };
}
module.exports = { MockReviewAdapter, mockResult };
