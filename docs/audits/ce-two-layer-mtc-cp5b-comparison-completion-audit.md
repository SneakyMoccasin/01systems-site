# CE Two-Layer MTC CP5B — Comparison Completion Audit

Status: **PASS**

Repository: `pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Starting commit: `32f3ba5e364078286b8063ad4e51732ab2b971ba`

Scope: CP5B only. CP6, Clean MU and Test 01A are not started.

## 1. Policy and comparability

CP5B implements one closed identity-bearing policy:
`SEQUENCE_TIMING_ONLY`. It consumes validated CP5A results plus the immutable
scenario, contract and, where an unresolved result intentionally omits Layer 2,
the validated source-binding declaration required for fairness. It reruns
neither Layer 1 nor Layer 2 and does not derive Decision Space.

Comparability projects away only initiative start timing and its derived
completion boundary. It binds result/execution protocols, exact contract
semantic identity, initiative universe and non-schedule semantics, initial
authoritative state, resources, constraints, entitlements, horizon and source
bindings. Contract identity transitively binds evidence, assumptions, Layer 2
graph and persistence. Any mismatch returns canonical `not-comparable`
reasons and stops substantive comparison.

## 2. Comparison boundary and output

Completed pairs compare through the common horizon. If either execution is
failed-unresolved, comparison is explicitly `limited-unresolved` through the
minimum last committed period. The failed tentative period and later state are
never fabricated. Conflict evidence remains oriented by side. If either CP5A
result is `failed-bounds`, comparison returns `incomplete-bounds` and does not
present incomplete causal output as complete.

At each authoritative point the comparator records exact lifecycle, resource,
constraint, entitlement, Decision Space, source-event, observation-category
and causal-path differences. First divergence retains every dimension at the
earliest point in canonical order. Decision Space output contains explicit
A-only, B-only and shared eligible identities plus the original CP5A
classifications and reason chains.

Difference intervals report first/last differing points, exact convergence
where equivalence returns, or persistence through the authority boundary.
Terminal structural and Decision Space equivalence are reported separately
from historical divergence. Identical runs return
`no-compared-difference` without manufacturing a finding.

## 3. Layer 2 and provenance

Layer 2 comparison preserves node/category and canonical path semantics. Path
identities remain oriented provenance only; path, observation and duration
cardinality never become magnitude. A direct fixture proves persistent causal
path provenance can differ at a period where Decision Space is equivalent,
followed by a later schedule-produced Decision Space difference, without Layer
2 authority.

Every difference points to A and B CP5A result identities. Decision Space
differences additionally retain both snapshot identities; causal-path
differences retain both path-identity sets. Embedded CP5A artifacts complete
the run-local chains to state/history, scenario/contract, source event,
binding, edge and evidence reference or explicit assumption.

## 4. No valuation

The comparison contract has no winner, loser, preference, recommendation,
rank, score, utility, benefit, harm, severity, optionality, Structural Margin,
magnitude or weighted-result mechanism. A mandatory adversarial test supplies
different eligible memberships, observation presence and causal paths and
proves the result remains purely descriptive. A/B orientation swaps oriented
sets and provenance without implying baseline correctness or preference.

## 5. Verification and issue log

The scoped MTC suite passes 95/95. The CP5B file adds twelve direct tests and
import isolation adds one test. The frozen tracked-only manifest contains 94
test files: the 93-file baseline plus one CP5B file. The root package passes
899/899 and `01systems-site` passes 10/10, for 909/909 total (the 896-test
baseline plus thirteen tests), with zero failures, skips, cancellations or
todos. TypeScript, scoped MTC lint and `git diff --check` pass. No Golden or
hash fixture was regenerated or modified. No CP1–CP5A production module
imports comparison.

Elapsed implementation and verification time is self-reported, approximately
50 minutes, and is not independently verified throughput.

- IMPLEMENTATION DEFECT: canonical comparison initially used `null` as an
  absence sentinel, which the canonical JSON boundary correctly rejected; an
  explicit typed absence object replaced it.
- IMPLEMENTATION DEFECT: the initial unresolved fixture attached forbidden
  horizon-wide Layer 2 output; it now retains separate validated bindings for
  fairness and omits evaluation exactly as CP5A requires.
- IMPLEMENTATION DEFECT: one capacity fairness mutation did not update the
  corresponding scenario instance and failed validation before comparison; the
  valid paired mutation now reaches the intended fail-closed gate.
- DOMAIN/PROFILE ISSUE: none.
- FALSIFYING TECHNICAL CONTRADICTION: none.
- POST-TEST BACKLOG: exact 262,145th observation-occurrence test, per-edge
  timing, source fan-out, richer unknown/dispute semantics, domain-specific
  persistence termination, generalized intervention policies, optimization,
  full reachability, joint portfolio Decision Space and Full V2 remain out of
  scope.

A9, CP5's portion of A10 and A13 close at this implementation checkpoint,
subject to separate independent verification. CP6 retains the vertical proof
and final bounded finding projection assigned by the coverage matrix.
