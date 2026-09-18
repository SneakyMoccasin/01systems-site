# CE CP4A one-way observation-source binding

CP4A introduces a separate immutable binding artifact with discriminator
`ce-two-layer-mtc-source-bindings-v1`. Separate ownership is the narrowest
choice: it binds concrete scenario instances to domain-declared Layer 2 nodes,
does not redefine the domain graph, and requires no CP3A scenario redesign.

The closed source-event version is `ce-two-layer-mtc-source-event-v1`. Its
minimum vocabulary is:

- `initiative-admitted`: the coverage matrix requires admitted execution to
  produce the committed observation source;
- `initiative-completed`: the minimum additional lifecycle fact needed to bind
  completed structural work without inventing a generic state-change event.

Resource, release and entitlement evidence remains in authoritative Layer 1
history but is not a CP4A source-event kind. The adapter reads only immutable,
identity-verified committed execution evidence. Failed-period attempts are not
read, so discarded completions, releases, admissions and later periods cannot
become observation sources.

One source semantic maps to at most one explicitly declared observation node in
this version. Duplicate and conflicting declarations fail closed. Unmapped
committed events leave Layer 1 valid, produce no activation candidate, and are
listed by source-event identity. Fan-out is deferred because it is not required
to prove A7 and can be introduced only with a later explicit contract decision.

Source artifacts contain no Layer 2 traversal, observation state, persistence,
threshold, magnitude, score, promotion or callback. Mechanical import tests
prove Layer 1 execution does not reach the observation-source subtree, and the
adapter cannot invoke the executor.

## Implementation log

- Implementation/debug iterations: one before scoped verification.
- Tests added: ten CP4A suites, including the CP3B reversed-declaration
  unresolved-conflict carryover test.
- Implementation defects: none found.
- Domain/profile issues: none.
- Falsifying technical contradictions: none.
- Architecture-sensitive finding: committed-history derivation cleanly excludes
  tentative evidence and requires no Layer 2 write-back or CP3B output change.
- Post-Test backlog: source fan-out, additional event kinds, graph traversal,
  categorical observation evaluation and persistence remain deferred.
