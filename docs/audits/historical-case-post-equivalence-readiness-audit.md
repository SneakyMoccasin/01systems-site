# Historical Case Post-Equivalence Readiness Audit

Audit date: 2026-09-17
Candidate: Nya Karolinska Solna (NKS)
Scope: read-only post-equivalence readiness; no historical source research, implementation, runtime adoption, or publication

## 1. Executive conclusion

**A. READY FOR HISTORICAL CASE EVIDENCE DESIGN WITHOUT RUNTIME ADOPTION**

Cascade Engine can already execute a bounded historical analysis through the existing initiative-scheduled analysis path, provided the case can be mapped without semantic invention to one existing executable profile and its canonical actions, drivers, propagation rules, constraints, and effects. This can be done as isolated analysis or test support without changing the product runtime or claiming that M1E covers the new case.

NKS is a plausible but demanding first evidence-discovery candidate because the intended question concerns decision sequence, dependencies, shared capacity, implementation pressure, and retained structural room for action. It is not yet an approved model case. No current repository evidence establishes that NKS fits `legacy-municipal-v1`, `legacy-consulting-v1`, or `legacy-real-estate-v1`. The immediate work is evidence design and semantic mapping, not profile selection or execution.

The recommended target is level 2 below: a reproducible historical analysis case with documented assumptions. Begin with evidence design now; proceed to a bounded fixture only after explicit source, cutoff, mapping, and skeptical-review gates pass. Do not reopen M1C–M1E unless the intended claim becomes a hash-bound verified contract case.

## 2. Verified repository state and method

The repository was clean on `decision-flow-demo-v1`. Local HEAD, tracking HEAD, and actual remote HEAD were identical:

```text
775090d306eaf58edb53e1c8310e584685442efb
```

The audit inspected:

- `docs/audits/historical-case-readiness-audit.md`;
- M0B input fixtures, output Goldens, manifests, and parsers;
- M1C amendment and completion audits;
- M1D design and completion audits;
- M1E design, implementation-readiness, and completion audits;
- `runInitiativeScheduledAnalysis` and its validators;
- `resolveExecutableDomainProfile` and the three locked profiles;
- current scheduled, preconfigured, Structural Observation, demo, and pilot paths;
- `runDomainModelFinalEquivalenceV1` and its closed case inventory.

This audit performs no external NKS source research. Statements about NKS are therefore candidate-selection and evidence-design judgments, not historical findings.

## 3. Four distinct historical-case levels

| Level | Meaning | Current status | Permitted claim |
| --- | --- | --- | --- |
| 1. Illustrative demo | A transparent scenario inspired by a historical setting, with explicit fictionalization or simplification | Technically possible now | Demonstrates CE mechanics, not historical reproduction or validation |
| 2. Reproducible analysis | Versioned sources, assumptions, mapping, inputs, execution identity, and deterministic outputs | Ready for evidence design; execution only after gates | Compares structural room for action under documented assumptions |
| 3. Hash-bound contract case | Registered fixture, case identity, manifest, hashes, Golden evidence, M1D/M1E coverage, and completion audit | Not currently implemented for a seventh case | Verifies the new locked case within an amended contract surface |
| 4. Production-authorized runtime case | Trusted registration, authorization, persistence, migration, runtime selection, operations, and deployment | Not authorized | Production execution under separately approved operational gates |

These levels are not interchangeable. M1E completion for six cases does not promote a new historical case to levels 3 or 4.

## 4. Can the engine run a new case now?

### 4.1 Existing execution path

The usable non-adopted path is:

```text
raw InitiativeScheduledAnalysisInputV1
  -> prepareInitiativeScheduledAnalysis
  -> resolveExecutableDomainProfile
  -> validate structural-observation-v2 contract and A/B schedules
  -> resolveInitiativeSchedules
  -> runPreparedInitiativeScheduledAnalysis
  -> runInitiativeScenario A and B plus baseline
  -> optional completed Structural Observation
```

This path validates raw input, uses canonical action effects, executes two schedules over the same initiative set and initial state, and returns deterministic trajectories, margin/constraint/cascade histories, provenance, terminal states, and B–A comparison. Structural Observation can separately diagnose finish-to-start and shared-resource pressure without changing execution.

It can be invoked in isolated analysis or tests without switching the product runtime. Such a run is not M1E evidence unless it is later admitted through a versioned contract amendment.

### 4.2 Closed M0B and M1E identities

M0B and M1E currently close exactly these six fixture identities:

```text
legacy-real-estate-v1-neutral-v1
legacy-real-estate-v1-stressed-scheduled-v1
legacy-municipal-v1-neutral-v1
legacy-municipal-v1-stressed-scheduled-v1
legacy-consulting-v1-neutral-v1
legacy-consulting-v1-stressed-scheduled-v1
```

`runDomainModelFinalEquivalenceV1` requires exactly three envelopes and exactly six fixtures in canonical profile/kind order. It requires fixture IDs derived from profile plus `neutral` or `stressed-scheduled`. A seventh fixture is rejected at the exact-inventory boundary. The M1E runner is therefore not a general historical-case runner.

### 4.3 What a seventh case requires

| Intended level | New fixture | Manifest/Golden/hash | Profile binding | M1D/M1E amendment | New completion audit |
| --- | --- | --- | --- | --- | --- |
| Illustrative isolated demo | Optional; ordinary analysis input may suffice | No contract Golden; preserve an analysis record if shared | Existing profile must pass mapping gate | No | No, but wording review is required |
| Reproducible analysis case | Yes, or an equivalent versioned case input | Case hash, evidence/assumption hashes, execution identity, deterministic output snapshot recommended | Existing profile only after explicit semantic fit | No, unless equivalence is claimed | Reproducibility/method review, not M1E completion |
| Hash-bound contract case | Yes | Required fixture registration, manifest, case hash, Golden, provenance, and expected output | Existing verified profile or a separately approved new profile | Yes: extend M1D case matrix and M1E exact inventory/pass rules | Yes |
| Production runtime case | Registered trusted case | Production provenance and persistence required | Authorized runtime profile | Post-equivalence trust/adoption gates required | Operational approval required |

A new scenario identity is required when the historical and counterfactual schedules are frozen as evidence. A new profile is required only if no existing profile represents the relevant mechanism without material distortion. If a new profile is required, M1C–M1E must be reopened for that profile rather than bypassed.

## 5. NKS profile assessment

Profile selection must follow semantic fit, not the words “public,” “hospital,” “project,” “municipal,” “consulting,” or “real estate.” All three profiles expose a legacy mixed action vocabulary, while their identities, calibration, constraints, and propagation semantics differ.

| Candidate path | Potentially useful structure | Material distortion risk | Current verdict |
| --- | --- | --- | --- |
| `legacy-municipal-v1` | Public-sector setting, budget/operational-capacity drivers, refinancing disabled | Calibration is explicitly `transport-causal-subset-v2`; transit actions and propagation cannot be relabeled as hospital-project semantics | Not selectable without mapping proof; organizational category is insufficient |
| `legacy-consulting-v1` | Generic sequencing and implementation-pacing vocabulary; refinancing constraint enabled | “Consulting” identity and legacy-global financial/property mechanisms may misstate governance, procurement, clinical transition, and infrastructure dependencies | Possible only if mechanism-by-mechanism mapping passes |
| `legacy-real-estate-v1` | Capital commitment, leverage/liquidity, maintenance, phasing, project-start sequencing | Property, tenancy, refinancing, and market semantics can distort a hospital megaproject and its public decision system | Possible only for a deliberately narrow capital/project-sequencing question |
| No existing profile | Avoids false semantic authority | Requires a new design path before execution | Current safe default pending mapping review |
| Case-specific projection | Translates documented case concepts into an existing canonical vocabulary while preserving source provenance | Can become a hidden new profile if it changes meaning, effects, curves, or constraints | Permissible only as a transparent mapping layer with no semantic changes |
| Historical analysis adapter | Keeps evidence ledger, period register, and source mapping outside production runtime | Cannot invent new engine semantics or claim contract verification | Recommended evidence-side boundary for discovery and reproducibility |

The current recommendation is “no profile selected.” Conduct a blind mapping review against all three profiles. If one profile represents the chosen narrow question with bounded and disclosed omissions, use a case-specific evidence projection into that unchanged profile. If the central NKS mechanism requires new drivers, effects, constraints, propagation, governance semantics, or execution rules, stop and seek a new profile/product decision; do not rename existing fields.

## 6. A defensible CE analysis question

A suitable initial question is:

> Under a documented decision cutoff, how do two historically plausible sequences of the same bounded initiative set change structural room for action through dependencies, shared implementation capacity, accumulated pressure, and activated constraints?

The question should not ask whether a named decision “caused” the eventual economic, clinical, contractual, or political outcome.

### 6.1 Candidate initiative classes

Evidence discovery should identify six to ten initiatives such as formal scope gates, financing/contract gates, enabling works, construction phases, technical integration, operational transition, commissioning, and move/readiness activities. These are candidate classes only; exact initiatives must come from sources and must map to canonical actions without relabeling their effects.

Scenario A should represent one documented sequence at a named cutoff. Scenario B should use the same initiatives and initial state but a different timing/order that was demonstrably feasible at that cutoff. Potential ordering questions include staged versus concurrent commitment, earlier versus later enabling work, and earlier versus later operational-transition preparation.

### 6.2 Dependencies, resources, pressure, and constraints

- Finish-to-start prerequisites must be sourced or explicitly assumed.
- Shared resources may include bounded governance attention, specialist engineering/integration capacity, commissioning capacity, transition capacity, or financing/decision bandwidth, but every unit and capacity rule must be defined.
- Implementation pressure may be represented through concurrent claims, canonical action effects, driver states, cascade propagation, and existing constraints. Structural Observation diagnoses pressure; it does not block execution.
- Only existing executable constraints may affect the trajectory. A case-specific procurement, governance, clinical-safety, or contract constraint cannot be smuggled into a label.

### 6.3 Horizon and output

Use 12–36 periods initially, with period granularity chosen from the documented decision cadence. Each period must have an external date/event register because engine periods are ordinal, not calendar dates.

Defensible outputs are relative trajectories, first divergence, Structural Margin context, activated existing constraints, cascade history, actual execution provenance, prerequisite diagnostics, resource-pressure diagnostics, terminal differences, and sensitivity across preregistered assumptions. Counterfactual outputs must be labeled model results under assumptions, never historical facts.

## 7. Historical evidence schema

Every source record should contain:

| Field | Rule |
| --- | --- |
| `sourceId` | Stable unique ID |
| `sourceType` | Decision, minutes, contract, plan, report, archive, interview, dataset, or secondary analysis |
| `title` | Exact document/source title |
| `publisher` | Issuer or custodian |
| `publicationDate` | Source publication/version date |
| `accessDate` | Retrieval date |
| `documentIdentity` | URL, archive ID, checksum, or durable identifier |
| `locator` | Exact page, paragraph, section, table, or record |
| `supportedClaim` | One narrowly worded claim actually supported by the locator |
| `evidenceClass` | `verified-historical-fact`, `reasonable-inference`, `modeling-assumption`, `counterfactual-scenario`, or `unknown` |
| `confidence` | `low`, `medium`, or `high` with rationale; never a probability |
| `contestedStatus` | `uncontested`, `contested`, `uncertain`, or `unknown` plus competing source IDs |
| `cutoffStatus` | `pre-cutoff`, `post-cutoff`, or `date-uncertain`; include availability to actors |
| `modelingAssumption` | Nullable assumption ID and neutral statement |
| `derivedElement` | Exact action, driver, dependency, resource, constraint, score, period, or scenario field derived |
| `inputPath` | Exact path(s) in the frozen case input |
| `transformationRule` | Reproducible mapping from claim to value |

Provenance must be many-to-many: each input value lists supporting source and assumption IDs, and each source/assumption lists all derived inputs.

### 7.1 Minimum evidence before meaningful execution

At minimum, require:

1. a named decision gate and information cutoff;
2. a source manifest with durable locators;
3. six to ten bounded initiatives and their historical identities;
4. the documented represented sequence;
5. evidence that the counterfactual sequence was feasible at cutoff;
6. sourced or explicitly assumed dependencies;
7. shared resource definitions, units, capacity, claim amounts, and durations;
8. initial-state evidence or explicit assumptions for every required driver;
9. an assumption register with alternatives and sensitivity plan;
10. a period/date register and horizon rationale;
11. profile/action mapping rationale for every initiative and state field;
12. a gap/contestation register and expected bias;
13. preregistered output interpretation and wording policy.

Unknown information remains unknown. If execution requires a value, it receives an assumption ID and sensitivity variant; it must not silently default to `MODERATE`.

## 8. Claims and public presentation

Permitted wording:

> CE models how two documented decision sequences affect structural room for action under stated assumptions, using a fixed engine profile and a named evidence cutoff.

Also permitted are precise statements about configured differences, engine-produced trajectories, provenance, diagnostics, and sensitivity within that model.

Forbidden claims include:

- CE proves that a particular decision caused the historical outcome;
- the model reproduces the complete NKS project;
- a counterfactual scenario is historically true or would have occurred;
- retrospective modeling is an external pilot, empirical validation, or production use;
- M1E’s six locked cases automatically verify the historical case;
- normalized reconstruction is actual runtime or actual history;
- model output establishes blame, optimal policy, economic loss, political responsibility, or clinical effect.

Any website presentation must show, adjacent to results:

- case level and verification status;
- decision cutoff and period mapping;
- profile/model/calibration identity;
- source links and exact locators;
- an expandable evidence ledger and assumption register;
- contested and unknown items;
- historical versus counterfactual labels;
- sensitivity variants and material result instability;
- explicit limitations and non-causal wording;
- case input, evidence, assumption, engine-commit, and result hashes for reproducible level 2 output.

## 9. Three implementation paths

| Path | Enables | Does not prove | Minimum scope | Risk | Time | Reopens verified boundaries? | Step 3 required? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. Illustrative demo | Fast internal demonstration of sequence and pressure mechanics | Historical fidelity, reproducibility, contract verification, validation | Evidence disclaimer, ordinary initiative analysis input, internal result capture; no production wiring | High claim/confusion risk; low code risk | 3–7 working days after a narrow question | No | No |
| B. Reproducible historical fixture | Reviewable source-to-input mapping and deterministic reruns outside production | M1E verification, production authorization, general NKS truth | Evidence ledger, assumptions, period register, mapping review, versioned input fixture, hashes, deterministic output snapshot/Golden, skeptical review | Medium evidence and mapping risk | 3–6 weeks, dominated by source work | No, if it remains an analysis fixture under an unchanged profile | No |
| C. Hash-bound contract amendment | Adds the new case to a declared verified contract surface | Production trust/adoption or broader domain parity | Registered fixture/manifest/Golden, provenance, M1D matrix extension, M1E inventory/pass-rule extension, tests, readiness and completion audits | High scope and revalidation risk | 4–8 additional weeks after evidence/mapping approval | Yes: M1D and M1E; M1C too if profile semantics change | No for test-only verification; yes before production adoption |

For companies and incubators, Path B is the recommended publication target because it demonstrates real CE use with reproducible evidence while preserving honest claim boundaries. Path A may be used only as an explicitly illustrative internal prototype. Path C should be considered after Path B survives skeptical review and only if contract-level verification creates material value.

## 10. Exact next work order and gates

1. **Bounded case question — 1–2 days.** Name one decision gate, cutoff, initiative scope, candidate comparison, outputs, and forbidden claims. **Go/no-go:** reject causal, total-project, or outcome-proof questions.
2. **Source collection — 1–3 weeks.** Gather primary and contemporaneous documents symmetrically for actual and alternative sequences. **Go/no-go:** require durable sources for the decision gate, represented sequence, and feasibility of the alternative.
3. **Evidence ledger — 2–4 days.** Record source metadata, locators, claims, cutoff availability, conflict, and gaps. No engine values yet.
4. **Model mapping — 3–5 days.** Blind-map mechanisms against all three profiles and canonical actions. **Go/no-go:** if the central mechanism cannot map without renaming or changing semantics, stop for a new profile/product decision.
5. **Scenario/sequence design — 2–4 days.** Freeze equal initiative sets, A/B timing, dependencies, resources, horizon, period register, assumptions, and sensitivities. **Go/no-go:** the counterfactual must have been feasible at cutoff.
6. **Fixture/contract choice — 1–3 days for Path B design.** Freeze versioned analysis input plus evidence and assumption hashes. Do not register it in M1E unless Path C is explicitly authorized.
7. **Execution — 1 day.** Run deterministic analysis and Structural Observation outside production runtime; record engine HEAD, profile identity, input hashes, and output hash.
8. **Result interpretation — 1–2 days.** Report structural differences and sensitivity, not historical causation.
9. **Skeptical review — 3–5 days.** Independent source, mapping, counterfactual, hindsight, uncertainty, and claim review. **Go/no-go:** unstable or semantically distorted results are withheld or redesigned.
10. **Web publication — 2–5 days after approval.** Publish evidence, assumptions, uncertainty, hashes, limitations, and case level adjacent to results. Production wiring remains a separate authorization gate.

Steps 1–5 can and should be completed before any code is written. The first formal stop/go decision follows source collection; the decisive technical stop/go decision follows profile mapping; publication requires skeptical review.

An evidence-to-reviewed-Path-B estimate is roughly 4–8 calendar weeks, depending on source accessibility, contested interpretations, and reviewer availability. This is not an implementation estimate for Path C or production adoption.

## 11. Minimum technical scope

For the recommended Path B, the minimum safe technical scope after evidence approval is:

- one versioned historical analysis input using the existing `InitiativeScheduledAnalysisInputV1` shape;
- one frozen evidence ledger and assumption register;
- one period/date register;
- stable case, scenario, source, assumption, and mapping IDs;
- SHA-256 for evidence, assumptions, input, engine commit, and result;
- one deterministic output snapshot or test-only Golden;
- focused parser/execution/determinism tests;
- one skeptical-review record and public wording policy.

No runtime resolver, production profile registry, UI routing, persistence, migration, M1C, M1D, or M1E change is required if the case uses an unchanged existing profile and makes no contract-equivalence claim.

If mapping requires new actions, drivers, effects, curves, constraints, propagation, or profile identity, stop. The minimum scope then becomes a new versioned profile/product decision followed by the applicable M1C–M1E sequence; it is not a Path B shortcut.

## 12. Verification results

The focused read-only test matrix covered scheduled canonical execution, Executive Demo, raw initiative-scheduled orchestration, completed Structural Observation, 10/30-initiative scale behavior, engine-output Golden boundaries, and M1E’s closed six-case inventory.

```text
83 tests passed
0 failed
0 skipped
0 todo
0 cancelled
```

`npx tsc --noEmit --incremental false`, `git diff --check`, and the synthetic diff check of this untracked audit passed. No implementation or existing repository file is changed.

## 13. Residual risks

- NKS is politically, contractually, technically, and operationally complex; a narrow sequence model can omit mechanisms that dominate the historical outcome.
- Existing profile vocabularies contain mixed legacy real-estate and transport semantics. Superficial mapping would create false precision.
- Structural Observation diagnoses prerequisite/resource pressure but does not enforce blocking.
- Existing constraints are code-defined and are not a generic representation of procurement, governance, clinical safety, contractual incentives, or institutional accountability.
- Counterfactual feasibility and information availability at cutoff are likely contested and require symmetric evidence.
- Determinism and hash binding establish reproducibility, not empirical validity or causality.
- Publication can easily be mistaken for blame attribution or external validation unless limitations remain adjacent to every result.

## 14. Final recommendation

**A. READY FOR HISTORICAL CASE EVIDENCE DESIGN WITHOUT RUNTIME ADOPTION**

Recommended immediate level: evidence design toward a level-2 reproducible analysis case. Recommended technical path after evidence and mapping approval: Path B. NKS is suitable for first-pass evidence discovery, but not yet approved for execution and not bound to any existing profile. Begin with the bounded question, cutoff, and source ledger; select or reject a profile only after mechanism-level mapping. Runtime adoption, contract amendment, and public claims remain separate decisions.
