# CE Two-Layer MTC CP5 — Mandatory Split Checkpoint

Status: **SPLIT REQUIRED**

Repository: `pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Starting commit: `f1d4341d828d6b3e981d4b492f0bbc267045e65c`

Decision: split CP5 into **CP5A — Decision Space and Single-Run Result** and
**CP5B — Sequence Comparability and A/B Comparison**. This checkpoint is
documentation only. Neither implementation half is started here.

## 1. Authority and unchanged architecture

This split refines checkpoint sequencing; it does not change the frozen
Two-layer MTC architecture or expand CP5 scope. The authoritative sources
remain:

- [`ce-minimum-sufficient-architecture-two-layer-mtc-freeze.md`](./ce-minimum-sufficient-architecture-two-layer-mtc-freeze.md)
- [`ce-test01a-coverage-matrix.md`](./ce-test01a-coverage-matrix.md)
- the implemented CP1–CP4B contracts and tests at the starting commit.

Layer 1 remains the sole execution authority. Layer 2 remains analytical and
non-authoritative. CP5 compares but never values: neither half may introduce a
winner, recommendation, rank, score, utility, preference, optimization,
magnitude, Structural Margin, or an inference that more options or causal
paths are better or stronger.

## 2. Why the split is mandatory

CP5 contains two independently dangerous mechanisms with a real dependency
boundary.

First, Decision Space is authority-adjacent. The current CP3B executor uses one
internal eligibility implementation while period records contain scheduled
candidate decisions and committed state identities, not a reusable
all-pending-initiative Decision Space projection. CP5A must expose or reuse the
same authoritative eligibility semantics and provide sufficient immutable
committed-state reads without creating a second rule engine or changing
admission. A defect here would be an eligibility-authority drift defect.

Second, A/B comparison introduces independent fairness and epistemic risks. It
must reject non-schedule semantic changes under a sequence-only policy,
compare completed, unresolved and failed-bounds results without fabricating
state, define canonical same-boundary divergence and convergence, and retain
cross-run provenance without ranking. A defect here would be a comparability or
interpretation defect, even if each single-run result were correct.

CP5B necessarily consumes the stable identities, statuses, snapshots and
provenance contract produced by CP5A. Implementing both together would allow a
comparison test to pass through mutually compensating defects and would make
failures difficult to localize between authoritative projection and cross-run
comparison. The split is therefore substantive, not aesthetic.

No architecture contradiction was found at this gate. The split is a risk and
verification boundary within the already frozen CP5 scope.

## 3. CP5A — Decision Space and Single-Run Result

### Exact scope

CP5A owns:

- a shared, authority-preserving eligibility read boundary derived from the
  same CP3B eligibility semantics used for execution;
- immutable committed-state access sufficient to evaluate every applicable
  initiative at each committed period or terminal/unresolved boundary;
- deterministic Decision Space snapshots defined only as individual
  next-action eligibility;
- canonical eligible, ineligible and completed/terminal initiative sets and
  complete canonical reason chains;
- an explicit disclaimer/contract distinction between individual eligibility
  and same-period cohort admission feasibility;
- the immutable single-run result contract for completed-horizon,
  failed-unresolved and Layer 2 failed-bounds outcomes;
- run-local identities and typed provenance linking snapshots to Layer 1
  state/history and Layer 2 results/source bindings; and
- a bounded domain-neutral single-run fixture sufficient to test projection,
  path dependence and non-interference, but no A/B comparison.

CP5A may make only additive Layer 1 reads or a semantics-preserving extraction
of the existing eligibility function. It may not alter eligibility, admission,
conflict resolution, lifecycle, resource, constraint or entitlement behavior.

### Blockers owned

- **A4:** fully owned and closed by CP5A if its gates pass.
- **A9:** CP5A owns single-run result/status representation, including faithful
  unresolved and failed-bounds preservation; A9 remains open until CP5B passes.
- **A10:** CP5A owns run-local typed provenance from Decision Space/Layer 2
  result back through execution, scenario and contract declarations; A10
  remains open for cross-run provenance and the later CP6 vertical proof.
- **A13:** not owned by CP5A.

### Architecture-sensitive PASS evidence

CP5A passes only if tests prove:

1. Decision Space calls the same eligibility semantics as CP3B; no duplicate
   eligibility engine exists.
2. Every snapshot is reproducible from an immutable committed state and binds
   the scenario, contract, execution, boundary and state identities.
3. Individually eligible initiatives may still be jointly inadmissible, and
   the result never presents the eligible set as a feasible cohort.
4. Completed initiatives are not next actions; blocked initiatives retain
   complete canonical reasons.
5. reservations, completed prerequisites, constraints and consumed
   entitlements affect snapshots exactly as CP3B semantics require.
6. structurally different states may have equal Decision Space without equal
   state identity.
7. completed-horizon, failed-unresolved and failed-bounds are distinct data;
   no state, Decision Space or observation is fabricated beyond the last
   authoritative boundary.
8. result and snapshot identities are repeatable, order-invariant where inputs
   are semantic sets, and sensitive to semantic schedule/state changes.
9. Layer 1 and Layer 2 outputs are byte/semantic equivalent before and after
   CP5A derivation, and import-direction guards prevent write-back authority.
10. schemas and code contain no winner, recommendation, score, rank, utility,
    magnitude, optimization or full-reachability mechanism.

### Stop conditions

Stop CP5A and report an architecture-sensitive contradiction if next-action
eligibility cannot reuse CP3B semantics, requires reconstruction from missing
authoritative information that cannot be exposed additively, requires Layer 2
state, requires a numeric optionality measure, or requires a fundamental CP3
or CP4 redesign.

### Explicit exclusions

CP5A does not implement comparison policy, pair compatibility, A/B difference,
first divergence, persistence/convergence across runs, terminal equivalence
between runs, cross-run findings, CP6, Clean MU or Test 01A.

## 4. CP5B — Sequence Comparability and A/B Comparison

### Entry gate

CP5B may begin only after CP5A is committed, independently verified, and its
single-run result/status/identity and Decision Space contracts are stable.

### Exact scope

CP5B owns:

- one closed identity-bearing comparison policy:
  `SEQUENCE_TIMING_ONLY`;
- fail-closed compatibility over protocol/limits, contract and evidence,
  initiative universe and non-schedule semantics, initial authoritative state,
  resources, constraints, entitlements, Layer 2 graph, source bindings and
  horizon;
- explicit comparable, incompatible and incomplete/unresolved comparison
  outcomes;
- the authoritative common comparison boundary for completed,
  failed-unresolved and failed-bounds combinations;
- canonical first divergence with all same-boundary dimensions retained and no
  importance ordering;
- period/boundary Decision Space set differences and canonical structural
  reason chains;
- Layer 2 node/category, timing, persistence, source-event and complete
  path-provenance differences without magnitude;
- exact persistence, convergence and terminal-equivalence reporting that does
  not erase historical divergence;
- honest no-material-difference output;
- deterministic comparison identity; and
- typed cross-run provenance from comparison differences through CP5A results
  to structural authority and causal evidence/assumptions.

### Blockers owned

- **A4:** already closed by the CP5A prerequisite; CP5B verifies its A/B
  differential use without redefining Decision Space.
- **A9:** CP5B owns comparison, first divergence, persistence/convergence,
  terminal equivalence and unresolved/incomparable outcomes; A9 closes only
  when CP5A and CP5B both pass.
- **A10:** CP5B owns cross-run provenance and mechanically material difference
  categories. CP6 retains the vertical end-to-end proof and any final bounded
  finding compression assigned by the coverage matrix.
- **A13:** fully owned and closed by CP5B if sequence-only compatibility and
  pairwise mutation gates pass.

### Architecture-sensitive PASS evidence

CP5B passes only if tests prove:

1. identical results compare equivalent and no difference is manufactured;
2. only schedule/order/timing may vary under `SEQUENCE_TIMING_ONLY`, and every
   non-schedule mutation required by A13 fails closed;
3. earliest divergence and all dimensions at that boundary are canonical and
   invariant to declaration/iteration order;
4. Decision Space A-only/B-only/both differences contain identities and
   authoritative reason chains, never signed value or preference;
5. causal-path/source differences are reported without converting provenance
   count, duration or observation count into strength;
6. Layer 2 may diverge while Decision Space remains equivalent, and a later
   structural divergence is independently representable where the fixture
   naturally produces it;
7. exact convergence and terminal equivalence preserve earlier history;
8. completed/unresolved and unresolved/unresolved combinations expose only the
   authoritative common boundary and never declare a winner;
9. failed-bounds is incomplete analytical data and is never compared as a
   complete causal history;
10. at least one difference has resolvable cross-run provenance to CP5A
    structural reasons and CP4 evidence/assumption paths;
11. comparison identity is deterministic and changes for semantic schedule or
    policy changes; and
12. negative schema/code guards reject valuation, ranking, recommendation,
    magnitude, optimization and hidden weighting fields or mechanisms.

### Stop conditions

Stop CP5B and report an architecture-sensitive contradiction if sequence-only
compatibility cannot be enforced mechanically, first divergence depends on
incidental ordering, unresolved comparison requires invented later state,
causal comparison requires magnitude, structural authority cannot remain
separate from Layer 2 observation, provenance cannot be resolved, or Full V2
semantics are required.

### Explicit exclusions

CP5B does not implement generalized intervention policies, winner selection,
recommendation, importance ranking, utility, optimization, full future
reachability, cohort Decision Space, final CP6 vertical conformance, Clean MU
or Test 01A.

## 5. Ownership summary

| Blocker | Owner and closure |
| --- | --- |
| A4 | CP5A; closes when shared eligibility and committed Decision Space gates pass. |
| A9 | Split: CP5A single-run statuses/results; CP5B comparison and convergence. Closes after both pass. |
| A10 | Split: CP5A run-local provenance; CP5B cross-run provenance; CP6 retains vertical proof. |
| A13 | CP5B; closes when sequence-only compatibility and mutation matrix pass. |

## 6. Verification sequencing

Each half receives its own scoped tests, TypeScript, scoped lint, import
isolation, `git diff --check`, frozen tracked-only canonical regression and
separate independent verification before its successor starts. CP5B cannot
mask CP5A defects by recomputing eligibility or reconstructing missing state.

The current canonical baseline remains 92 tracked test files and 884 passing
tests. This documentation-only split adds no test file and changes no expected
test count.

## 7. Retained backlog and non-scope

The following remain explicitly outside CP5A and CP5B:

- the direct exact CP4B observation-occurrence overflow test at 262,145;
- per-edge causal timing/delay;
- richer unknown/dispute semantics;
- source fan-out;
- domain-specific persistence termination;
- generalized intervention comparison;
- CP6, Clean MU and Test 01A; and
- Full V2 capabilities.
