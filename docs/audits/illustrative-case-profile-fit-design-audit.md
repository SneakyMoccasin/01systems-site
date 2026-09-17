# Illustrative Case Profile Fit Design Audit

Audit date: 2026-09-17

Repository: `/Users/christian/Projects/pulse_engine_clean`

Audited checkpoint: `e1215d94d817c2bfa1057bee6d927b4b4e82bbc3`

Scope: read-only design audit; no case implementation, profile change, runtime adoption, publication, or deployment

## Executive conclusion

**B. READY FOR MU ILLUSTRATIVE CASE DESIGN**

The recommended case is **Regional mobilitet: kapacitet före utökad trafik** / **Regional mobility: capacity before service expansion**, bound to the unchanged `legacy-municipal-v1` profile. It is the only candidate whose central subject and complete six-initiative roster can use profile-native actions without changing their mechanisms: bus-fleet electrification, cycling infrastructure, service frequency, parking supply, travel time, and transit-signal priority.

The case must be presented as wholly fictional. All organization facts, initiative timing, dependencies, resource capacities, claims, and initial state are future synthetic scenario inputs. The existing profile owns action effects, drivers, curves, propagation, and output rules. Structural Observation may diagnose prerequisites and shared-resource pressure, but it does not block execution and its resources do not alter engine state.

No profile or M1C–M1E amendment is required for an isolated, versioned illustrative analysis. The case is not yet implemented or publication-ready. It requires the separate design, execution, skeptical-review, and completion work specified below.

## Scope och claim boundary

The audit inspected actual checked-in code, fixtures, Goldens, contracts, harnesses, UI, and Swedish/English copy. Profile names and industry associations were not treated as evidence. The precondition passed before this file was created: branch `decision-flow-demo-v1`; local, tracking, and actual `origin` branch HEAD all `e1215d94d817c2bfa1057bee6d927b4b4e82bbc3`; clean index and worktree; remote `origin`.

This audit selects a design direction only. It does not choose values, execute a scenario, validate a business outcome, amend the verified contract surface, authorize runtime adoption, or approve publication. “Supported” below means representable by the current unchanged executable profile and analysis harness, not empirically correct for a real organization.

Primary evidence paths include:

- the three envelopes in `src/pilotFastighet/analysis/testSupport/domainModelContractV1/fixtures/legacy-profile-projection-v1/`;
- the three semantic payloads in `src/pilotFastighet/analysis/testSupport/fixtures/legacy-domain-profile-semantic-payload-v1/`;
- the six M0B inputs and Goldens in `engine-baseline-input-v1/` and `engine-output-golden-v1/`;
- M1C parsers, validators, compatibility declarations, and completion audits;
- M1D differential execution and `domain-model-contract-m1d-completion-audit.md`;
- M1E runner, 23-test suite, design, readiness, and completion audits;
- `runInitiativeScheduledAnalysis.ts`, Structural Observation V2, and their validators;
- `scheduledExecutiveDemo.ts`, `executiveDemoFraming.ts`, `executiveDemoPlaybackScenario.ts`, `app/pilot-fastighet/page.tsx`, and result components.

## Existing profile semantics

### Shared native contract

All three projected profiles use ordinal driver scores on `legacy-risk-scale-v1`: `low`/0, `moderate`/1, `high`/2, `severe`/3, clamped to 0–3. A driver impact selects a profile-owned curve multiplier for `load`, `cost`, `recovery`, or `sensitivity`; these are modeled dimensions, not currency, passengers, headcount, energy, or probability. Structural margin and constraint state are deterministic model outputs, not measured organizational outcomes.

Actions are admitted only if their canonical ID is supported by the selected executable profile. Their driver deltas are applied immediately before `stepForward()` in the scheduled period; the resulting state is visible in that period's trajectory. Same-period initiatives are combined canonically and provenance is sorted by initiative ID. A/B must contain the same initiative-ID set. The initiative harness rejects unknown effect definitions and non-canonical deltas.

The M1C compatibility schedule policy is source action ID plus execution step, ordered by execution step and code-unit action ID. It rejects duplicate source actions per scenario, undeclared actions, and undeclared effects before execution. A failed normalization is atomic. Propagation is an ordered monotone-raise fixed point: high/severe triggers raise a target to `high`, later occurrences see writes in the same iteration, iterations repeat until stable, and no-change events are suppressed. Compatibility-only liquidity edges exist for RE and CO, not MU.

Dependencies and shared resources belong to Structural Observation V2. A dependency is finish-to-start. A resource claim has a scenario-defined amount and duration; a resource has constant or periodized capacity. These values produce diagnostics such as prerequisite pressure and over-allocation. They are post-hoc observations: they do not delay, reject, or change an engine action. Labels are presentation metadata and excluded from semantic fingerprints.

### Canonical driver inventory

| Canonical ID | Declared modeled meaning from impacts | Unit | Direction and owner |
| --- | --- | --- | --- |
| `demand-risk` | demand-side pressure | ordinal score 0–3 | higher increases `load`; profile contract |
| `pricing-power-risk` | pricing-power pressure | ordinal score 0–3 | higher increases `load`; profile contract |
| `tenant-stability-risk` | tenant/revenue stability pressure | ordinal score 0–3 | higher increases `load`, decreases `recovery`; profile contract |
| `maintenance-intensity-risk` | maintenance pressure | ordinal score 0–3 | higher decreases `recovery`; profile contract |
| `operational-efficiency-risk` | operational inefficiency pressure | ordinal score 0–3 | higher increases `cost`, decreases `recovery`; profile contract |
| `energy-exposure-risk` | energy exposure | ordinal score 0–3 | higher increases `cost`; profile contract |
| `interest-rate-exposure-risk` | interest-rate exposure | ordinal score 0–3 | higher increases `cost`; profile contract |
| `leverage-level-risk` | leverage pressure | ordinal score 0–3 | higher increases `cost` and `sensitivity`; profile contract |
| `refinancing-risk` | refinancing pressure | ordinal score 0–3 | higher increases `cost`; profile contract |
| `market-volatility-risk` | market volatility | ordinal score 0–3 | higher increases `load`; profile contract |
| `regulatory-pressure-risk` | regulatory pressure | ordinal score 0–3 | higher increases `cost`; profile contract |
| `capital-commitment-rigidity-risk` | rigidity of committed capital | ordinal score 0–3 | higher decreases `recovery`; profile contract |
| `accessibility` | modeled accessibility | ordinal score 0–3 | higher decreases `load`, increases `recovery`; profile contract |
| `modal_attractiveness` | modeled modal attractiveness | ordinal score 0–3 | higher decreases `load`, increases `recovery`; profile contract |
| `congestion_pressure` | congestion pressure | ordinal score 0–3 | higher increases `load` and `cost`; profile contract |
| `operational_capacity` | modeled operating capacity | ordinal score 0–3 | higher decreases `load`, increases `recovery`; profile contract |
| `transit_signal_priority` | modeled signal-priority state | ordinal score 0–3 | higher decreases `load`, increases `recovery`; profile contract |
| `budget_pressure` | budget pressure | ordinal score 0–3 | higher increases `cost`, decreases `recovery`; profile contract |

All 18 drivers exist in each projection, but profile action support, propagation, constraint, calibration, and compatibility differ. The word “risk” cannot be silently removed where doing so reverses or softens meaning.

### RE — `legacy-real-estate-v1`

Identity owner: source profile `legacy-real-estate-v1`, model `pilot-fastighet-v0.4`, calibration `legacy-global-v1`, source semantic hash `sha256:898817bed271a470aecd941612a2bd49a95bec8acf480e5f645ffa0b9b5b33bc`. The envelope fixture is the hash-bound owner.

| Canonical action | Exact effects in score units | Admission boundary |
| --- | --- | --- |
| `delay_maintenance` | `maintenance-intensity-risk +1`; `tenant-stability-risk +0.5` | native |
| `early_refinancing` | `refinancing-risk -1`; `interest-rate-exposure-risk -0.5` | native |
| `energy_retrofit_program` | `energy-exposure-risk -1`; `operational-efficiency-risk +1` | native |
| `increase_liquidity_buffer` | `refinancing-risk -1` | compatibility admission retains this effect; ignores `liquidityPressure -1` |
| `phase_project_starts` | `capital-commitment-rigidity-risk -1`; `refinancing-risk -0.5` | native |
| `reduce_leverage` | `refinancing-risk -1`; `interest-rate-exposure-risk -1` | native |
| `secure_long_term_leases` | `tenant-stability-risk -1`; `demand-risk -1` | native |
| `stagger_project_starts` | `capital-commitment-rigidity-risk -1` | compatibility admission retains this effect; ignores `implementationPacingRisk -1` |

RE has `refinancing-constraint`: activate when structural margin is below 0.8; while active multiply `cost` by 1.15 and `recovery` by 0.8. Sustain is `until-explicit-transition`, but no authoritative legacy sustain threshold is contracted; sustain parity is explicitly excluded. Liquidity, covenant, and custom registry entries are inert compatibility placeholders. RE owns the full finance/property propagation chain plus the transport edges recorded in its envelope. Its implicit `liquidity-pressure` compatibility node has no dimension impacts. Unsupported transport actions are explicitly excluded.

### MU — `legacy-municipal-v1`

Identity owner: source profile `legacy-municipal-v1`, model `pilot-fastighet-v0.4`, calibration `transport-causal-subset-v2`, source semantic hash `sha256:81ae1fa9f8a21a46c4cd04e4540c98db5750bd1305ecc6e215162d8da634193b`.

| Canonical action | Exact effects in score units | Admission boundary |
| --- | --- | --- |
| `electrify_bus_fleet` | `energy-exposure-risk -1`; `operational-efficiency-risk -0.5`; `capital-commitment-rigidity-risk +0.5` | native |
| `expand_cycling_infrastructure` | `modal_attractiveness +2`; `congestion_pressure -1`; `budget_pressure +1` | native |
| `increase_service_frequency` | `accessibility +1`; `operational_capacity -0.5`; `budget_pressure +0.5` | native |
| `reduce_parking_supply` | `demand-risk +1` | native; do not claim an unmodeled modal-shift effect |
| `reduce_travel_time` | `modal_attractiveness +1` | native |
| `transit_signal_priority` | `transit_signal_priority +1` | native |

MU has no executable constraint. Its native propagation edges are exactly `operational-efficiency-risk -> maintenance-intensity-risk` on high/severe, `accessibility -> demand-risk` on low, and `budget_pressure -> capital-commitment-rigidity-risk` on high/severe; the target is raised to high. `congestion_pricing` is compatibility-admitted but output-neutral because both source effects target absent native drivers; it is excluded from the candidate roster. Property/finance actions are excluded. MU has no compatibility-only propagation edges and no implicit liquidity node.

### CO — `legacy-consulting-v1`

Identity owner: source profile `legacy-consulting-v1`, model `pilot-fastighet-v0.4`, calibration `legacy-global-v1`, source semantic hash `sha256:b1bfcc87c86142264d3bd8d9082475720bdf3dcf8d7d7ec97583a5b40c5e08a7`.

CO's native action inventory is `delay_maintenance`, `early_refinancing`, `electrify_bus_fleet`, `expand_cycling_infrastructure`, `increase_service_frequency`, `phase_project_starts`, `reduce_parking_supply`, `reduce_travel_time`, and `transit_signal_priority`, with the exact effects listed in the RE/MU tables. `congestion_pricing` is compatibility-admitted but output-neutral. It has the RE refinancing constraint, global and transport propagation, implicit liquidity compatibility node, and inert registry placeholders. It explicitly excludes `energy_retrofit_program`, `increase_liquidity_buffer`, `reduce_leverage`, `secure_long_term_leases`, and `stagger_project_starts`.

No native CO action expresses sales pipeline, staffing, skills, utilization, delivery quality, client commitments, or change capacity. Therefore a consulting case cannot be inferred from `profileId` alone.

### Curves, output, compatibility, and exclusions

Each driver points to its named `legacy-curve-v1.<driver-id>`. Curves are profile-owned level-to-multiplier maps: mostly linear; interest-rate exposure and leverage are exponential with exponent 1.2; refinancing is logistic with `k 0.8`, `x0 3`. Missing/unsupported curve configuration uses the declared neutral multiplier policy only at the verified equivalence boundary; it is not permission to invent a curve.

Native output comprises per-period trajectory, margin, registry/constraint history, cascade events, terminal state, A/B comparison, and execution provenance. Structural Observation adds diagnostic snapshots/fingerprints for dependencies and resources without modifying those results. M1E closes exactly three envelopes and six neutral/stressed fixtures; it does not authorize a seventh case as M1E evidence. New curves, effects, constraints, drivers, blocking dependencies, automatic resource scheduling, recovery transitions, duration-based actions, optimization, probabilities, money, emissions, passenger counts, or staffing mechanics are excluded or deferred.

## Current demo baseline

The public Executive Demo uses `legacy-real-estate-v1`, 36 model periods, identical initial conditions, and the same three actions in both sequences:

| Action | Adverse/load first | Mitigation/stabilization first |
| --- | ---: | ---: |
| `delay_maintenance` | M1 | M18 |
| `early_refinancing` | M9 | M1 |
| `secure_long_term_leases` | M18 | M3 |

It shows trajectory, structural margin, constraint activation, cascades, action timing, comparison, and interpretation. Copy explicitly says that only order and model timing differ, and that results are configured paths rather than a recommendation or forecast. The presentation says the mitigation-first path preserves margin longer and moves visible constraint activation from M2 to M21 before terminal convergence.

The older playback framing “Transformation overload vs phased execution” configures different initial risk states and is a curated presentation fixture; the current scheduled Executive Demo instead proves same start/same action set. Executive mode hides or simplifies expert controls, foregrounds a sequence table, graph, summary, structural findings, and explanatory copy. Dependencies and shared resources exist in Structural Observation and inspector language, but the public three-action schedule does not provide a concrete organizational roster or visibly sourced resource model.

A new case must therefore add a distinct transport decision context, six recognizable decisions, explicit finish-to-start prerequisites, named shared implementation resources, synthetic-input disclosure, profile/version/hashes, sensitivity boundary, and reproduction path. Merely renaming the existing three RE actions as “transformation initiatives” would add no material value.

## RE candidate

Proposed minimum: **Fastighetsportfölj: stabilisering före nya projekt** / **Property portfolio: stabilization before new projects**. A fictional property owner compares a capital-first sequence with an operating-foundations-first sequence.

| Candidate initiative | Canonical action | Classification | Reason |
| --- | --- | --- | --- |
| Postpone planned maintenance | `delay_maintenance` | exact semantic fit | identical mechanism |
| Refinance early | `early_refinancing` | exact semantic fit | identical mechanism |
| Run energy retrofit programme | `energy_retrofit_program` | exact semantic fit | identical mechanism, including operational-efficiency increase |
| Increase liquidity buffer | `increase_liquidity_buffer` | exact but compatibility-bounded | only refinancing effect survives; no liquidity state node |
| Phase project starts | `phase_project_starts` | exact semantic fit | identical mechanism |
| Reduce leverage | `reduce_leverage` | exact semantic fit | identical mechanism |
| Secure long-term leases | `secure_long_term_leases` | exact semantic fit | identical mechanism |
| Stagger project starts | `stagger_project_starts` | exact but compatibility-bounded | only capital-rigidity effect survives; no implementation-pacing node |

Sequence A would place retrofit/project starts and maintenance deferral early, with refinancing, leases, leverage, and buffers later. Sequence B would place refinancing/leverage/leases and project phasing first, retrofit next, and maintenance deferral last. Candidate dependencies: refinancing before leverage reduction; phasing before project-start staggering; portfolio access before retrofit. Candidate shared resources: investment committee attention and delivery-management capacity. Those relationships and units would be synthetic diagnostics, not profile semantics.

CE can show canonical risk-score trajectories, propagation, the refinancing constraint, margin, timing, and diagnostics. It cannot show rent, vacancy, energy consumption, project NPV, actual financing availability, workforce scheduling, or an optimized portfolio plan. The candidate is semantically valid but too close to the present RE sequence demo and repeats two of its three actions.

## MU candidate

Proposed minimum: **Regional mobilitet: kapacitet före utökad trafik** / **Regional mobility: capacity before service expansion**. A fictional regional mobility authority has approved the same six measures but must choose whether to expand service before or after enabling capacity and coordination work.

| Candidate initiative | Canonical action | Classification | Presentation rule |
| --- | --- | --- | --- |
| Elektrifiera bussflottan / Electrify the bus fleet | `electrify_bus_fleet` | exact semantic fit | canonical translation only |
| Bygg ut cykelinfrastrukturen / Expand cycling infrastructure | `expand_cycling_infrastructure` | exact semantic fit | canonical translation only |
| Öka turtätheten / Increase service frequency | `increase_service_frequency` | exact semantic fit | canonical translation only |
| Minska parkeringsutbudet / Reduce parking supply | `reduce_parking_supply` | exact semantic fit | canonical translation only |
| Minska restiden / Reduce travel time | `reduce_travel_time` | exact semantic fit | canonical translation only |
| Inför signalprioritering för kollektivtrafik / Introduce transit signal priority | `transit_signal_priority` | bounded presentation alias | “introduce” only clarifies the action; mechanism and ID remain visible |

Sequence A, **Service expansion first**, starts `increase_service_frequency`, then `electrify_bus_fleet`; it adds `reduce_travel_time` and `transit_signal_priority` later, followed by `expand_cycling_infrastructure` and `reduce_parking_supply`. Sequence B, **Enabling capacity first**, starts `transit_signal_priority` and `reduce_travel_time`, then `expand_cycling_infrastructure` and `electrify_bus_fleet`, followed by `increase_service_frequency` and `reduce_parking_supply`. Exact periods remain unchosen.

Candidate finish-to-start dependencies are signal priority before the service-frequency start, and travel-time work before the service-frequency start. Candidate shared resources are service-planning capacity and implementation/coordination capacity. Electrification, signal priority, cycling work, and travel-time work may claim the latter; frequency and travel-time work may claim the former. All amounts, durations, capacities, and dependency assertions are synthetic scenario inputs and diagnostic only.

Decision question: how do two orders of the same six measures change modeled structural room to act, driver propagation, and observed dependency/resource pressure? CE can show deterministic configured differences, early divergence, propagation, terminal convergence or divergence, and diagnostic pressure. It cannot forecast ridership, congestion, travel time, emissions, cost, delivery dates, engineering feasibility, political acceptance, or service reliability. It cannot enforce the prerequisites or allocate resources.

## CO candidate

Proposed minimum: **Tjänsteorganisation: bemanning före åtaganden** / **Service organization: staffing before commitments**.

| Candidate initiative | Nearest canonical action | Classification | Failure |
| --- | --- | --- | --- |
| Win new client work | none | unsupported | no sales/client-commitment action |
| Recruit delivery staff | none | unsupported | no staffing action |
| Build scarce-skill capacity | none | unsupported | no skill-capacity action |
| Start client project | `phase_project_starts` | unsupported as proposed | phasing is not a project-start event or staffing mechanism |
| Phase portfolio starts | `phase_project_starts` | bounded presentation alias | usable only as abstract capital/refinancing mechanism, not consulting delivery |
| Delay internal maintenance | `delay_maintenance` | bounded presentation alias at best | tenant-stability effect is not consulting delivery pressure |
| Increase service frequency | `increase_service_frequency` | unsupported | transport accessibility/capacity/budget effects cannot mean client cadence |
| Refinance early | `early_refinancing` | exact action but peripheral | does not answer the central staffing/commitment question |

The smallest comprehensible consulting scenario requires central unsupported initiatives. Sequences such as “sell first, staff later” versus “staff first, sell later” would fabricate sales, staffing, skill, utilization, and delivery mechanisms. CO therefore fails the stop condition despite its profile name.

## Comparative matrix

Scores are directional aids only: 5 is strongest/best except risk and complexity, where 5 is highest risk/complexity. The semantic veto governs the decision.

| Dimension | RE | MU | CO | Judgment |
| --- | ---: | ---: | ---: | --- |
| Exact semantic fit | 5 | 5 | 1 | CO vetoed |
| Low alias need | 4 | 5 | 1 | MU strongest |
| No new mechanism needed | 5 | 5 | 1 | CO vetoed |
| No profile/M1C–M1E amendment | 5 | 5 | 1 | RE/MU pass |
| Explainable within 60 seconds | 4 | 5 | 4 | MU measures are immediately legible |
| Visual clarity | 4 | 5 | 3 | MU supports a clear enabling-versus-expansion story |
| Distinct from current demo | 1 | 5 | 4 | RE loses materially |
| Commercial relevance | 4 | 4 | 5 | CO relevance cannot override missing semantics |
| Swedish relevance | 4 | 5 | 4 | MU strongest |
| International relevance | 4 | 5 | 5 | MU transport language travels well |
| Current outreach relevance | 3 | 5 | 4 | MU broadens beyond current property demo |
| Dependency visibility | 4 | 5 | 5 | only diagnostic, all candidates |
| Shared-resource visibility | 4 | 5 | 5 | only diagnostic, all candidates |
| Implementation-pressure visibility | 4 | 5 | 5 | MU offers concrete coordination resources |
| Option-preservation explanation | 4 | 4 | 5 | relative room to act only, never explicit option valuation |
| Distinguishes CE from project planning | 3 | 5 | 4 | MU links order to modeled state, not merely dates |
| Forecast-misinterpretation risk | 3 | 4 | 4 | transport outputs require especially strong disclaimers |
| Implementation complexity | 3 | 3 | 5 | CO requires new semantics |
| Testability | 5 | 5 | 1 | RE/MU deterministic under existing harness |
| Swedish/English claim parity | 5 | 5 | 2 | CO aliases would diverge or mislead |

RE and MU both pass semantic fit. MU wins because it is materially distinct from the present RE demo and can expose concrete dependencies and shared implementation capacity without changing an action. CO is rejected by central unsupported mechanisms, not by score.

## Selected case

**Swedish title:** Regional mobilitet: kapacitet före utökad trafik

**English title:** Regional mobility: capacity before service expansion

**Profile:** `legacy-municipal-v1`

**Organization:** fictional regional mobility authority

**Audience:** regional executives, service and portfolio owners, transformation leaders, public-sector decision makers, and international mobility/programme audiences.

The situation is a pre-implementation choice between starting visible service expansion early and first sequencing enabling measures. Both paths contain the same six canonical actions and the same initial state. Only action order and model periods differ. The case is chosen for exact action semantics, a coherent 60-second narrative, a visibly different domain from the current demo, and a concrete reason to expose dependency and shared-resource diagnostics.

Preliminary roster: `electrify_bus_fleet`, `expand_cycling_infrastructure`, `increase_service_frequency`, `reduce_parking_supply`, `reduce_travel_time`, `transit_signal_priority`.

Preliminary Sequence A, service expansion first: frequency; electrification; travel-time action; signal priority; cycling infrastructure; parking reduction. Preliminary Sequence B, enabling capacity first: signal priority; travel-time action; cycling infrastructure; electrification; frequency; parking reduction. Exact periods and concurrency are future inputs, not audit findings.

Displayed dependencies: signal priority → service-frequency start; travel-time action → service-frequency start. Displayed shared resources: service-planning capacity and implementation/coordination capacity. These are synthetic, versioned, unit-defined Structural Observation inputs. They are not profile-owned causal edges and cannot be shown as engine blockers.

The CE question is: **Given the same synthetic starting state and the same six profile-native mobility measures, how does their configured order change the model's structural trajectory and the observed concentration of dependency and shared-resource pressure?**

Allowed main claim: **Within the published synthetic scenario and unchanged `legacy-municipal-v1` semantics, CE deterministically compares how two configured orders of the same six measures change modeled trajectories and structural diagnostics.**

The case differs from the current demo through domain, six-action roster, explicit initiative graph, named shared resources, transparent synthetic-input ledger, profile/version/hash disclosure, and reproducible case identity. It must not reuse the generic “transformation overload vs phased execution” narrative.

## Rejected cases

RE is not selected because the current public Executive Demo already uses the same profile, the same sequencing proposition, and two of the candidate's central actions. Although an eight-action portfolio case is semantically possible, its added context does not overcome the risk of appearing to be the existing demo with expanded labels.

CO is rejected because its central intended mechanisms—sales, staffing, skills, utilization, delivery commitments, and change capacity—have no canonical actions or effects. Recasting transport, tenancy, maintenance, or refinancing effects as consulting delivery would change meaning and require a new profile or contract amendment.

## Swedish ingress

Detta är ett illustrativt scenario för en fiktiv regional mobilitetsorganisation. Samtliga data, tidpunkter, beroenden, resursantaganden och startvärden är syntetiska och publiceras tillsammans med caset. Cascade Engine jämför två ordningar av samma sex åtgärder: en där trafikutbudet utökas tidigt och en där möjliggörande kapacitet kommer först. Resultatet visar deterministiska skillnader inom den angivna profilen och det publicerade scenariot. Det är inte en prognos, optimering, branschbenchmark, kundanalys eller återgivning av ett historiskt projekt.

## English ingress

This is an illustrative scenario for a fictional regional mobility authority. All data, timing, dependencies, resource assumptions, and starting values are synthetic and published with the case. Cascade Engine compares two orders of the same six measures: one that expands service early and one that places enabling capacity first. The result shows deterministic differences within the stated profile and published scenario. It is not a forecast, optimization, industry benchmark, customer analysis, or reconstruction of a historical project.

## Transparency contract

The future page must show, in this order or an equally visible hierarchy: Illustrative scenario; Why this case exists; Decision question; Assumptions; Profile and version; Initiatives; Dependencies; Shared resources; Sequence A; Sequence B; CE output; Interpretation; Sensitivity boundary; What the result does not claim; engine/input/profile/result hashes; and reproduction instructions.

Visual provenance must remain adjacent to every material value:

| Class | Required visual treatment | Examples |
| --- | --- | --- |
| Synthetic input | “SYNTHETIC INPUT” badge, one accent color, link to assumption ID | initial scores, periods, resource capacities, claims, durations, prerequisites |
| Profile-owned semantics | “PROFILE · `legacy-municipal-v1`” badge and canonical ID | action effect, driver, curve, propagation edge |
| Derived CE input | “DERIVED” badge plus reproducible rule and parents | normalized schedule, canonical ordering, resolved deltas |
| Deterministic output | “CE OUTPUT” badge plus result hash | trajectory, margin, cascade event, diagnostic |
| Analyst interpretation | “INTERPRETATION” callout in visually separate neutral panel | why a divergence may matter; limitations |

The UI must never blend synthetic resource pressure with engine state. A dependency/resource diagnostic needs the label “observed, not enforced”. Model periods need a separate period register and must not be presented as calendar months until explicitly mapped. Canonical IDs, profile identity, source semantic hash, case input hash, result hash, engine commit, and reproduction command must be available without contacting the vendor.

## Supported claims

- The scenario and organization are fictional and all case data are synthetic and published.
- Both sequences use the same initial state, initiative set, profile, horizon, and engine version.
- The configured ordering produces the displayed deterministic output under the published inputs.
- The six actions have the exact profile-owned effects stated in the MU action table.
- Structural Observation reports configured dependency and resource pressure without changing execution.
- Results apply only to the versioned published scenario and sensitivity envelope.
- CE adds state-transition, propagation, margin, and diagnostic comparison to a schedule; it does not replace a project plan.

## Prohibited claims

- The scenario represents a real customer, authority, historical programme, or observed outcome.
- Either sequence is optimal, recommended, guaranteed better, empirically validated, or causally true.
- The output forecasts ridership, travel time, congestion, emissions, cost, budget, delivery, or public response.
- Synthetic values are regional statistics, industry benchmarks, calibrated operational data, or evidence.
- Dependencies block execution or shared resources are allocated by the engine.
- `reduce_parking_supply` produces an unmodeled modal shift; `congestion_pricing` is part of the roster; electrification proves an emissions result.
- Structural margin is money, capacity, probability, safety, resilience, or a directly observed KPI.
- M1E's six locked cases verify this seventh illustrative case or authorize production runtime use.

## Minimal next scope

No existing file should change in the first design checkpoint. Proposed new files, exact names subject to a separate readiness review:

1. `src/pilotFastighet/analysis/illustrativeCases/regional-mobility-capacity-before-service-expansion-v1.case.json` — closed synthetic source input and visible assumptions.
2. `src/pilotFastighet/analysis/illustrativeCases/regional-mobility-capacity-before-service-expansion-v1.schema.ts` — strict parser/types, limits, duplicate-key and unknown-field rejection.
3. `src/pilotFastighet/analysis/illustrativeCases/regional-mobility-capacity-before-service-expansion-v1.validate.ts` — semantic validation against MU identity, six-action exact inventory, same-set schedules, prerequisites, resources, and units.
4. `src/pilotFastighet/analysis/illustrativeCases/regional-mobility-capacity-before-service-expansion-v1.run.ts` — isolated harness calling the existing initiative-scheduled path; no runtime registration.
5. `src/pilotFastighet/analysis/illustrativeCases/regional-mobility-capacity-before-service-expansion-v1.snapshot.json` — deterministic output snapshot.
6. `src/pilotFastighet/analysis/illustrativeCases/regional-mobility-capacity-before-service-expansion-v1.test.ts` — parser, identity, effects, ordering, determinism, non-interference, negative, and sensitivity tests.
7. `src/pilotFastighet/analysis/illustrativeCases/regional-mobility-capacity-before-service-expansion-v1.webdata.ts` — separately derived bilingual presentation data after execution review.
8. `docs/cases/regional-mobility-capacity-before-service-expansion-v1-assumptions.md` — value rationale, units, sensitivities, and non-claims.
9. `docs/audits/regional-mobility-capacity-before-service-expansion-v1-skeptical-review.md`.
10. `docs/audits/regional-mobility-capacity-before-service-expansion-v1-completion-audit.md`.

Case identity: `regional-mobility-capacity-before-service-expansion-v1`. Canonical ordering must use direct code-unit comparison for object keys/IDs and execution period then initiative ID for schedules; arrays whose order is semantic retain declared order. Reuse `canonical-json-v1` only after a design review confirms the domain boundary; do not invent competing canonicalization.

Required hash domains are: raw case bytes; canonical synthetic scenario input; assumption register; selected profile envelope and source semantic payload; normalized/resolved execution input; engine commit/executable identity; deterministic engine result; Structural Observation result; bilingual web-data projection. Each must name owner, projection, algorithm, and version. Presentation copy is not allowed to mutate executable identity.

Scenario inputs to choose later are initial driver state/scores, horizon, six execution periods per sequence, two prerequisite declarations, resource IDs, units, capacities, claims, durations, and sensitivity alternatives. Every value requires an assumption ID, design rationale, owner, allowable range, and effect on interpretation. None may be described as observed mobility data. Profile-owned deltas, curves, edges, and constraints are not scenario inputs and cannot be recalibrated.

The future parser must be closed, resource-bounded, descriptor-safe where applicable, finite-number safe, duplicate-key rejecting, and recursively detached/frozen. Semantic validation must bind the exact profile, reject extra/missing/duplicate actions, reject non-canonical deltas, enforce same A/B initiative sets and horizon bounds, validate prerequisite references and acyclicity, require explicit resource units/capacities/claims/durations, and forbid unsupported action IDs.

The execution checkpoint must prove deterministic repeated output, unchanged profile/Goldens/M1C–M1E files, engine-result equality before/after observation, exact provenance, and sensitivity-bound claims. Swedish and English pages must share one data projection and identical claim policy. Only after skeptical review and completion audit may an existing route/navigation/copy file be proposed for modification in a separate publication checkpoint. No deployment belongs to either checkpoint.

No profile or M1C–M1E amendment is needed if this scope remains an isolated illustrative case using the unchanged profile. Adding a new driver, action, curve, effect, constraint, blocking dependency, resource-to-engine feedback, or M1E equivalence claim immediately changes the verdict to not implementation-ready and requires the corresponding contract decision.

## Stop conditions

- Stop if any roster item cannot retain its canonical MU action ID and exact effects.
- Stop if traffic engineering, fleet charging, emissions, ridership, cost, political feasibility, or service reliability becomes a causal output claim.
- Stop if resource/dependency diagnostics are presented as execution blockers or engine-state causes.
- Stop if required values cannot be labeled synthetic, owned, versioned, hash-bound, and sensitivity-tested.
- Stop if Swedish and English copy require different claims.
- Stop if a new curve, effect, constraint, driver, action, calibration, runtime registration, M0B Golden change, or M1C–M1E extension is required.
- Stop if the page collapses into the present demo's generic overload-versus-phasing story.
- Stop if readers cannot see the illustrative/non-forecast boundary adjacent to the result.
- Stop if the case cannot be reproduced from published inputs and hashes.

All conditions were assessed for design. MU passes subject to the future gates above. RE fails distinctness as the preferred public case. CO fails central semantic support.

## Final conclusion

**B. READY FOR MU ILLUSTRATIVE CASE DESIGN**

Proceed only with a separate, isolated design checkpoint for `regional-mobility-capacity-before-service-expansion-v1`. Keep `legacy-municipal-v1`, its six native actions, M0B Goldens, M1C–M1E surfaces, and runtime unchanged. Treat all organization, timing, dependency, resource, and initial-state values as published synthetic assumptions. Do not publish until deterministic execution, bilingual claim review, skeptical review, and a separate completion audit have passed.
