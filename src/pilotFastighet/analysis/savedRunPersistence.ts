import type { EngineState } from "../RealEstateEngine";
import type { ExecutableIdentity } from "../executableDomainProfile";

export type SavedRunSnapshot = Readonly<{
  snapshotId: string;
  label?: string;
  createdAt: number;
  engineState: EngineState;
  metadata: Readonly<{
    caseId: string | null;
    scenario: "A" | "B";
    modelVersion: string;
  }>;
  executionIdentity?: ExecutableIdentity;
}>;

export type SavedRunCompatibility =
  | Readonly<{ classification: "compatible"; comparable: true }>
  | Readonly<{
      classification:
        | "legacy-or-unknown"
        | "different-domain"
        | "different-profile"
        | "different-model-version"
        | "different-calibration-version";
      comparable: false;
    }>;

export function createSavedRunSnapshot(input: Readonly<{
  snapshotId: string;
  label?: string;
  createdAt: number;
  engineState: EngineState;
  caseId: string | null;
  scenario: "A" | "B";
  executionIdentity: ExecutableIdentity;
}>): SavedRunSnapshot {
  return {
    snapshotId: input.snapshotId,
    label: input.label,
    createdAt: input.createdAt,
    engineState: input.engineState,
    metadata: {
      caseId: input.caseId,
      scenario: input.scenario,
      modelVersion: input.executionIdentity.modelVersion,
    },
    executionIdentity: Object.freeze({ ...input.executionIdentity }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCompleteExecutableIdentity(
  value: unknown
): value is ExecutableIdentity {
  if (!isRecord(value)) return false;
  return (
    typeof value.domainId === "string" &&
    typeof value.profileId === "string" &&
    typeof value.modelVersion === "string" &&
    typeof value.calibrationVersion === "string"
  );
}

function isReadableSnapshot(value: unknown): value is SavedRunSnapshot {
  if (!isRecord(value) || !isRecord(value.metadata)) return false;
  return (
    typeof value.snapshotId === "string" &&
    typeof value.createdAt === "number" &&
    isRecord(value.engineState) &&
    (value.metadata.scenario === "A" || value.metadata.scenario === "B")
  );
}

export function readSavedRunHistory(raw: string | null): SavedRunSnapshot[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isReadableSnapshot);
  } catch {
    return [];
  }
}

export function loadSavedRunHistory(
  storage: Pick<Storage, "getItem">,
  key: string
): SavedRunSnapshot[] {
  try {
    return readSavedRunHistory(storage.getItem(key));
  } catch {
    return [];
  }
}

export function evaluateSavedRunCompatibility(
  left: SavedRunSnapshot,
  right: SavedRunSnapshot
): SavedRunCompatibility {
  const a = left.executionIdentity;
  const b = right.executionIdentity;
  if (!isCompleteExecutableIdentity(a) || !isCompleteExecutableIdentity(b)) {
    return { classification: "legacy-or-unknown", comparable: false };
  }
  if (a.domainId !== b.domainId) return { classification: "different-domain", comparable: false };
  if (a.profileId !== b.profileId) return { classification: "different-profile", comparable: false };
  if (a.modelVersion !== b.modelVersion) {
    return { classification: "different-model-version", comparable: false };
  }
  if (a.calibrationVersion !== b.calibrationVersion) {
    return { classification: "different-calibration-version", comparable: false };
  }
  return { classification: "compatible", comparable: true };
}

export const evaluateSavedRunPair = evaluateSavedRunCompatibility;

export function calculateCompatibleSavedMarginDelta(
  left: SavedRunSnapshot,
  right: SavedRunSnapshot
): number | null {
  return evaluateSavedRunCompatibility(left, right).comparable
    ? right.engineState.margin - left.engineState.margin
    : null;
}

export function getSavedRunCompatibilityMessage(
  compatibility: SavedRunCompatibility,
  language: "sv" | "en"
): string | null {
  if (compatibility.comparable) return null;
  if (compatibility.classification === "legacy-or-unknown") {
    return language === "sv"
      ? "Minst ett äldre resultat saknar fullständig versionsinformation och kan inte jämföras direkt."
      : "At least one legacy result lacks complete version information and cannot be compared directly.";
  }
  return language === "sv"
    ? "Resultaten skapades med olika domän-, modell- eller kalibreringsversioner och kan därför inte jämföras direkt."
    : "The results were created with different domain, model, or calibration versions and cannot be compared directly.";
}

export const getSavedRunMismatchMessage = getSavedRunCompatibilityMessage;
