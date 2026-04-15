import React from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";

/** Aligns cascade events to graph month indices (same logic as MarginGraph.mapCascadeToMarkers). */
function mapCascadeEventToIndex(
  e: CascadeEvent,
  arrayIndex: number,
  seriesLength: number,
  horizon?: number | null
): number {
  if (seriesLength <= 0) return 0;
  const safeStep =
    Number.isFinite(e.step) && e.step >= 0 ? e.step : arrayIndex + 1;
  const scaledIndex =
    horizon != null && Number.isFinite(horizon) && horizon > 0
      ? Math.floor((safeStep / horizon) * seriesLength)
      : safeStep;
  return Math.max(0, Math.min(seriesLength - 1, scaledIndex));
}

function findCascadeEventAtSelectedMonth(
  events: CascadeEvent[] | undefined,
  selectedMonthIndex: number | null | undefined,
  seriesLength: number,
  simulationHorizon?: number | null
): CascadeEvent | null {
  if (!events?.length || selectedMonthIndex == null) return null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const idx = mapCascadeEventToIndex(e, i, seriesLength, simulationHorizon);
    if (idx === selectedMonthIndex) return e;
  }
  return null;
}

/**
 * CascadeEvent has no `index`/`type`; we map to the timeline index and derive
 * semantics from propagation `iteration` (matches reaction → secondary → … progression).
 */
function getStructuralStateText(
  marginValue: number | null | undefined,
  uiLanguage: "sv" | "en"
): string {
  if (marginValue == null) {
    return uiLanguage === "sv" ? "Ingen data" : "No data";
  }

  if (marginValue >= 5) {
    return uiLanguage === "sv"
      ? "Robust struktur"
      : "Robust structure";
  }

  if (marginValue >= -5) {
    return uiLanguage === "sv"
      ? "Hållbar struktur"
      : "Sustainable structure";
  }

  if (marginValue >= -20) {
    return uiLanguage === "sv"
      ? "Strukturell erosion"
      : "Structural erosion";
  }

  return uiLanguage === "sv"
    ? "Systemrisk – kollapszon"
    : "Collapse risk zone";
}

function getTippingWindowText(
  selectedMonthIndex: number | null | undefined,
  tippingMarginIndexB: number | null | undefined,
  uiLanguage: "sv" | "en"
): string {
  if (tippingMarginIndexB == null) {
    return uiLanguage === "sv"
      ? "Ingen tipping-risk"
      : "No tipping risk";
  }

  if (selectedMonthIndex == null) {
    return uiLanguage === "sv"
      ? "Ingen tipping-risk"
      : "No tipping risk";
  }

  const distance = tippingMarginIndexB - selectedMonthIndex;

  if (distance >= 2) {
    return uiLanguage === "sv"
      ? "Tipping-risk ökar"
      : "Tipping risk increasing";
  }

  if (distance === 1) {
    return uiLanguage === "sv"
      ? "Inne i tipping-fönster"
      : "Inside tipping window";
  }

  if (distance === 0) {
    return uiLanguage === "sv"
      ? "Tipping-punkt nådd"
      : "Tipping threshold reached";
  }

  return uiLanguage === "sv"
    ? "System stabiliserat efter tipping (ny nivå)"
    : "System stabilized after tipping (new level)";
}

function getDecisionEffectText(
  marginImpact: number | null | undefined,
  uiLanguage: "sv" | "en"
): string {
  if (marginImpact == null) {
    return uiLanguage === "sv"
      ? "Ingen effektdata"
      : "No impact data";
  }

  if (marginImpact > 2) {
    return uiLanguage === "sv"
      ? "Beslutet förbättrar strukturell marginal tydligt"
      : "Decision clearly improves structural margin";
  }

  if (marginImpact > 0.5) {
    return uiLanguage === "sv"
      ? "Beslutet förbättrar strukturell marginal"
      : "Decision improves structural margin";
  }

  if (marginImpact >= -0.5) {
    return uiLanguage === "sv"
      ? "Beslutet har begränsad effekt"
      : "Decision has limited impact";
  }

  if (marginImpact >= -2) {
    return uiLanguage === "sv"
      ? "Beslutet försämrar strukturell marginal"
      : "Decision reduces structural margin";
  }

  return uiLanguage === "sv"
    ? "Beslutet försämrar strukturell marginal tydligt"
    : "Decision clearly reduces structural margin";
}

function getScenarioDifferenceText(
  marginImpact: number | null | undefined,
  uiLanguage: "sv" | "en"
): string {
  if (marginImpact == null) {
    return uiLanguage === "sv"
      ? "Ingen skillnadsdata"
      : "No difference data";
  }

  const absImpact = Math.abs(marginImpact);

  if (absImpact < 0.5) {
    return uiLanguage === "sv"
      ? "Scenarierna är strukturellt lika"
      : "Scenarios remain structurally similar";
  }

  if (absImpact < 2) {
    return uiLanguage === "sv"
      ? "Scenarierna divergerar svagt"
      : "Scenarios diverge slightly";
  }

  if (absImpact < 5) {
    return uiLanguage === "sv"
      ? "Scenarierna divergerar tydligt"
      : "Scenarios diverge clearly";
  }

  return uiLanguage === "sv"
    ? "Scenarierna divergerar kraftigt"
    : "Scenarios diverge strongly";
}

function getCascadeEventLabel(
  iteration: number,
  language: "sv" | "en"
): string {
  if (iteration === 1)
    return language === "sv"
      ? "Primär systemreaktion"
      : "Primary system reaction";

  if (iteration === 2)
    return language === "sv"
      ? "Sekundär kaskadspridning"
      : "Secondary cascade propagation";

  if (iteration === 3)
    return language === "sv"
      ? "Accelererande påverkan"
      : "Accelerating structural impact";

  return language === "sv"
    ? "Stabiliserande respons"
    : "Stabilizing response";
}

type Props = {
  language: "sv" | "en";
  caseName: string;
  tippingQuarter: number | null;
  currentMargin: number;
  alternativeMargin: number;
  marginImpact: number;
  cascadeEvents?: CascadeEvent[];
  cascadeEventsA?: CascadeEvent[];
  cascadeEventsB?: CascadeEvent[];
  seriesLengthA: number;
  seriesLengthB: number;
  simulationHorizon?: number;
  selectedMonthIndex?: number | null;
  primaryDriver?: string | null;
  systemPressure?: string | null;
  constraintBreakQuarter?: number | null;
  structuralStatus?: string | null;
  /** Absolute margin at selected month (Scenario B preferred for structural state when set). */
  selectedMarginValueA?: number | null;
  selectedMarginValueB?: number | null;
  selectedGoal?: "accessibility" | "congestion" | "margin_stability" | "avoid_tipping";
};

const AIInspectorPanel: React.FC<Props> = ({
  language = "en",
  caseName,
  tippingQuarter,
  currentMargin,
  alternativeMargin,
  marginImpact,
  cascadeEvents = [],
  cascadeEventsA = [],
  cascadeEventsB = [],
  seriesLengthA,
  seriesLengthB,
  simulationHorizon,
  selectedMonthIndex = null,
  primaryDriver = null,
  systemPressure = null,
  constraintBreakQuarter = null,
  structuralStatus = null,
  selectedMarginValueA = null,
  selectedMarginValueB = null,
  selectedGoal,
}) => {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const riskLabels = (t as any).riskLabels ?? {};
  const driverLabels = (t as any).driverLabels ?? {};
  const policyDriverKeys = new Set([
    "accessibility",
    "modal_attractiveness",
    "congestion_pressure",
    "operational_capacity",
    "transit_signal_priority",
    "budget_pressure",
  ]);
  const getResolvedDriverLabel = (key: string | null) =>
    key ? (driverLabels[key] ?? riskLabels[key] ?? key) : null;
  const structuralStateText = getStructuralStateText(
    selectedMarginValueB ?? selectedMarginValueA ?? alternativeMargin,
    language
  );
  const structuralStateHeading =
    language === "sv" ? "STRUKTURELL STATUS" : "STRUCTURAL STATE";
  const simulationCascadeEvents =
    cascadeEvents.length > 0
      ? cascadeEvents
      : cascadeEventsB?.length
        ? cascadeEventsB
        : cascadeEventsA;
  const cascadeDriverSequence = simulationCascadeEvents.flatMap((event) => [
    event.sourceRisk,
    event.targetRisk,
  ]);
  const firstPolicyDriverFromCascade =
    cascadeDriverSequence.find((key) => policyDriverKeys.has(key)) ?? null;
  const firstSystemDriverFromCascade =
    cascadeDriverSequence.find((key) => !policyDriverKeys.has(key)) ?? null;
  const policyDriverKey =
    primaryDriver && policyDriverKeys.has(primaryDriver)
      ? primaryDriver
      : firstPolicyDriverFromCascade;
  const systemDriverKey =
    primaryDriver && !policyDriverKeys.has(primaryDriver)
      ? primaryDriver
      : firstSystemDriverFromCascade;
  const resolvedPolicyDriver = getResolvedDriverLabel(policyDriverKey);
  const resolvedSystemDriver = getResolvedDriverLabel(systemDriverKey);
  const policyDriver = resolvedPolicyDriver;
  const systemDriver = resolvedSystemDriver;
  const policyDriverLabel = language === "sv" ? "Policydrivare" : "Policy driver";
  const systemDriverLabel = language === "sv" ? "Systemdrivare" : "System driver";
  const primaryDriverFallbackText =
    primaryDriver == null && policyDriver && systemDriver
      ? uiLanguage === "sv"
        ? `Primär strukturell påverkan: ${systemDriver} (via ${policyDriver})`
        : `Primary structural influence: ${systemDriver} (via ${policyDriver})`
      : null;
  const scenarioALabel = language === "sv" ? "Nuläge" : "Baseline";
  const scenarioBLabel = language === "sv" ? "Målstrategi" : "Goal strategy";
  const cascadeStatusText =
    simulationCascadeEvents.length > 0
      ? language === "sv"
        ? "Kaskad: Detekterad"
        : "Cascade: Detected"
      : language === "sv"
        ? "Kaskad: Ingen"
        : "Cascade: None";
  const cascadeStatusHeading =
    language === "sv" ? "KASKADSTATUS" : "CASCADE STATUS";
  const tippingWindowText = getTippingWindowText(
    selectedMonthIndex,
    tippingQuarter ? tippingQuarter - 1 : null,
    language
  );
  const tippingWindowHeading =
    language === "sv" ? "TIPPING-FÖNSTER" : "TIPPING WINDOW";
  const selectedDifference =
    selectedMarginValueA != null && selectedMarginValueB != null
      ? selectedMarginValueB - selectedMarginValueA
      : marginImpact;

  const decisionEffectText = getDecisionEffectText(selectedDifference, language);
  const scenarioDifferenceText = getScenarioDifferenceText(selectedDifference, language);
  const constraintActive = constraintBreakQuarter != null;
  const cascadeDetected = simulationCascadeEvents.length > 0;
  const marginTrend = marginImpact < 0 ? "DECLINING" : "STABLE";
  const goalProgressText = (() => {
    if (!selectedGoal) return null;

    switch (selectedGoal) {
      case "accessibility":
        return uiLanguage === "sv"
          ? "Tillgängligheten förbättras strukturellt i målstrategin."
          : "Accessibility improves structurally in the goal strategy.";

      case "congestion":
        return uiLanguage === "sv"
          ? "Trängselrelaterad systembelastning minskar i målstrategin."
          : "Congestion-related system load decreases in the goal strategy.";

      case "margin_stability":
        return uiLanguage === "sv"
          ? "Strukturell marginal stabiliseras över simuleringshorisonten."
          : "Structural margin stabilizes across the simulation horizon.";

      case "avoid_tipping":
        return uiLanguage === "sv"
          ? "Ingen tipping-risk identifierad inom simuleringshorisonten."
          : "No tipping risk detected within the simulation horizon.";

      default:
        return null;
    }
  })();
  const goalRiskText = (() => {
    if (!selectedGoal) return null;

    if (selectedGoal === "avoid_tipping") {
      if (constraintActive) {
        return uiLanguage === "sv"
          ? "Målet riskerar att påverkas eftersom en strukturell begränsning är aktiv."
          : "Goal risk detected because a structural constraint is active.";
      }
    }

    if (selectedGoal === "margin_stability") {
      if (marginTrend === "DECLINING") {
        return uiLanguage === "sv"
          ? "Marginalstabilitet försvagas över simuleringshorisonten."
          : "Margin stability weakens across the simulation horizon.";
      }
    }

    if (selectedGoal === "accessibility") {
      if (constraintActive) {
        return uiLanguage === "sv"
          ? "Tillgänglighetsmålet påverkas av aktiva systembegränsningar."
          : "Accessibility goal affected by active system constraints.";
      }
    }

    if (selectedGoal === "congestion") {
      if (cascadeDetected) {
        return uiLanguage === "sv"
          ? "Trängselmålet påverkas av en aktiv kaskadeffekt i systemet."
          : "Congestion goal affected by an active cascade in the system.";
      }
    }

    return null;
  })();
  const goalConflictText = (() => {
    if (!selectedGoal) return null;

    if (selectedGoal === "accessibility") {
      if (marginTrend === "DECLINING") {
        return uiLanguage === "sv"
          ? "Tillgängligheten förbättras men marginalstabiliteten försvagas senare i simuleringen."
          : "Accessibility improves but margin stability weakens later in the simulation.";
      }
    }

    if (selectedGoal === "congestion") {
      if (constraintActive) {
        return uiLanguage === "sv"
          ? "Trängselmålet förbättras men systembegränsningar uppstår senare i simuleringen."
          : "Congestion improves but structural constraints emerge later in the simulation.";
      }
    }

    if (selectedGoal === "margin_stability") {
      if (cascadeDetected) {
        return uiLanguage === "sv"
          ? "Marginalstabiliteten förbättras men en kaskadeffekt påverkar systemet senare."
          : "Margin stability improves but a cascade effect impacts the system later.";
      }
    }

    if (selectedGoal === "avoid_tipping") {
      if (cascadeDetected) {
        return uiLanguage === "sv"
          ? "Tipping-risk undviks initialt men kaskadeffekter kan påverka senare."
          : "Tipping risk avoided initially but cascade effects may emerge later.";
      }
    }

    return null;
  })();

  const activeCascadeEvents =
    selectedMonthIndex != null
      ? simulationCascadeEvents
          .map((_event, index) => ({
            month: index,
            label: getCascadeEventLabel(index + 1, language),
          }))
          .filter((e) => e.month === selectedMonthIndex)
      : simulationCascadeEvents.map((event, index) => ({
          month: index,
          label: getCascadeEventLabel(event.iteration ?? index + 1, language),
        }));

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1f2937",
        borderRadius: "6px",
        padding: "12px",
        marginTop: 0,
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "#e5e7eb",
          marginBottom: "10px",
        }}
      >
        {t.aiInspector}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          fontSize: "12px",
          color: "#e5e7eb",
        }}
      >
        <div>
          <span style={{ color: "#9CA3AF", marginRight: "6px" }}>{t.caseLabel}</span>
          <span>{caseName || "—"}</span>
        </div>
        {resolvedPolicyDriver && (
          <div>
            <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
              {policyDriverLabel}:
            </span>
            <span>{resolvedPolicyDriver}</span>
          </div>
        )}
        {resolvedSystemDriver && (
          <div>
            <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
              {systemDriverLabel}:
            </span>
            <span>{resolvedSystemDriver}</span>
          </div>
        )}
        {primaryDriverFallbackText && (
          <div>
            <span>{primaryDriverFallbackText}</span>
          </div>
        )}
        {!resolvedPolicyDriver && !resolvedSystemDriver && (
          <div>
            <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
              {t.primaryDriver}:
            </span>
            <span>—</span>
          </div>
        )}
        <div>
          <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
            {t.systemPressure}:
          </span>
          <span>{systemPressure ?? "—"}</span>
        </div>
        <div>
          <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
            {t.estimatedBreach}:
          </span>
          <span>
            {constraintBreakQuarter != null
              ? `Q${constraintBreakQuarter}`
              : t.estimatedBreachNotEstimated}
          </span>
        </div>

        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {language === "sv" ? "HÄNDELSER" : "EVENTS"}
          </div>

          {activeCascadeEvents.length === 0 ? (
            <span style={{ color: "#6B7280" }}>—</span>
          ) : (
            activeCascadeEvents.map((e, i) => (
              <div key={i}>
                M{e.month + 1} — {e.label}
              </div>
            ))
          )}
        </div>

        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {tippingWindowHeading}
          </div>
          <div>{tippingWindowText}</div>
        </div>

        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>{t.margins}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span>
              {scenarioALabel}: {typeof currentMargin === "number" ? currentMargin.toFixed(2) : currentMargin}
            </span>
            <span>
              {`${scenarioBLabel}:`}{" "}
              {typeof alternativeMargin === "number"
                ? alternativeMargin.toFixed(2)
                : alternativeMargin}
            </span>
            <span>
              {t.impact}:{" "}
              {typeof marginImpact === "number" ? marginImpact.toFixed(2) : marginImpact}
            </span>
          </div>
        </div>

        {goalConflictText && (
          <div
            style={{
              fontSize: "13px",
              color: "#f59e0b",
              marginBottom: "6px",
              fontWeight: 500,
            }}
          >
            {goalConflictText}
          </div>
        )}
        {goalProgressText && (
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
              {uiLanguage === "sv" ? "Måluppfyllelse" : "Goal progress"}
            </div>
            <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "10px" }}>
              {goalProgressText}
            </div>
          </div>
        )}
        {goalRiskText && (
          <div
            style={{
              fontSize: "13px",
              color: "#f59e0b",
              marginBottom: "12px",
            }}
          >
            {goalRiskText}
          </div>
        )}
        {goalConflictText && (
          <div
            style={{
              fontSize: "13px",
              color: "#f97316",
              marginBottom: "12px",
            }}
          >
            {goalConflictText}
          </div>
        )}

        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {cascadeStatusHeading}
          </div>
          <div>{cascadeStatusText}</div>
        </div>

        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {structuralStateHeading}
          </div>
          <div>{structuralStatus ?? structuralStateText}</div>
        </div>

        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {language === "sv" ? "BESLUTSEFFEKT" : "DECISION EFFECT"}
          </div>
          <div>{decisionEffectText}</div>
        </div>

        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {language === "sv" ? "SCENARIOSKILLNAD" : "SCENARIO DIFFERENCE"}
          </div>
          <div>{scenarioDifferenceText}</div>
        </div>
      </div>
    </div>
  );
};

export default AIInspectorPanel;
