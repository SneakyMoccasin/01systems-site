import { getExecutiveDemoInterventionLabel } from "@/src/pilotFastighet/executiveDemoTransformation";
import type { StrategyColors } from "@/src/pilotFastighet/strategyColors";

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

interface Props {
  language: "sv" | "en";
  domain?: DomainKey;
  selectedActionsA?: string[];
  selectedActionsB?: string[];
  strategyView?: "baseline" | "goal" | "both";
  strategyColors?: StrategyColors;
  applyAction: (action: ActionKey) => void;
  executiveDemoMode?: boolean;
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
}: Props) {
  const interventionSectionTitles = {
    realEstate: { sv: "Interventioner", en: "Interventions" },
    municipal: { sv: "Åtgärder", en: "Measures" },
    consulting: { sv: "Beslut", en: "Decisions" },
  } as const;
  const domainActions: Record<DomainKey, ActionKey[]> = {
    realEstate: [
      "delay_maintenance",
      "early_refinancing",
      "phase_project_starts",
      "stagger_project_starts",
      "increase_liquidity_buffer",
      "reduce_leverage",
      "secure_long_term_leases",
      "energy_retrofit_program",
    ],
    municipal: [
      "increase_service_frequency",
      "reduce_travel_time",
      "expand_cycling_infrastructure",
      "congestion_pricing",
      "electrify_bus_fleet",
      "transit_signal_priority",
      "reduce_parking_supply",
    ],
    consulting: [
      "increase_service_frequency",
      "reduce_travel_time",
      "expand_cycling_infrastructure",
      "congestion_pricing",
      "electrify_bus_fleet",
      "transit_signal_priority",
      "reduce_parking_supply",
      "phase_project_starts",
      "delay_maintenance",
      "early_refinancing",
    ],
  };
  const actions = domainActions[domain] ?? domainActions.consulting;
  const baselineSelected = new Set(selectedActionsA);
  const goalSelected = new Set(selectedActionsB);
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
