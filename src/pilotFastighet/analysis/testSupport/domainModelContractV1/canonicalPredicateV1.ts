import { canonicalizeBaselineValueV1 } from "../baselineCanonicalizationV1";
import type { Predicate } from "./contractV1";

export type CanonicalPredicateV1 =
  | { kind: "measure-below"; measureId: string; threshold: number }
  | { kind: "driver-at-level"; driverId: string; levelIds: string[] }
  | { kind: "all" | "any"; predicates: CanonicalPredicateV1[] };

/** Input has already crossed the bounded structural predicate boundary (depth <= 8). */
export function projectCanonicalPredicateV1(predicate: Predicate): CanonicalPredicateV1 {
  if (predicate.kind === "measure-below") return { kind: predicate.kind, measureId: predicate.measureId, threshold: predicate.threshold };
  if (predicate.kind === "driver-at-level") return { kind: predicate.kind, driverId: predicate.driverId, levelIds: [...predicate.levelIds].sort(compare) };
  const predicates = predicate.predicates.map(projectCanonicalPredicateV1);
  predicates.sort((left, right) => compare(canonicalizeBaselineValueV1(left, "$predicate"), canonicalizeBaselineValueV1(right, "$predicate")));
  return { kind: predicate.kind, predicates };
}

export function canonicalPredicateKeyV1(predicate: Predicate): string {
  return canonicalizeBaselineValueV1(projectCanonicalPredicateV1(predicate), "$predicate");
}

function compare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
