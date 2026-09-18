# CE CP3A scenario contract

The closed discriminator is `ce-two-layer-mtc-scenario-v1`. A scenario is
validated against one already validated Two-layer MTC domain contract and binds
both its semantic ID and SHA-256 semantic identity. Presentation metadata is
excluded from scenario identity; every result-affecting declaration is included.

Model periods are discrete, nonnegative safe integers. An initiative scheduled
at period `N` with `durationPeriods = D` is intended to activate at the start of
`N`, remain active throughout periods `N` through `N + D - 1`, and complete at
the boundary `N + D`. Thus start 2/duration 1 is active in period 2 and completes
at the start of period 3. Start 2/duration 3 is active in periods 2, 3 and 4 and
completes at the start of period 5. Completed-prerequisite satisfaction and
resource release occur only at that completion boundary. `while-active` claims
begin at activation and cover precisely the same active interval.

The horizon includes periods `firstPeriod` through `finalPeriod` and its terminal
boundary is `finalPeriod + 1`. A completion at or before that terminal boundary
is represented as completed. A later completion remains deterministically active
at horizon; preparation never fabricates completion or resource release.

Every initiative explicitly begins pending. Every domain constraint and
entitlement has exactly one explicit initial state. Every domain resource has at
least one explicit, fully available instance. Non-pending lifecycle and partially
reserved resource input are deliberately outside CP3A.

Layer 2 source binding is deferred to CP4A. The coverage matrix assigns CP4A the
canonical source event and one-way adapter contract, and no CP3A execution input
needs to reference Layer 2. This preserves the hard non-interference boundary.

## CP3B readiness contract

CP3B receives unambiguous start and completion boundaries, the active and claim
interval, completed-prerequisite instance bindings, release boundary, explicit
constraint and entitlement states, consumable availability, and terminal-horizon
behavior. It can implement Layer 1 execution without changing this contract.

## Implementation log

- Implementation/debug iterations: two before full-gate verification. The first
  found one TypeScript test-narrowing defect; the environment also rejected the
  `tsx` CLI IPC socket, so the repository-standard `node --import tsx --test`
  runner was used. Both are `IMPLEMENTATION DEFECT`; neither changes architecture.
- Tests added: seven scenario suites covering preparation/immutability, identity,
  duration/horizon boundaries, strict structure, dependency graphs, resources,
  and complete initial state, with mutation cases inside each suite.
- Domain/profile issues: none.
- Falsifying technical contradictions: none.
- Unexpected requirements: none beyond the coverage matrix's explicit
  terminal-active horizon rule.
- Architecture-sensitive issues: all five checks pass under the conventions above.
- Post-Test backlog: richer initial lifecycle, generalized unknown/disputed state,
  and non-MTC dependency/resource features remain deliberately excluded.
