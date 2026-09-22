# CE Two-Layer MTC CP6 — Terminal-Equivalence Projection Correction

Status: **PASS**

Starting commit: `109a5339cfefaad7680d925bf2f7d1e7b3cb54aa`

Scope: localized CP6 finding-projector correction only. CP7, Clean MU and
Test 01A were not started.

## Root cause and authoritative rule

The projector emitted `terminal-equivalence` for every comparison whose status
was `compared`. That status establishes only that comparison was valid; it
does not establish terminal equality.

CP5B exposes two independently derived authoritative facts:
`terminalStructuralEquivalent` and `terminalDecisionSpaceEquivalent`. The
unqualified CP6 `terminal-equivalence` category is now projected only when
both facts are true. The finding carries those facts directly as
`{ structural: true, decisionSpace: true }`; CP6 does not reconstruct terminal
snapshots or infer either fact from the other.

## Truth table and interface review

Direct production comparisons establish the reachable combinations:

- false / false: no terminal-equivalence finding;
- true / true: exactly one terminal-equivalence finding;
- false / true: no terminal-equivalence finding.

The false/true state is reachable because Decision Space is a coarser semantic
projection than the complete authoritative state. True/false is not reachable
under the frozen contract: with the same scenario and contract, Decision Space
is deterministically derived from the same authoritative structural state, so
structural equality cannot produce Decision Space inequality.

The bounded CP5B-to-CP6 review found no second defect. Convergence remains an
interval fact distinct from terminal equivalence. Historical divergence and
terminal inequality remain representable. No-compared-difference remains a
separate finding and can coexist with genuine true/true terminal equivalence.

The positive finding retains comparison identity, A/B result orientation and
raw result provenance. Removing the false finding does not change structural
or causal findings, intervals, snapshot/path provenance, or raw comparison
output.

## Verification

The defective baseline was 2 logical suites, 95 tracked test files and 920
tests. Three tests were added to the existing CP6 test file, producing the
expected 2 suites, 95 files and 923 tests. Actual results: root 913/913 and
`01systems-site` 10/10, for 923 discovered, run and passed, with zero failures,
skips, cancellations or todos. The scoped MTC suite passes 109/109.
TypeScript, scoped lint, import isolation and `git diff --check` pass.

The 4,096 bound and explicit overflow behavior are unchanged. An exact 4,097
committed-boundary test was not added and remains a non-blocking **PRE-CP8
HARDENING CANDIDATE**.

- IMPLEMENTATION DEFECT: compared status was incorrectly treated as terminal
  equivalence; corrected by direct projection of both CP5B terminal facts.
- FIXTURE/TEST DEFECT: none.
- ARCHITECTURE-SENSITIVE ISSUE: none.
- HARDENING BACKLOG: exact 4,097 finding-boundary test before CP8.

No V1, Layer 1, Layer 2, Decision Space, CP5A or CP5B production file changed.
No finding category, analytical capability, value judgment or ranking was
introduced. Goldens and hash fixtures are unchanged.
