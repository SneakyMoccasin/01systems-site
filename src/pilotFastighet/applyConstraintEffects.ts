import type { DimensionMultipliers } from "./computeDimensionMultipliers";

export function applyConstraintEffects(
  base: DimensionMultipliers
): DimensionMultipliers {
  return { ...base };
}
