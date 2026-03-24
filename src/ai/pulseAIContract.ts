export type PulseAIMode =
  | "scenario_interpretation"
  | "executive_summary"
  | "inspector_analysis";

export type PulseDomain =
  | "real_estate"
  | "generic";

export interface PulseScenarioEvent {
  /**
   * Optional stable identifier for cross-referencing events.
   */
  id?: string;
  /**
   * Quarter index in the simulation timeline (1-based).
   */
  quarter?: number;
  /**
   * Optional wall-clock timestamp for the event.
   */
  timestamp?: string;
  /**
   * Human-readable label for the event.
   */
  label: string;
  /**
   * Domain-specific category or type, e.g. "Maintenance deferred".
   */
  category?: string;
  /**
   * Qualitative impact on the system.
   */
  impact?: "positive" | "negative" | "neutral";
  /**
   * Free-form metadata for provider-specific extensions.
   */
  metadata?: Record<string, unknown>;
}

export interface PulseAIScenarioSnapshot {
  /**
   * Short label for this scenario snapshot, e.g. "Current strategy".
   */
  label?: string;
  /**
   * One or two sentence description of the scenario outcome.
   */
  description?: string;
  /**
   * Key scalar outcome metric for the scenario (e.g. margin).
   */
  margin?: number;
  /**
   * High-level structural status label, e.g. "stable", "structural_collapse".
   */
  structuralStatus?: string;
  /**
   * Quarter where tipping risk is detected, if any.
   */
  tippingQuarter?: number | null;
  /**
   * Simulation horizon in quarters used for this summary.
   */
  horizonQuarters?: number;
  /**
   * Additional named metrics that should be surfaced to the model.
   */
  keyMetrics?: Record<string, number>;
}

export interface PulseAIInput {
  /**
   * Which AI capability is being requested.
   */
  mode: PulseAIMode;
  /**
   * Domain the simulation belongs to (e.g. real_estate).
   */
  domain: PulseDomain;
  /**
   * Optional label for the user-defined scenario prompt or preset.
   */
  scenarioLabel?: string;
  /**
   * Summary of the baseline / current strategy outcome.
   */
  baselineSummary?: PulseAIScenarioSnapshot;
  /**
   * Summary of the alternative strategy outcome.
   */
  alternativeSummary?: PulseAIScenarioSnapshot;
  /**
   * Structured risk state for the baseline scenario.
   * Keys are domain-specific parameter identifiers.
   */
  riskStateA?: Record<string, string | number>;
  /**
   * Structured risk state for the alternative scenario.
   * Keys are domain-specific parameter identifiers.
   */
  riskStateB?: Record<string, string | number>;
  /**
   * Key scalar metrics that should be highlighted across modes,
   * e.g. minimum margins, delta margins, or constraint flags.
   */
  keyMetrics?: Record<string, number>;
  /**
   * Chronological list of relevant scenario events.
   */
  events?: PulseScenarioEvent[];
}

export interface PulseAIOutput {
  /**
   * One-line headline capturing the main insight.
   */
  headline: string;
  /**
   * Short paragraph summarising the situation.
   */
  summary: string;
  /**
   * Main drivers that explain the outcome.
   */
  keyDrivers: string[];
  /**
   * Concise comparison of baseline vs alternative.
   */
  keyDifferences: string[];
  /**
   * Explicit risks or caveats that should be surfaced.
   */
  warnings: string[];
  /**
   * Recommended next action or decision.
   */
  recommendedAction: string;
  /**
   * Normalised confidence score in [0, 1].
   */
  confidence: number;
}

