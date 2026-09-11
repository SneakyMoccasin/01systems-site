import type { ScheduleScenarioId } from "../reactScheduledAnalysisBoundary";
import type {
  DisplayedPeriod,
  InitiativeId,
} from "./contract";
import type { ValidatedStructuralObservationContractV2 } from "./contractV2";
import {
  INITIATIVE_SCHEDULE_SCENARIOS,
  type ScheduledInitiativeV1,
  type ValidatedScenarioInitiativeSchedulesV1,
} from "./initiativeScheduleContract";

export type InitiativeScheduleValidationCode =
  | "invalid-schedule"
  | "unknown-version"
  | "unsupported-comparison-policy"
  | "invalid-horizon"
  | "unknown-field"
  | "invalid-scenario-schedule"
  | "malformed-schedule-entry"
  | "unknown-initiative"
  | "duplicate-initiative"
  | "non-integer-execution-step"
  | "execution-step-outside-horizon"
  | "scenario-initiative-set-mismatch"
  | "resource-claim-outside-horizon";

export type InitiativeScheduleValidationIssue = Readonly<{
  code: InitiativeScheduleValidationCode;
  path: string;
  message: string;
  scenario?: ScheduleScenarioId;
  initiativeId?: string;
  executionStep?: unknown;
  resourceId?: string;
  horizon?: number;
}>;

export type InitiativeScheduleValidationResult =
  | Readonly<{
      valid: true;
      value: ValidatedScenarioInitiativeSchedulesV1;
      issues: readonly [];
    }>
  | Readonly<{
      valid: false;
      issues: readonly InitiativeScheduleValidationIssue[];
    }>;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as UnknownRecord)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function push(
  issues: InitiativeScheduleValidationIssue[],
  code: InitiativeScheduleValidationCode,
  path: string,
  message: string,
  metadata: Omit<InitiativeScheduleValidationIssue, "code" | "path" | "message"> = {}
): void {
  issues.push({ code, path, message, ...metadata });
}

function rejectUnknownFields(
  value: UnknownRecord,
  allowed: readonly string[],
  path: string,
  issues: InitiativeScheduleValidationIssue[]
): void {
  const allowedFields = new Set(allowed);
  for (const key of Object.keys(value).sort(compareText)) {
    if (!allowedFields.has(key)) {
      push(
        issues,
        "unknown-field",
        path === "$" ? key : `${path}.${key}`,
        `Unknown semantic field ${key} is not allowed.`
      );
    }
  }
}

function issueSort(
  left: InitiativeScheduleValidationIssue,
  right: InitiativeScheduleValidationIssue
): number {
  return (
    compareText(left.path, right.path) ||
    compareText(left.code, right.code) ||
    compareText(left.message, right.message)
  );
}

export function validateAndNormalizeScenarioInitiativeSchedulesV1(
  input: Readonly<{
    contract: ValidatedStructuralObservationContractV2;
    schedules: unknown;
    horizon: number;
  }>
): InitiativeScheduleValidationResult {
  const issues: InitiativeScheduleValidationIssue[] = [];
  const source = record(input.schedules);
  if (!source) {
    return deepFreeze({
      valid: false as const,
      issues: [
        {
          code: "invalid-schedule" as const,
          path: "$",
          message: "Initiative schedule must be an object.",
        },
      ],
    });
  }

  rejectUnknownFields(
    source,
    ["version", "comparisonPolicy", "A", "B"],
    "$",
    issues
  );
  if (source.version !== "initiative-schedule-v1") {
    push(issues, "unknown-version", "version", "Unsupported initiative schedule version.");
  }
  if (source.comparisonPolicy !== "same-initiative-set") {
    push(issues, "unsupported-comparison-policy", "comparisonPolicy", "Only same-initiative-set is supported.");
  }
  if (!Number.isInteger(input.horizon) || input.horizon < 1) {
    push(issues, "invalid-horizon", "horizon", "Horizon must be a positive integer.", {
      horizon: input.horizon,
    });
  }

  const definitionById = new Map(
    input.contract.initiatives.map((initiative) => [initiative.id as string, initiative])
  );
  const normalizedByScenario = { A: [] as ScheduledInitiativeV1[], B: [] as ScheduledInitiativeV1[] };
  const idsByScenario = { A: new Set<string>(), B: new Set<string>() };

  for (const scenario of INITIATIVE_SCHEDULE_SCENARIOS) {
    const schedule = source[scenario];
    if (!Array.isArray(schedule)) {
      push(issues, "invalid-scenario-schedule", scenario, `Scenario ${scenario} schedule must be an array.`, {
        scenario,
      });
      continue;
    }
    schedule.forEach((candidate, index) => {
      const path = `${scenario}[${index}]`;
      const entry = record(candidate);
      if (!entry) {
        push(issues, "malformed-schedule-entry", path, "Scheduled initiative must be an object.", {
          scenario,
        });
        return;
      }
      rejectUnknownFields(entry, ["initiativeId", "executionStep"], path, issues);
      const initiativeId =
        typeof entry.initiativeId === "string" ? entry.initiativeId : "";
      const executionStep = entry.executionStep;
      const definition = definitionById.get(initiativeId);
      if (!definition) {
        push(issues, "unknown-initiative", `${path}.initiativeId`, "Scheduled initiative is not defined by the V2 contract.", {
          scenario,
          initiativeId,
        });
      }
      const isDuplicate = idsByScenario[scenario].has(initiativeId);
      if (isDuplicate) {
        push(issues, "duplicate-initiative", `${path}.initiativeId`, "Initiative may be scheduled only once per scenario.", {
          scenario,
          initiativeId,
        });
      }
      idsByScenario[scenario].add(initiativeId);
      if (!Number.isInteger(executionStep)) {
        push(issues, "non-integer-execution-step", `${path}.executionStep`, "Execution step must be an integer.", {
          scenario,
          initiativeId,
          executionStep,
        });
      } else if ((executionStep as number) < 1 || (executionStep as number) > input.horizon) {
        push(issues, "execution-step-outside-horizon", `${path}.executionStep`, "Execution step must be inside the horizon.", {
          scenario,
          initiativeId,
          executionStep,
          horizon: input.horizon,
        });
      }
      if (definition && Number.isInteger(executionStep)) {
        for (const claim of definition.resourceClaims) {
          if ((executionStep as number) + claim.durationPeriods - 1 > input.horizon) {
            push(issues, "resource-claim-outside-horizon", path, "Resource claim extends beyond the analysis horizon.", {
              scenario,
              initiativeId,
              executionStep,
              resourceId: claim.resourceId,
              horizon: input.horizon,
            });
          }
        }
      }
      if (
        definition &&
        !isDuplicate &&
        Number.isInteger(executionStep) &&
        (executionStep as number) >= 1 &&
        (executionStep as number) <= input.horizon
      ) {
        normalizedByScenario[scenario].push({
          initiativeId: initiativeId as InitiativeId,
          executionStep: executionStep as DisplayedPeriod,
        });
      }
    });
  }

  for (const initiativeId of [...idsByScenario.A].sort(compareText)) {
    if (!idsByScenario.B.has(initiativeId)) {
      push(issues, "scenario-initiative-set-mismatch", "B", "Scenario B is missing an initiative scheduled in scenario A.", {
        scenario: "B",
        initiativeId,
      });
    }
  }
  for (const initiativeId of [...idsByScenario.B].sort(compareText)) {
    if (!idsByScenario.A.has(initiativeId)) {
      push(issues, "scenario-initiative-set-mismatch", "A", "Scenario A is missing an initiative scheduled in scenario B.", {
        scenario: "A",
        initiativeId,
      });
    }
  }

  issues.sort(issueSort);
  if (issues.length > 0) return deepFreeze({ valid: false as const, issues });
  const compareEntries = (left: ScheduledInitiativeV1, right: ScheduledInitiativeV1) =>
    left.executionStep - right.executionStep ||
    compareText(left.initiativeId, right.initiativeId);
  const normalized = {
    version: "initiative-schedule-v1" as const,
    comparisonPolicy: "same-initiative-set" as const,
    A: normalizedByScenario.A.sort(compareEntries),
    B: normalizedByScenario.B.sort(compareEntries),
  } as unknown as ValidatedScenarioInitiativeSchedulesV1;
  return deepFreeze({ valid: true as const, value: normalized, issues: [] as const });
}
