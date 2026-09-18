# CE CP3B authoritative Layer 1 execution

CP3B consumes only a prepared `ce-two-layer-mtc-scenario-v1` value and its
validated Two-layer MTC contract. Contract and scenario semantic identities are
recomputed at the execution boundary. The executor produces detached, deeply
immutable state, history and outcome values.

## Period lifecycle

For every period, the executor performs these stages against a tentative copy
of the last committed state:

1. complete active initiatives whose completion boundary equals the period;
2. release their `while-active` resource reservations;
3. derive canonically ordered pending candidates scheduled for the period;
4. evaluate each candidate's eligibility against the post-release state;
5. test the complete eligible candidate set for joint exclusive-resource,
   quantitative-capacity and consumable-entitlement feasibility;
6. if unresolved, discard the tentative state and stop the run;
7. otherwise reserve resources, consume consumable entitlements, activate all
   eligible candidates and commit the period atomically.

No candidate subset is selected. When individually eligible simultaneous
candidates cannot all start together and the contract supplies no priority,
the boundary is unresolved. Input order and lexical ID order never grant
authority.

After the final model period, the executor commits the explicit terminal
boundary `finalPeriod + 1` for due completions and releases. Initiatives with a
later completion boundary remain active. Constraints remain at their explicit
scenario-initialized state because CP3B has no authorized transition source.

## Evidence and scope

Eligibility and admission are separate records. Stable reason and conflict
codes retain declaration IDs, instance IDs and relevant authoritative state.
Committed records retain state identities, completions, releases, candidates,
eligibility, admissions, reservations, entitlement consumption and lifecycle
transitions. No Layer 2 event or authority is present.

## Implementation log

- Implementation/debug iterations: three before final-gate verification.
- Tests added: eleven CP3B suites plus one CP2 entitlement-kind regression.
- `IMPLEMENTATION DEFECT`: the initial state used `null`, which the CP1 canonical
  JSON boundary deliberately rejects; fixed with the explicit pre-horizon
  committed period `firstPeriod - 1`.
- `IMPLEMENTATION DEFECT`: entitlement rules previously allowed consumption
  inconsistent with their declared reusable/consumable kind; the closed CP2
  validator now rejects that mismatch.
- Domain/profile issues: none.
- Falsifying technical contradictions: none.
- Architecture-sensitive finding: simultaneous contention is deterministic and
  atomic without preference or optimization by failing unresolved.
- Post-Test backlog: constraint transitions, richer lifecycle, retry/reschedule,
  portfolio selection and final result wrapping remain outside CP3B.
