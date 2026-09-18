# CE Two-Layer MTC CP4B — Causal Evaluation Completion Audit

Status: **PASS**

Repository: `pulse_engine_clean`

Branch: `decision-flow-demo-v1`

Starting commit: `0c228f3fd5bf3f21725b92822f681b7446707c21`

Scope: CP4B only. CP5 is not started or authorized by this checkpoint.

## 1. Implemented boundary

CP4B consumes the validated CP2 contract, the canonical CP4A source-binding
artifact and activation candidates, and an explicit scenario period context.
It verifies all contract, scenario, binding, source-result and source-event
identities before evaluation. It does not inspect mutable Layer 1 state and
does not expose any write-back path.

The evaluator produces immutable period-indexed analytical observations with
canonical identities. Layer 1 remains the sole authority for lifecycle,
eligibility, admission, resources, constraints and entitlements.

## 2. Timing convention

An admitted CP4A source event becomes visible at its committed boundary. The
bound source node and the full reachable DAG closure become visible in that
same model period. This is deterministic because the validated graph is
acyclic, adjacency and output are canonically ordered, and every reachable
explicit path is evaluated as a set without mutating traversal state.

CP2 declares directional edges but no edge delay. A one-edge-per-period rule
would therefore add timing semantics absent from the frozen contract.

Sources committed at the terminal boundary (`finalPeriod + 1`) remain valid
CP4A history but create no in-horizon Layer 2 activation.

## 3. Categorical operation

The evaluator mechanically produces only:

- `affected`: the explicitly bound source node, represented by its zero-edge
  causal path;
- `exposed`: a node reached through one or more explicit causal edges.

`unchanged` remains in the frozen vocabulary but is not inferred from absence;
an unreached node has no observation. `unknown` remains in the vocabulary but
is not used as a missing-data or implementation fallback. CP2 contains no
additional declaration sufficient to mechanically derive either category.

No result contains magnitude, weight, score, confidence, probability,
valuation or activation threshold.

## 4. Persistence and termination

Persistence is path-occurrence scoped and is determined by the incoming edge
to the observed target:

| Mode | Start and first visibility | Continuation | Final visibility | Termination |
| --- | --- | --- | --- | --- |
| `none` | source committed boundary | none | source committed boundary | absent in the next period |
| `declared-persistent` | source committed boundary | visible in every remaining scenario period | scenario final period | explicitly terminated at `finalPeriod + 1` |

The source-node zero-edge observation uses `none`, because no edge declaration
grants persistence. No observation survives beyond the scenario horizon.

A repeated activation creates a separately identified provenance occurrence.
It neither adds strength nor extends the already fixed horizon termination.
If several paths converge on one node, the period contains one canonical node
state and retains every mechanically valid path. An affected path takes the
single node category over exposed paths, without numerical aggregation.

## 5. Provenance and bounds

Each path retains its CP4A source-event identity, binding ID, source and target
nodes, ordered node and edge IDs, and every edge's evidence reference or
explicit assumption. CP4A provenance provides the link back to committed
Layer 1 execution and scenario/contract identities.

Existing contract node, edge, degree, activation and depth limits remain
enforced. CP4B adds explicit history-period, path-output and total occurrence
limits. Exceeding any CP4B output limit returns a canonical `failed-bounds`
result; it never silently truncates or ranks paths.

## 6. Verification and A8 disposition

The domain-neutral fixture uses `X -> Y`, `X -> Z`, `Y -> W`, and `Z -> W`,
including both persistence modes, branching, convergence, an unreachable node,
evidence and an explicit assumption. Adversarial coverage proves source
partitioning, absent-edge behavior, all-path provenance, declaration-order and
replay invariance, semantic identity sensitivity, exact termination,
repetition without magnitude, immutable Layer 1 output, fail-closed boundary
validation and explicit bounds behavior.

A8 closes without a falsifying technical contradiction. Persistence requires
no magnitude, threshold, runtime analyst judgment, numerical accumulation or
Layer 1 authority. The import-isolation suite also prevents Layer 1 and CP4A
production modules from reaching CP4B evaluation code.

## 7. Time and issue log

Elapsed implementation and verification time is self-reported and is not an
independent throughput measurement: approximately 25 minutes in this
checkpoint turn, with two implementation/debug iterations.

Verification used the frozen tracked-file discovery command. The manifest
contains 92 test files: the 91-file CP4A baseline plus one CP4B test file. The
root package passed 872/872 tests and `01systems-site` passed 10/10, for 882/882
total (the 871-test baseline plus ten CP4B evaluator tests and one added import
direction test), with zero failures, skips, cancellations or todos. TypeScript,
scoped MTC lint and `git diff --check` also passed. No Golden or hash fixture
was regenerated or modified.

- IMPLEMENTATION DEFECT: initial strict TypeScript inference widened branded
  IDs and result literals; corrected before the static gate.
- DOMAIN/PROFILE ISSUE: none.
- FALSIFYING TECHNICAL CONTRADICTION: none.
- POST-TEST BACKLOG: real-world causal evidence validation, disputed evidence,
  richer unknown semantics, and any domain-specific termination remain outside
  the pre-Test-01A MTC. CP5 comparison and finding projection remain unstarted.
