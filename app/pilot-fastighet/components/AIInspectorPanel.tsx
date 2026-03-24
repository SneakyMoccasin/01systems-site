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
}) => {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const riskLabels = (t as any).riskLabels ?? {};
  const driverLabels = (t as any).driverLabels ?? {};
  const resolvedPrimaryDriver = primaryDriver
    ? (driverLabels[primaryDriver] ?? riskLabels[primaryDriver] ?? primaryDriver)
    : null;
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
        <div>
          <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
            {t.primaryDriver}:
          </span>
          <span>{resolvedPrimaryDriver ?? "—"}</span>
        </div>
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
              Scenario A: {typeof currentMargin === "number" ? currentMargin.toFixed(2) : currentMargin}
            </span>
            <span>
              Scenario B:{" "}
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
