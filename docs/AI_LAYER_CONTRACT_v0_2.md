# AI Layer Contract v0.2

**Design document only. No implementation.**

This document defines the structural boundaries of the AI interpretation layer. It is a contract for system philosophy and architectural separation.

---

## 1. Purpose of AI Layer

- The AI layer is an **interpretation layer**. It consumes outputs produced by the system and produces human-oriented explanations and summaries.
- The AI layer is **not** part of deterministic engine logic. It does not participate in simulation, calculation, or state transitions. It observes and interprets; it does not compute or decide outcomes.

---

## 2. What AI Is Allowed to Read

The AI layer may consume the following, in read-only form:

- **Margin history series** — time-series margin values for scenarios (e.g. A and B).
- **Load values** — current or historical load metrics exposed by the system.
- **Capacity values** — capacity or capacity-related metrics exposed by the system.
- **Structural status classification** — the system’s classification of structural status (e.g. stable, marginal exceedance, structural collapse).
- **Scenario metadata** — identifiers, labels, and descriptive metadata for scenarios.
- **Snapshot deltas (A vs B)** — comparative deltas between scenario A and scenario B (e.g. margin delta, stability delta).
- **Constraint flags** — read-only constraint or lifecycle flags produced by the engine.

All of the above are **inputs** to the AI layer. The AI layer has no authority over how these values are produced.

---

## 3. What AI Is Not Allowed to Influence

The AI layer must **not** influence, override, or mutate:

- **Engine calculations** — any numerical or logical computation inside the engine.
- **Margin math** — margin formulas, aggregations, or derivations.
- **Structural thresholds** — tipping, sustain, collapse, or other classification thresholds.
- **Deterministic transitions** — state machines, lifecycle transitions, or step logic.
- **Baseline parameters** — risk levels, configuration, or initial conditions.
- **Scenario state mutation** — creation, update, or deletion of scenario or snapshot state.
- **Any persistence layer** — storage, retrieval, or modification of persisted data.

The AI layer is **downstream and read-only** with respect to the engine and persistence. It has no write path into core system state.

---

## 4. What AI Is Allowed to Output

The AI layer may produce only the following classes of output:

- **Interpretation paragraphs** — natural-language explanation of system outputs (e.g. structural status, margin evolution).
- **Risk explanation** — description of risk levels, tipping, or exposure in human terms.
- **Executive summary** — condensed, decision-oriented summary of scenario outcomes.
- **Comparative reasoning (A vs B)** — explanation of differences between scenarios and implications.
- **Suggested questions for decision makers** — prompts or questions to focus discussion, without prescribing decisions.

All outputs are **advisory and presentational**. They do not feed back into engine logic, thresholds, or state.

---

## 5. Deterministic Lock Statement

- **All calculations remain fully deterministic.** The presence of an AI layer does not change the determinism of engine or simulation logic. Same inputs always yield same numerical and classification results.
- **The AI layer has zero write access to engine state.** It cannot set, clear, or modify any value that the engine or simulation uses for computation or transition.
- **The AI layer cannot alter classification outcomes.** Structural status, tipping, and other classifications are produced solely by deterministic logic. The AI may describe them; it may not change them.

---

## 6. Future Extension (Optional)

- Any future use of AI in this system must remain **advisory suggestions only**. Suggestions may inform user choices but must not automatically alter engine parameters, thresholds, or state.
- AI must remain **clearly separated from the engine**. No shared mutable state, no AI-driven overrides of deterministic rules, and no AI output used as input to engine calculations.

---

*End of contract. This document defines system philosophy and architectural boundaries only.*
