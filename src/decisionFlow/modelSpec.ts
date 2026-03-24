/**
 * Model spec and invariants (documentation + placeholder criteria).
 * Not used in simulation logic yet.
 */

export const METRIC_SEMANTICS: Record<string, string> = {
  load: "System load or demand pressure relative to capacity.",
  cost: "Operational cost or resource expenditure.",
  rawDelta: "Raw load minus cost (diagnostic only).",
  margin: "Structural handlingsutrymme (normalized headroom, used for status)."
};

export const STABILITY_SPEC = {
  marginFloor: -10,
  marginCeiling: 20,
  loadFloor: 0,
  loadCeiling: 100,
  costFloor: 0,
  costCeiling: 100
} as const;
