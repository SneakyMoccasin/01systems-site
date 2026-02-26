import type { ConstraintRegistry } from "./constraintState";
import type { DimensionMultipliers } from "./computeDimensionMultipliers";
import { CONSTRAINT_EFFECT_CONFIG } from "./constraintEffectConfig";

function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

function applyOne(
  base: DimensionMultipliers,
  severity: number,
  cfg: { load?: number; cost?: number; recovery?: number; sensitivity?: number }
): DimensionMultipliers {
  const loadCoef = cfg.load ?? 0;
  const costCoef = cfg.cost ?? 0;
  const recoveryCoef = cfg.recovery ?? 0;
  const sensCoef = cfg.sensitivity ?? 0;

  const nextLoad = base.load * (1 + severity * loadCoef);
  const nextCost = base.cost * (1 + severity * costCoef);
  const nextSensitivity = base.sensitivity * (1 + severity * sensCoef);

  const recoveryMultiplier = 1 - severity * recoveryCoef;
  const nextRecovery = base.recovery * clampMin(recoveryMultiplier, 0.1);

  return {
    load: nextLoad,
    cost: nextCost,
    recovery: nextRecovery,
    sensitivity: nextSensitivity,
  };
}

export function applyConstraintEffects(
  base: DimensionMultipliers,
  registry: ConstraintRegistry
): DimensionMultipliers {
  let current = { ...base };

  for (const type of Object.keys(registry) as (keyof ConstraintRegistry)[]) {
    const state = registry[type];
    if (!state) continue;

    if (state.lifecycle !== "ACTIVE" && state.lifecycle !== "RECOVERING") continue;

    const cfg = CONSTRAINT_EFFECT_CONFIG[state.type];
    if (!cfg) continue;

    const severity = state.severityIndex;
    if (typeof severity !== "number" || severity <= 0) continue;

    current = applyOne(current, severity, cfg);
  }

  return current;
}
