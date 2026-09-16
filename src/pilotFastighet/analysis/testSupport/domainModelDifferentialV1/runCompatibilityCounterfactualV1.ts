import { isDeepStrictEqual } from "node:util";
import {
  collectDiscrepancies,
  compareCodeUnits,
  detachedFrozen,
  type ComparatorBResultV1,
  type CompatibilityAttributionV1,
  type DifferentialDiscrepancyV1,
  type DifferentialObservationV1,
} from "./differentialExecutionV1";

function failure(path: string, left: unknown, right: unknown): DifferentialDiscrepancyV1 {
  return detachedFrozen({ path, left, right, classification: "compatibility-rule" as const });
}

function reportValue(value: unknown): unknown {
  return value === undefined ? { presence: "absent" as const } : value;
}

export function comparePureNativeToCompatibilityEffective(input: Readonly<{
  pureNative: DifferentialObservationV1;
  compatibilityEffective: DifferentialObservationV1;
  counterfactuals: readonly DifferentialObservationV1[];
}>): ComparatorBResultV1 {
  const permitted = [...input.compatibilityEffective.activatedDeclarationPaths].sort(compareCodeUnits);
  const primary = collectDiscrepancies(
    input.pureNative.comparisonSurface,
    input.compatibilityEffective.comparisonSurface,
    "compatibility-rule",
    "/comparisonSurface"
  ).sort((a, b) => compareCodeUnits(a.path, b.path));
  const primaryByPath = new Map(primary.map((entry) => [entry.path, entry]));
  const failures: DifferentialDiscrepancyV1[] = [];
  const attributions: CompatibilityAttributionV1[] = [];
  const attributedPaths = new Set<string>();

  for (const counterfactual of input.counterfactuals) {
    if (counterfactual.activatedDeclarationPaths.length !== 1) {
      failures.push(failure("/counterfactual/activatedDeclarationPaths", counterfactual.activatedDeclarationPaths, "one internally derived declaration"));
      continue;
    }
    const declarationPath = counterfactual.activatedDeclarationPaths[0];
    if (!permitted.includes(declarationPath)) {
      failures.push(failure("/counterfactual/activatedDeclarationPaths/0", declarationPath, "effective declaration"));
      continue;
    }
    const isolated = collectDiscrepancies(
      input.pureNative.comparisonSurface,
      counterfactual.comparisonSurface,
      "compatibility-rule",
      "/comparisonSurface"
    ).sort((a, b) => compareCodeUnits(a.path, b.path));
    if (isolated.length === 0) {
      failures.push(failure("/counterfactual/effect", [], "observed output difference"));
      continue;
    }
    for (const discrepancy of isolated) {
      const actual = primaryByPath.get(discrepancy.path);
      if (!actual || !isDeepStrictEqual(actual.left, discrepancy.left) || !isDeepStrictEqual(actual.right, discrepancy.right)) {
        failures.push(failure(
          discrepancy.path,
          actual ? { before: reportValue(actual.left), after: reportValue(actual.right) } : { presence: "absent-primary-difference" },
          { before: reportValue(discrepancy.left), after: reportValue(discrepancy.right) }
        ));
      } else {
        attributedPaths.add(discrepancy.path);
      }
    }
    const ledger = counterfactual.compatibilityLedger;
    if (ledger.length !== 1 || ledger[0].declarationPath !== declarationPath || ledger[0].status !== "applied") {
      failures.push(failure("/counterfactual/compatibilityLedger", ledger, "one matching applied entry"));
      continue;
    }
    attributions.push(detachedFrozen({
      declarationPaths: [declarationPath],
      profileId: input.pureNative.profileId,
      caseId: input.pureNative.caseId,
      scenario: "combined" as const,
      sourceId: ledger[0].sourceId,
      nativeId: ledger[0].nativeId,
      executionStep: ledger[0].executionStep,
      observedOutputPaths: isolated.map((entry) => entry.path),
      observedDifferences: isolated.map((entry) => ({
        path: entry.path,
        before: entry.left === undefined ? { presence: "absent" as const } : entry.left,
        after: entry.right === undefined ? { presence: "absent" as const } : entry.right,
      })),
      mechanismLedger: { admitted: [declarationPath], applied: [declarationPath], ignored: [], rejected: [] },
    }));
  }

  const unattributed = primary.filter((entry) => !attributedPaths.has(entry.path));
  if (unattributed.length > 0) failures.push(failure("/attribution/unattributedOutputPaths", unattributed.map((entry) => entry.path), []));
  const duplicatePaths = attributions.flatMap((entry) => entry.observedOutputPaths).filter((path, index, all) => all.indexOf(path) !== index);
  if (duplicatePaths.length > 0) failures.push(failure("/attribution/duplicateOutputPaths", duplicatePaths, []));
  const discrepancies = failures.sort((a, b) => compareCodeUnits(a.path, b.path));
  return detachedFrozen({
    comparator: "pure-native-vs-compatibility-effective-v1",
    ok: discrepancies.length === 0,
    permittedDeclarationPaths: permitted,
    attributions: discrepancies.length === 0 ? attributions : [],
    discrepancies,
  });
}
