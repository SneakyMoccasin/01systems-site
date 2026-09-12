import type { DriverDeltas } from "../RealEstateEngine";

export type CanonicalDriverDeltaContribution = Readonly<{
  effectIdentity: string;
  instanceIdentity: string;
  driverDeltas: DriverDeltas;
}>;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function invariant(message: string): never {
  throw new Error(`Canonical driver-delta batch invariant failed: ${message}`);
}

/**
 * Combines canonical effects in a stable effect/instance/driver order.
 * Values are summed without rounding so the engine remains responsible for
 * its existing precision and clamp semantics.
 */
export function combineCanonicalDriverDeltaBatch(
  contributions: readonly CanonicalDriverDeltaContribution[]
): DriverDeltas {
  const combined = new Map<string, number>();
  const ordered = [...contributions].sort(
    (left, right) =>
      compareText(left.effectIdentity, right.effectIdentity) ||
      compareText(left.instanceIdentity, right.instanceIdentity)
  );

  for (const contribution of ordered) {
    if (contribution.effectIdentity.length === 0) {
      invariant("effect identity must be non-empty");
    }
    if (contribution.instanceIdentity.length === 0) {
      invariant("instance identity must be non-empty");
    }
    for (const [driver, delta] of Object.entries(contribution.driverDeltas).sort(
      ([left], [right]) => compareText(left, right)
    )) {
      if (typeof delta !== "number" || !Number.isFinite(delta)) {
        invariant(`non-finite delta for ${driver}`);
      }
      combined.set(driver, (combined.get(driver) ?? 0) + delta);
    }
  }

  return Object.freeze(
    Object.fromEntries(
      [...combined.entries()].sort(([left], [right]) => compareText(left, right))
    )
  ) as DriverDeltas;
}
