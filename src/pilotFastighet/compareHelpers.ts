/**
 * UI-only compare helpers for workshop-ready Compare Panel.
 * No engine logic; pure derivations from snapshot/list data.
 */

export type SnapshotWithLifecycle = {
  engineState?: {
    registry?: { RefinancingConstraint?: { lifecycle?: string }; [k: string]: unknown };
    step?: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

/**
 * Returns the first index i where snapshots[i] has lifecycle === "ACTIVE".
 * Safe optional chaining; returns null if never ACTIVE.
 */
export function findTippingIndex(historySnapshots: SnapshotWithLifecycle[]): number | null {
  for (let i = 0; i < historySnapshots.length; i++) {
    const life =
      historySnapshots[i]?.engineState?.registry?.RefinancingConstraint?.lifecycle;
    if (life === "ACTIVE") return i;
  }
  return null;
}

export type ExecutiveConclusionInput = {
  deltaMargin?: number;
  lifecycleA?: string;
  lifecycleB?: string;
  tippingStepA?: number | null;
  tippingStepB?: number | null;
};

export type ExecutiveConclusion = {
  title: string;
  tags: string[];
};

const MAX_TITLE_LEN = 140;

/**
 * Deterministic executive conclusion from deltas and lifecycle/tipping.
 * No AI; mapping rules only.
 */
export function buildExecutiveConclusion(
  input: ExecutiveConclusionInput
): ExecutiveConclusion {
  const {
    deltaMargin = 0,
    lifecycleA,
    lifecycleB,
    tippingStepA,
    tippingStepB,
  } = input;

  const tags: string[] = [];

  if (deltaMargin > 0) tags.push("Margin ↑");
  else if (deltaMargin < 0) tags.push("Margin ↓");

  const aActive = lifecycleA === "ACTIVE";
  const bActive = lifecycleB === "ACTIVE";
  const aStep = tippingStepA ?? null;
  const bStep = tippingStepB ?? null;
  const bTipsEarlier =
    bStep != null && aStep != null && bStep < aStep;
  const bWorse =
    bTipsEarlier ||
    (bActive && !aActive) ||
    (lifecycleB === "ACTIVE" && lifecycleA !== "ACTIVE");
  if (bWorse) tags.push("Risk ↑");

  let title: string;
  if (bStep != null && aStep != null && bStep < aStep) {
    title = `Scenario B triggers ACTIVE earlier (Q${bStep} vs Q${aStep}), trading margin/stability.`;
  } else if (aStep != null && bStep == null) {
    title = `Scenario B avoids ACTIVE while A triggers it (Q${aStep}).`;
  } else if (aStep == null && bStep != null) {
    title = `Scenario A avoids ACTIVE while B triggers it (Q${bStep}).`;
  } else if (aStep == null && bStep == null) {
    title =
      "No ACTIVE tipping observed; compare margin/stability deltas.";
  } else {
    title =
      "No ACTIVE tipping observed; compare margin/stability deltas.";
  }

  if (title.length > MAX_TITLE_LEN) {
    title = title.slice(0, MAX_TITLE_LEN - 3) + "...";
  }

  return { title, tags };
}
