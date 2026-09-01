import { getExecutiveDemoInterventionLabel } from "@/src/pilotFastighet/executiveDemoTransformation";
import {
  actionHasOnlyModeledDrivers,
  DOMAIN_ACTIONS,
} from "@/src/pilotFastighet/actionEffects";
import { defaultRiskState } from "@/src/pilotFastighet/presetRiskMapping";
import type { StrategyColors } from "@/src/pilotFastighet/strategyColors";
import {
  isActionSupportedForScheduledExecution,
  type ReactExecutionMode,
  type ScenarioSchedules,
  type ScheduleScenarioId,
} from "@/src/pilotFastighet/analysis/reactScheduledAnalysisBoundary";

type ActionKey =
  | "increase_service_frequency"
  | "reduce_travel_time"
  | "expand_cycling_infrastructure"
  | "congestion_pricing"
  | "electrify_bus_fleet"
  | "transit_signal_priority"
  | "reduce_parking_supply"
  | "phase_project_starts"
  | "stagger_project_starts"
  | "increase_liquidity_buffer"
  | "reduce_leverage"
  | "secure_long_term_leases"
  | "energy_retrofit_program"
  | "delay_maintenance"
  | "early_refinancing";

type DomainKey = "realEstate" | "municipal" | "consulting";

const interventionLabels = {
  increase_service_frequency: {
    sv: "Öka turtäthet",
    en: "Increase service frequency",
  },
  reduce_travel_time: {
    sv: "Minska restid",
    en: "Reduce travel time",
  },
  expand_cycling_infrastructure: {
    sv: "Bygg ut cykelinfrastruktur",
    en: "Expand cycling infrastructure",
  },
  congestion_pricing: {
    sv: "Inför trängselskatt",
    en: "Congestion pricing",
  },
  electrify_bus_fleet: {
    sv: "Elektrifiera bussflotta",
    en: "Electrify bus fleet",
  },
  transit_signal_priority: {
    sv: "Signalprioritera kollektivtrafik",
    en: "Transit signal priority",
  },
  reduce_parking_supply: {
    sv: "Minska parkeringsutbud",
    en: "Reduce parking supply",
  },
  phase_project_starts: {
    sv: "Fasa projektstarter",
    en: "Phase project starts",
  },
  stagger_project_starts: {
    sv: "Sprid projektstarter över tid",
    en: "Stagger project starts",
  },
  increase_liquidity_buffer: {
    sv: "Öka likviditetsbuffert",
    en: "Increase liquidity buffer",
  },
  reduce_leverage: {
    sv: "Minska belåning",
    en: "Reduce leverage",
  },
  secure_long_term_leases: {
    sv: "Säkra långfristiga hyresavtal",
    en: "Secure long-term leases",
  },
  energy_retrofit_program: {
    sv: "Genomför energirenoveringsprogram",
    en: "Energy retrofit program",
  },
  delay_maintenance: {
    sv: "Skjut upp underhåll",
    en: "Delay maintenance",
  },
  early_refinancing: {
    sv: "Tidigarelägg refinansiering",
    en: "Early refinancing",
  },
} as const;

export function getActionPanelLabel(action: string, language: "sv" | "en"): string {
  return interventionLabels[action as ActionKey]?.[language] ?? action;
}

interface Props {
  language: "sv" | "en";
  domain?: DomainKey;
  selectedActionsA?: string[];
  selectedActionsB?: string[];
  strategyView?: "baseline" | "goal" | "both";
  strategyColors?: StrategyColors;
  applyAction: (action: ActionKey) => void;
  executiveDemoMode?: boolean;
  executionMode?: ReactExecutionMode;
  schedules?: ScenarioSchedules;
  editableScenario?: ScheduleScenarioId;
  simulationHorizon?: number;
  toggleScheduledAction?: (action: ActionKey) => void;
  updateScheduledActionStep?: (action: ActionKey, executionStep: number) => void;
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ActionPanel({
  language,
  domain = "consulting",
  selectedActionsA = [],
  selectedActionsB = [],
  strategyView = "baseline",
  strategyColors = { baseline: "#3b82f6", goal: "#ef4444" },
  applyAction,
  executiveDemoMode = false,
  executionMode = "configured-start",
  schedules = { A: [], B: [] },
  editableScenario = "A",
  simulationHorizon = 36,
  toggleScheduledAction,
  updateScheduledActionStep,
}: Props) {
  const interventionSectionTitles = {
    realEstate: { sv: "Interventioner", en: "Interventions" },
    municipal: { sv: "Åtgärder", en: "Measures" },
    consulting: { sv: "Beslut", en: "Decisions" },
  } as const;
  const actions = (DOMAIN_ACTIONS[domain] ?? DOMAIN_ACTIONS.consulting).filter(
    (action) =>
      actionHasOnlyModeledDrivers(action, Object.keys(defaultRiskState)) &&
      (executionMode === "configured-start" ||
        isActionSupportedForScheduledExecution(action))
  );
  const baselineSelected = new Set(
    executionMode === "actions-over-time"
      ? schedules.A.map((entry) => entry.actionId)
      : selectedActionsA
  );
  const goalSelected = new Set(
    executionMode === "actions-over-time"
      ? schedules.B.map((entry) => entry.actionId)
      : selectedActionsB
  );
  const effectiveBaselineSelected =
    strategyView === "goal" ? new Set<string>() : baselineSelected;
  const effectiveGoalSelected =
    strategyView === "baseline" ? new Set<string>() : goalSelected;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
        {executiveDemoMode
          ? language === "sv"
            ? "Transformationsinitiativ"
            : "Transformation initiatives"
          : interventionSectionTitles[domain]?.[language] ?? "Decisions"}
      </h3>

      <div className="flex flex-col gap-2">
        {actions.map((action) => {
          const inBaseline = effectiveBaselineSelected.has(action);
          const inGoal = effectiveGoalSelected.has(action);
          const isShared = inBaseline && inGoal;
          const isSelected = inBaseline || inGoal;

          const accentBackground = isShared
            ? `linear-gradient(180deg, ${strategyColors.baseline} 0 50%, ${strategyColors.goal} 50% 100%)`
            : inBaseline
              ? strategyColors.baseline
              : inGoal
                ? strategyColors.goal
                : "transparent";
          const background = isShared
            ? `linear-gradient(90deg, ${withAlpha(strategyColors.baseline, 0.22)} 0%, ${withAlpha(strategyColors.goal, 0.22)} 100%)`
            : inBaseline
              ? withAlpha(strategyColors.baseline, 0.22)
              : inGoal
                ? withAlpha(strategyColors.goal, 0.22)
                : "transparent";
          const borderColor = isShared
            ? withAlpha("#ffffff", 0.28)
            : inBaseline
              ? withAlpha(strategyColors.baseline, 0.7)
              : inGoal
                ? withAlpha(strategyColors.goal, 0.7)
                : "rgba(107, 114, 128, 0.9)";

          if (executionMode === "actions-over-time") {
            const scheduledEntry = schedules[editableScenario].find(
              (entry) => entry.actionId === action
            );
            const scenarioColor =
              editableScenario === "A" ? strategyColors.baseline : strategyColors.goal;
            return (
              <div
                key={action}
                className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center"
                style={{
                  borderColor: scheduledEntry
                    ? withAlpha(scenarioColor, 0.7)
                    : "rgba(107, 114, 128, 0.9)",
                  background: scheduledEntry
                    ? withAlpha(scenarioColor, 0.22)
                    : "transparent",
                }}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => toggleScheduledAction?.(action)}
                  style={{
                    color: scheduledEntry ? "#FFFFFF" : "#D1D5DB",
                    fontWeight: scheduledEntry ? 600 : 500,
                  }}
                >
                  {interventionLabels[action][language]}
                </button>
                {scheduledEntry && (
                  <label className="flex shrink-0 flex-col gap-1 text-xs text-gray-300 sm:items-end">
                    <span>
                      {language === "sv" ? "Genomförandeperiod" : "Execution period"}
                    </span>
                    <select
                      aria-label={`${
                        language === "sv" ? "Genomförandeperiod" : "Execution period"
                      }: ${interventionLabels[action][language]}, Scenario ${editableScenario}`}
                      value={scheduledEntry.executionStep}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation();
                        updateScheduledActionStep?.(action, Number(event.target.value));
                      }}
                      className="w-full min-w-24 rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 sm:w-auto"
                    >
                      {Array.from({ length: simulationHorizon }, (_, index) => index + 1).map(
                        (step) => (
                          <option key={step} value={step}>{`M${step}`}</option>
                        )
                      )}
                    </select>
                  </label>
                )}
              </div>
            );
          }

          return (
            <button
              key={action}
              className="relative px-3 py-2 pl-6 text-left rounded-lg border transition hover:bg-gray-700/60"
              onClick={() => applyAction(action)}
              style={{
                background,
                borderColor,
                color: isSelected ? "#FFFFFF" : "#D1D5DB",
                boxShadow: isShared
                  ? `inset 0 0 0 1px ${withAlpha(strategyColors.baseline, 0.26)}, inset 0 0 0 2px ${withAlpha(strategyColors.goal, 0.18)}`
                  : inBaseline
                    ? `inset 0 0 0 1px ${withAlpha(strategyColors.baseline, 0.18)}`
                    : inGoal
                      ? `inset 0 0 0 1px ${withAlpha(strategyColors.goal, 0.18)}`
                      : "none",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "0",
                  top: "0",
                  bottom: "0",
                  width: "8px",
                  borderTopLeftRadius: "8px",
                  borderBottomLeftRadius: "8px",
                  background: accentBackground,
                  opacity: isSelected ? 1 : 0,
                }}
              />
              <span
                className="block pr-10"
                style={{
                  fontWeight: isSelected ? 600 : 500,
                }}
              >
                {executiveDemoMode
                  ? getExecutiveDemoInterventionLabel(action, language)
                  : interventionLabels[action][language]}
              </span>
              {(inBaseline || inGoal) && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    gap: "4px",
                  }}
                >
                  {inBaseline && (
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "9999px",
                        background: strategyColors.baseline,
                        boxShadow: `0 0 0 1px ${withAlpha(strategyColors.baseline, 0.35)}`,
                      }}
                    />
                  )}
                  {inGoal && (
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "9999px",
                        background: strategyColors.goal,
                        boxShadow: `0 0 0 1px ${withAlpha(strategyColors.goal, 0.35)}`,
                      }}
                    />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
