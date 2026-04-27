import React, { useMemo, useState } from "react";
import type { ConstraintRegistry } from "@/src/pilotFastighet/constraintState";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";
import {
  getTransportPolicyExplanationLabel,
  TRANSPORT_ENGINE_RISK_LABELS,
  TRANSPORT_POLICY_ACTION_LABELS,
  TRANSPORT_SYSTEM_DRIVERS,
  type TransportSystemDriverId,
} from "@/src/pilotFastighet/transportDomainMapping";
import { resolveTransportInspectorContext } from "@/src/pilotFastighet/transportInspectorAdapter";
import { buildDomainPropagationEvents } from "./inspector-utils/buildDomainPropagationEvents";
import { buildPropagationChain } from "./inspector-utils/buildPropagationChain";
import { mapRiskLabelToPolicyLabel } from "./inspector-utils/mapRiskLabelToPolicyLabel";
import { buildConstraintActivationTimeline } from "./inspector-utils/buildConstraintActivationTimeline";
import { buildConstraintComparisonMessages } from "./inspector-utils/buildConstraintComparisonMessages";
import { buildConstraintOrderingMessages } from "./inspector-utils/buildConstraintOrderingMessages";
import { buildPropagationRootComparisonMessages } from "./inspector-utils/buildPropagationRootComparisonMessages";
import { buildCascadePathwayComparisonMessages } from "./inspector-utils/buildCascadePathwayComparisonMessages";
import { buildStructuralGoalMessages } from "./inspector-utils/buildStructuralGoalMessages";
import {
  GoalType,
  DEFAULT_GOAL_TYPE,
  TRANSPORT_GOAL_LABELS,
  REAL_ESTATE_GOAL_LABELS,
} from "./inspector-utils/goalTypes";
import { buildGoalDirectionIndicatorMessage } from "./inspector-utils/buildGoalDirectionIndicatorMessage";
import { buildDecisionEffectSummaryMessage } from "./inspector-utils/buildDecisionEffectSummaryMessage";
import { buildGoalConditionedSystemStatusMessage } from "./inspector-utils/buildGoalConditionedSystemStatusMessage";
import { buildDominantConstraintMessage } from "./inspector-utils/buildDominantConstraintMessage";
import { buildExecutiveSummaryMessage } from "./inspector-utils/buildExecutiveSummaryMessage";
import { buildStructuralGoalSummaryMessage } from "./inspector-utils/buildStructuralGoalSummaryMessage";
import {
  profileCount,
  profileValue,
} from "@/src/lib/runtimeProfile";

function toReadableLabel(
  driverId: TransportSystemDriverId | string | null | undefined,
  language: "sv" | "en"
): string {
  if (!driverId) {
    return "";
  }

  const driverDef =
    TRANSPORT_SYSTEM_DRIVERS[
      driverId as keyof typeof TRANSPORT_SYSTEM_DRIVERS
    ];

  if (language === "sv" && driverDef?.readableLabel_sv) {
    return driverDef.readableLabel_sv;
  }

  if (language === "en" && driverDef?.readableLabel_en) {
    return driverDef.readableLabel_en;
  }

  const withSpaces = String(driverId).replace(
    /([a-z])([A-Z])/g,
    "$1 $2"
  );

  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function toReadableTransportChainStep(
  driverId: TransportSystemDriverId | string | null | undefined,
  language: "sv" | "en"
): string {
  if (!driverId) {
    return "";
  }

  return getTransportPolicyExplanationLabel(String(driverId), language);
}

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
      ? "Ingen strukturell försvagning identifierad inom analysperioden"
      : "No structural weakening identified within the analysis horizon";
  }

  if (selectedMonthIndex == null) {
    return uiLanguage === "sv"
      ? "Ingen strukturell försvagning identifierad inom analysperioden"
      : "No structural weakening identified within the analysis horizon";
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
      ? "Strategierna ger liknande utvecklingsförlopp inom analysperioden"
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
  tippingQuarter: number | null;
  currentMargin: number;
  alternativeMargin: number;
  marginImpact: number;
  marginHistoryA?: number[];
  marginHistoryB?: number[];
  cascadeEvents?: CascadeEvent[];
  cascadeEventsA?: CascadeEvent[];
  cascadeEventsB?: CascadeEvent[];
  seriesLengthA: number;
  seriesLengthB: number;
  simulationHorizon?: number;
  selectedMonthIndex?: number | null;
  primaryDriver?: string | null;
  primaryDriverA?: string | null;
  primaryDriverB?: string | null;
  systemPressure?: string | null;
  constraintBreakQuarter?: number | null;
  constraintRegistry?: (Partial<ConstraintRegistry> & {
    activeConstraintType?: string | null;
  }) | null;
  constraintRegistryA?: (Partial<ConstraintRegistry> & {
    activeConstraintType?: string | null;
  }) | null;
  constraintRegistryB?: (Partial<ConstraintRegistry> & {
    activeConstraintType?: string | null;
  }) | null;

  structuralStatus?: string | null;
  /** Absolute margin at selected month (Scenario B preferred for structural state when set). */
  selectedMarginValueA?: number | null;
  selectedMarginValueB?: number | null;
  selectedGoal?: "accessibility" | "congestion" | "margin_stability" | "avoid_tipping";
  scenarioTarget?: string | null;
  selectedActions?: string[];
  inspectionMode?: "executive" | "expert";
  firstDivergenceMonth?: number | null;
  caseType?: "transport" | "real-estate" | null;
  goalType?: GoalType;
  dominantScenarioDifferenceChannel?: string | null;
  scenarioALabel?: string;
  scenarioBLabel?: string;
};

const AIInspectorPanel: React.FC<Props> = ({
  language = "en",
  scenarioALabel,
  scenarioBLabel,
  tippingQuarter,
  currentMargin,
  alternativeMargin,
  marginImpact,
  marginHistoryA = [],
  marginHistoryB = [],
  cascadeEvents = [],
  cascadeEventsA = [],
  cascadeEventsB = [],
  seriesLengthA,
  seriesLengthB,
  simulationHorizon,
  selectedMonthIndex = null,
  primaryDriver = null,
  primaryDriverA = null,
  primaryDriverB = null,
  systemPressure = null,
  constraintRegistryA = null,
  constraintRegistryB = null,
  constraintBreakQuarter = null,
  constraintRegistry = null,
  structuralStatus = null,
  selectedMarginValueA = null,
  selectedMarginValueB = null,
  selectedGoal,
  scenarioTarget = null,
  selectedActions = [],
  inspectionMode = "executive",
  firstDivergenceMonth = null,
  caseType = null,
  goalType,
  dominantScenarioDifferenceChannel = null,
}) => {
  profileCount("AIInspectorPanel.render");

  const [localGoalType, setLocalGoalType] = useState<GoalType>(
    goalType ?? DEFAULT_GOAL_TYPE
  );
  const analysisReady =
    primaryDriver !== null ||
    cascadeEventsA?.length > 0 ||
    cascadeEventsB?.length > 0;
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
  const normalizeTransportDriverKey = (key?: string) => {
    if (!key) return key;

    const compact = key.replace(/\s+/g, "");
    const mapping: Record<string, string> = {
      DemandRisk: "demandRisk",
      CapitalCommitmentRigidityRisk: "capitalCommitmentRigidityRisk",
      MaintenanceIntensityRisk: "maintenanceIntensityRisk",
    };
    const normalized = mapping[compact] ?? compact;
    return normalized === "modal_attractiveness"
      ? "modalAttractiveness"
      : normalized;
  };
  const getResolvedDriverLabel = (key: string | null) =>
    key
      ? caseType === "transport"
        ? /\s/.test(key)
          ? key
          : getTransportPolicyExplanationLabel(
              normalizeTransportDriverKey(key) ?? key,
              uiLanguage
            )
        : driverLabels[key] ??
          riskLabels[key] ??
          mapRiskLabelToPolicyLabel(key, uiLanguage)
      : null;
  const getNarrativeDriverLabel = (key: string | null | undefined): string => {
    if (!key) return "";

    if (caseType === "transport") {
      if (/\s/.test(key)) {
        return key;
      }

      const normalizedKey = normalizeTransportDriverKey(key) ?? key;
      const translated = getTransportPolicyExplanationLabel(
        normalizedKey,
        uiLanguage
      );

      if (translated && translated !== normalizedKey) {
        return translated;
      }
    }

    return mapRiskLabelToPolicyLabel(key, uiLanguage);
  };
  const REAL_ESTATE_PRIMARY_RISK_PRIORITY = [
    "refinancingRisk",
    "interestRateExposureRisk",
    "leverageLevelRisk",
    "liquidityPressureRisk",
    "liquidityPressure",
  ];
  const resolveRealEstatePrimaryRiskLabel = (label: string) => {
    if (caseType !== "real-estate" || !label.includes("|")) {
      return label;
    }

    const riskKeys = label
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);
    const primaryRiskKey =
      REAL_ESTATE_PRIMARY_RISK_PRIORITY.find((key) => riskKeys.includes(key)) ??
      riskKeys[0];

    return mapRiskLabelToPolicyLabel(primaryRiskKey, uiLanguage);
  };
  const toNarrativeCase = (label: string) =>
    label.length > 0
      ? label.charAt(0).toLocaleLowerCase(
          uiLanguage === "sv" ? "sv-SE" : "en-US"
        ) + label.slice(1)
      : label;
  const resolveGoalLabel = (goal: GoalType, currentCaseType?: string | null) => {
    if (currentCaseType === "real-estate") {
      return language === "sv"
        ? REAL_ESTATE_GOAL_LABELS[goal].sv
        : REAL_ESTATE_GOAL_LABELS[goal].en;
    }

    return language === "sv"
      ? TRANSPORT_GOAL_LABELS[goal].sv
      : TRANSPORT_GOAL_LABELS[goal].en;
  };
  const resolveTransportPolicyGoalLabel = (
    goal: NonNullable<Props["selectedGoal"]>
  ): string | null => {
    switch (goal) {
      case "accessibility":
        return uiLanguage === "sv"
          ? "Förbättra tillgängligheten i nätverket"
          : "Improve network accessibility";
      case "congestion":
        return uiLanguage === "sv"
          ? "Minska kapacitetstryck i nätverket"
          : "Reduce network capacity pressure";
      case "margin_stability":
        return uiLanguage === "sv"
          ? "Bevara handlingsutrymmet över tid"
          : "Preserve room to act over time";
      case "avoid_tipping":
        return uiLanguage === "sv"
          ? "Undvika att systemet tappar handlingsutrymme"
          : "Avoid loss of room to act in the system";
      default:
        return null;
    }
  };
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
  profileValue(
    "AIInspectorPanel.cascadeEvents",
    simulationCascadeEvents.length,
    "events"
  );
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
  const isRealEstate = caseType === "real-estate";
  const policyDriverLabel = language === "sv" ? "Policydrivare" : "Policy driver";
  const systemDriverLabel = language === "sv" ? "Systemdrivare" : "System driver";
  const firstCascadeSourceEvent = simulationCascadeEvents[0] as
    | (CascadeEvent & { sourceRiskLabel?: string })
    | undefined;
  const fallbackDriver =
    firstCascadeSourceEvent?.sourceRiskLabel ||
    (firstCascadeSourceEvent?.sourceRisk
      ? mapRiskLabelToPolicyLabel(firstCascadeSourceEvent.sourceRisk, uiLanguage)
      : null);
  const primaryDriverFallbackText =
    primaryDriver == null && policyDriver && systemDriver
      ? isRealEstate
        ? uiLanguage === "sv"
          ? `Tydligaste påverkan just nu: ${systemDriver}`
          : `Most visible influence right now: ${systemDriver}`
        : uiLanguage === "sv"
          ? `Primär strukturell påverkan: ${systemDriver} (via ${policyDriver})`
          : `Primary structural influence: ${systemDriver} (via ${policyDriver})`
      : null;
  const domainPropagation = buildDomainPropagationEvents(
    primaryDriver as TransportSystemDriverId | null,
    language,
    cascadeEventsA,
    cascadeEventsB
  );
  const transportInspectorContext = resolveTransportInspectorContext({
    language: uiLanguage,
    selectedActions,
    policyDriverKey,
    systemDriverKey,
    primaryDriverKey: primaryDriver,
    cascadeEventsA,
    cascadeEventsB,
    primaryPropagationSignatureA: domainPropagation.primaryPropagationSignatureA,
    primaryPropagationSignatureB: domainPropagation.primaryPropagationSignatureB,
  });
  const dominantScenarioChannelText =
    dominantScenarioDifferenceChannel ??
    transportInspectorContext?.dominantScenarioDifferenceChannel ??
    null;
  const scenarioALegendLabel = language === "sv" ? "Nuläge" : "Baseline";
  const scenarioBLegendLabel = language === "sv" ? "Målstrategi" : "Goal strategy";
  const scenarioHeader =
    scenarioALabel && scenarioBLabel
      ? `${scenarioALabel} vs ${scenarioBLabel}`
      : scenarioALabel
        ? scenarioALabel
        : "Analys av vald strategi";
  const shouldShowCaseHeader = caseType !== "real-estate";
  const cascadeStatusText =
    simulationCascadeEvents.length > 0
      ? isRealEstate
        ? language === "sv"
          ? "Påverkanskedja: Identifierad"
          : "Impact chain: Identified"
        : language === "sv"
          ? "Kaskad: Detekterad"
          : "Cascade: Detected"
      : isRealEstate
        ? language === "sv"
          ? "Påverkanskedja: Ingen tydlig"
          : "Impact chain: No clear chain"
        : language === "sv"
          ? "Kaskad: Ingen"
          : "Cascade: None";
  const cascadeStatusHeading =
    isRealEstate
      ? language === "sv"
        ? "PÅVERKANSKEDJA"
        : "IMPACT CHAIN"
      : language === "sv"
        ? "KASKADSTATUS"
        : "CASCADE STATUS";
  const systemPressureExecutiveLabel =
    systemPressure === "SYSTEMIC"
      ? language === "sv"
        ? isRealEstate
          ? `Flera affärsberoenden påverkas samtidigt via ${mapRiskLabelToPolicyLabel(
              primaryDriver as string,
              uiLanguage
            ).toLowerCase()}, vilket minskar portföljens handlingsutrymme`
          : `Flera beroenden påverkas samtidigt via ${
              caseType === "transport"
                ? getNarrativeDriverLabel(primaryDriver as string | null).toLowerCase()
                : toReadableLabel(
                    primaryDriver as TransportSystemDriverId,
                    language
                  ).toLowerCase()
            }, vilket minskar handlingsutrymmet`
        : "The system is under clear structural pressure"
      : systemPressure === "LOW"
        ? language === "sv"
          ? isRealEstate
            ? "Begränsad påverkan på kassaflöde och handlingsutrymme"
            : "Systemet är under lågt strukturellt tryck"
          : isRealEstate
            ? "Limited impact on cash flow and strategic flexibility"
            : "The system is under low structural pressure"
        : systemPressure === "MODERATE"
          ? language === "sv"
            ? isRealEstate
              ? "Märkbar påverkan på kassaflöde och handlingsutrymme"
              : "Systemet påverkas tydligt men är fortfarande hanterbart"
            : isRealEstate
              ? "Noticeable impact on cash flow and strategic flexibility"
              : "The system is experiencing manageable pressure"
          : systemPressure === "HIGH"
            ? language === "sv"
              ? isRealEstate
                ? "Hög påverkan på kassaflöde, beläggning och handlingsutrymme"
                : "Systemet är under högt strukturellt tryck"
              : isRealEstate
                ? "High impact on cash flow, occupancy, and strategic flexibility"
                : "The system is under high structural pressure"
            : systemPressure;
  const breachEstimate =
    constraintBreakQuarter != null ? `Q${constraintBreakQuarter}` : null;
  const breachEstimateExecutiveLabel =
    breachEstimate === null || breachEstimate === undefined
      ? language === "sv"
        ? "Inga kritiska begränsningar förväntas aktiveras inom analysperioden"
        : "No structural breach risk detected within the analysis horizon"
      : breachEstimate;
  const tippingWindowText = getTippingWindowText(
    selectedMonthIndex,
    tippingQuarter ? tippingQuarter - 1 : null,
    language
  );
  const tippingWindowHeading =
    language === "sv"
      ? "Tidig indikation på minskat handlingsutrymme"
      : "Structural weakening risk window";
  const selectedDifference =
    selectedMarginValueA != null && selectedMarginValueB != null
      ? selectedMarginValueB - selectedMarginValueA
      : marginImpact;

  const decisionEffectText = getDecisionEffectText(selectedDifference, language);
  const constraintActive = constraintBreakQuarter != null;
  const cascadeDetected = simulationCascadeEvents.length > 0;
  const marginTrend = marginImpact < 0 ? "DECLINING" : "STABLE";
  const goalProgressText = (() => {
    if (!selectedGoal) return null;

    if (caseType === "real-estate") {
      switch (selectedGoal) {
        case "accessibility":
          return uiLanguage === "sv"
            ? "Kapitalstruktur och beläggning stärks strukturellt i målstrategin."
            : "Capital structure and occupancy strengthen structurally in the goal strategy.";

        case "congestion":
          return uiLanguage === "sv"
            ? "Refinansieringstryck och kapitalbindning minskar i målstrategin."
            : "Refinancing pressure and capital lock-in decrease in the goal strategy.";

        case "margin_stability":
          return uiLanguage === "sv"
            ? "Likviditet, beläggning och refinansieringsförmåga stabiliseras över analysperioden."
            : "Liquidity, occupancy, and refinancing capacity stabilize across the analysis horizon.";

        case "avoid_tipping":
          return uiLanguage === "sv"
            ? "Ingen kritisk refinansierings- eller beläggningsstress identifierad inom analysperioden."
            : "No critical refinancing or occupancy stress is identified within the analysis horizon.";
      }
    }

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
          ? "Strukturell marginal stabiliseras över analysperioden."
          : "Structural margin stabilizes across the analysis horizon.";

      case "avoid_tipping":
        return uiLanguage === "sv"
          ? "Ingen tipping-risk identifierad inom analysperioden."
          : "No tipping risk detected within the analysis horizon.";

      default:
        return null;
    }
  })();
  const goalRiskText = (() => {
    if (!selectedGoal) return null;

    if (caseType === "real-estate") {
      if (selectedGoal === "avoid_tipping" && constraintActive) {
        return uiLanguage === "sv"
          ? "Målet påverkas eftersom portföljens handlingsutrymme redan är pressat."
          : "The goal is at risk because portfolio flexibility is already under pressure.";
      }

      if (selectedGoal === "margin_stability" && marginTrend === "DECLINING") {
        return uiLanguage === "sv"
          ? "Kassaflöde och handlingsutrymme försvagas över analysperioden."
          : "Cash flow and strategic flexibility weaken across the analysis horizon.";
      }

      if (selectedGoal === "accessibility" && constraintActive) {
        return uiLanguage === "sv"
          ? "Beläggning och kassaflöde påverkas av aktiva begränsningar i portföljen."
          : "Occupancy and cash flow are affected by active portfolio constraints.";
      }

      if (selectedGoal === "congestion" && cascadeDetected) {
        return uiLanguage === "sv"
          ? "Refinansiering och kapitalbindning påverkas av att flera beroenden slår igenom samtidigt."
          : "Refinancing and capital lock-in are affected as several dependencies compound at once.";
      }
    }

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
          ? "Marginalstabilitet försvagas över analysperioden."
          : "Margin stability weakens across the analysis horizon.";
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

    if (caseType === "real-estate") {
      if (selectedGoal === "accessibility" && marginTrend === "DECLINING") {
        return uiLanguage === "sv"
          ? "Beläggningen förbättras men kassaflöde och handlingsutrymme försvagas senare i simuleringen."
          : "Occupancy improves, but cash flow and strategic flexibility weaken later in the simulation.";
      }
    }

    if (caseType === "real-estate") {
      if (selectedGoal === "congestion" && constraintActive) {
        return uiLanguage === "sv"
          ? "Refinansieringstrycket minskar först, men kapitalbindning och andra begränsningar ökar senare."
          : "Refinancing pressure eases at first, but capital lock-in and other constraints rise later.";
      }
    }

    if (caseType === "real-estate") {
      if (selectedGoal === "margin_stability" && cascadeDetected) {
        return uiLanguage === "sv"
          ? "Handlingsutrymmet förbättras först, men vidare effekter i portföljen pressar utvecklingen senare."
          : "Flexibility improves initially, but later portfolio effects add pressure further out.";
      }
    }

    if (caseType === "real-estate") {
      if (selectedGoal === "avoid_tipping" && cascadeDetected) {
        return uiLanguage === "sv"
          ? "Portföljen undviker tidig stress men senare effekter kan fortfarande pressa kassaflöde och beläggning."
          : "The portfolio avoids early stress, but later effects may still pressure cash flow and occupancy.";
      }
    }

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

  const domainEvents =
    domainPropagation.events.length > 0
      ? domainPropagation.events
      : (
          cascadeEventsB && cascadeEventsB.length > 0
            ? cascadeEventsB
            : cascadeEventsA && cascadeEventsA.length > 0
            ? cascadeEventsA
            : []
        ).slice(0, 3).map((event, index) => ({
          month: index,
          label: getTransportPolicyExplanationLabel(
            normalizeTransportDriverKey(event.targetRisk) ?? event.targetRisk,
            language
          )
        }));
  const primaryDriverDisplayLabel =
    (transportInspectorContext as any)?.policyDriverLabel ??
    transportInspectorContext?.systemDriverLabel ??
    (caseType === "transport" && primaryDriver
      ? getNarrativeDriverLabel(primaryDriver)
      : primaryDriver
        ? mapRiskLabelToPolicyLabel(primaryDriver, uiLanguage)
        : fallbackDriver);
  const primaryDriverInfluenceText = primaryDriverDisplayLabel
    ? uiLanguage === "sv"
      ? `${primaryDriverDisplayLabel} påverkar utvecklingen tidigt`
      : `${primaryDriverDisplayLabel} influences development early`
    : uiLanguage === "sv"
      ? "Påverkan byggs upp gradvis över flera faktorer"
      : "Impact builds gradually across multiple factors";
  const activeDomainEvents =
    selectedMonthIndex != null
      ? domainEvents.filter((e) => e.month === selectedMonthIndex)
      : domainEvents;
  const uniqueCascadePairs = new Set(
    simulationCascadeEvents.map((event) => `${event.sourceRisk}->${event.targetRisk}`)
  );
  const driverInteractionDepthText =
    uiLanguage === "sv"
      ? `${uniqueCascadePairs.size} unika kopplingar`
      : `${uniqueCascadePairs.size} unique interactions`;
  const constraintLifecycleText =
    uiLanguage === "sv"
      ? constraintActive
        ? `Aktiv (uppskattad påverkan kring M${constraintBreakQuarter})`
        : "Inaktiv"
      : constraintActive
        ? `Active (estimated impact around M${constraintBreakQuarter})`
        : "Inactive";
  const cascadeStructureText =
    simulationCascadeEvents.length > 0
      ? simulationCascadeEvents
          .slice(0, 3)
          .map((event) => `${event.sourceRisk} -> ${event.targetRisk}`)
          .join(" | ")
      : uiLanguage === "sv"
      ? "Ingen aktiv struktur"
      : "No active structure";
  const marginPropagationMechanicsText =
    uiLanguage === "sv"
      ? "Marginalen drivs av kombinerat tryck från belastning, kostnad och återhämtningsförmåga."
      : "Margin is driven by combined pressure from load, cost, and recovery capacity.";
  const structuralPropagationChain = React.useMemo(
    () =>
      buildPropagationChain(
        cascadeEventsB ?? cascadeEvents ?? cascadeEventsA,
        primaryDriver,
        constraintBreakQuarter,
        tippingQuarter,
        language,
        constraintRegistry?.activeConstraintType ?? null
      ),
    [
      cascadeEvents,
      cascadeEventsA,
      cascadeEventsB,
      primaryDriver,
      constraintBreakQuarter,
      tippingQuarter,
      language,
      constraintRegistry?.activeConstraintType,
    ]
  );
  const constraintActivationTimeline = useMemo(
    () => buildConstraintActivationTimeline(constraintRegistry),
    [constraintRegistry]
  );
  const constraintActivationTimelineA = useMemo(
    () => buildConstraintActivationTimeline(constraintRegistryA),
    [constraintRegistryA]
  );
  const constraintActivationTimelineB = useMemo(
    () => buildConstraintActivationTimeline(constraintRegistryB),
    [constraintRegistryB]
  );
  const constraintComparisonMessages = useMemo(
    () =>
      buildConstraintComparisonMessages(
        constraintActivationTimelineA,
        constraintActivationTimelineB
      ),
    [constraintActivationTimelineA, constraintActivationTimelineB]
  );
  const structuralGoalMessages = useMemo(
    () =>
      buildStructuralGoalMessages(
        constraintActivationTimelineA,
        constraintActivationTimelineB
      ),
    [
      constraintActivationTimelineA,
      constraintActivationTimelineB
    ]
  );
  const resolvedGoalType = goalType ?? localGoalType;
  const resolvedAnalysisGoalLabel =
    selectedGoal && caseType === "transport"
      ? resolveTransportPolicyGoalLabel(selectedGoal) ??
        resolveGoalLabel(resolvedGoalType, caseType)
      : resolveGoalLabel(resolvedGoalType, caseType);
  const resolvedScenarioLabel =
    scenarioTarget && caseType === "transport"
      ? resolveTransportPolicyGoalLabel(
          scenarioTarget as NonNullable<Props["selectedGoal"]>
        ) ?? resolveGoalLabel(resolvedGoalType, caseType)
      : null;
  const structuralGoalSummaryMessage = useMemo(
    () =>
      buildStructuralGoalSummaryMessage(
        resolvedGoalType,
        constraintComparisonMessages,
        structuralGoalMessages,
        marginHistoryA,
        marginHistoryB
      ),
    [resolvedGoalType, constraintComparisonMessages, structuralGoalMessages, marginHistoryA, marginHistoryB]
  );
  const goalConditionedSystemStatusMessage = useMemo(
    () =>
      buildGoalConditionedSystemStatusMessage(
        resolvedGoalType,
        structuralGoalSummaryMessage,
        uiLanguage,
        caseType
      ),
    [resolvedGoalType, structuralGoalSummaryMessage, uiLanguage, caseType]
  );
  const goalDirectionIndicatorMessage = useMemo(
    () =>
      buildGoalDirectionIndicatorMessage(
        goalConditionedSystemStatusMessage,
        language,
        caseType
      ),
    [goalConditionedSystemStatusMessage, language, caseType]
  );
  const dominantConstraintMessage = useMemo(
    () =>
      buildDominantConstraintMessage(
        resolvedGoalType,
        constraintComparisonMessages,
        structuralGoalMessages
      ),
    [
      resolvedGoalType,
      constraintComparisonMessages,
      structuralGoalMessages
    ]
  );
  const executiveSummaryConstraintLabel = dominantConstraintMessage
    ? caseType === "transport"
      ? (() => {
          switch (dominantConstraintMessage.constraintKey) {
            case "capital":
              return toNarrativeCase(
                mapRiskLabelToPolicyLabel("budget_pressure", uiLanguage)
              );
            case "capacity":
              return toNarrativeCase(
                mapRiskLabelToPolicyLabel("capacityPressure", uiLanguage)
              );
            case "covenant":
              return toNarrativeCase(
                mapRiskLabelToPolicyLabel("implementationPacing", uiLanguage)
              );
            default:
              return toNarrativeCase(
                getConstraintLabel(
                  dominantConstraintMessage.constraintKey as
                    | "capital"
                    | "capacity"
                    | "covenant"
                    | "custom"
                )
              );
          }
        })()
      : toNarrativeCase(
          getConstraintLabel(
            dominantConstraintMessage.constraintKey as
              | "capital"
              | "capacity"
              | "covenant"
              | "custom"
          )
        )
    : null;
  const constraintOrderingMessages = useMemo(
    () =>
      buildConstraintOrderingMessages(
        constraintActivationTimelineA,
        constraintActivationTimelineB
      ),
    [constraintActivationTimelineA, constraintActivationTimelineB]
  );
  const propagationRootComparisonMessage = useMemo(
    () =>
      buildPropagationRootComparisonMessages(
        primaryDriverA,
        primaryDriverB,
        uiLanguage
      ),
    [primaryDriverA, primaryDriverB, uiLanguage]
  );
  const decisionEffectSummaryMessage = useMemo(
    () =>
      buildDecisionEffectSummaryMessage(
        caseType === "transport"
          ? getNarrativeDriverLabel(primaryDriver)
          : primaryDriver,
        executiveSummaryConstraintLabel,
        goalConditionedSystemStatusMessage,
        propagationRootComparisonMessage,
        uiLanguage,
        caseType,
        scenarioTarget
      ),
    [
      primaryDriver,
      executiveSummaryConstraintLabel,
      goalConditionedSystemStatusMessage,
      propagationRootComparisonMessage,
      uiLanguage,
      caseType,
      scenarioTarget,
    ]
  );
  const cascadePathwayComparisonMessage = useMemo(
    () =>
      buildCascadePathwayComparisonMessages(
        cascadeEventsA,
        cascadeEventsB
      ),
    [cascadeEventsA, cascadeEventsB]
  );
  const executiveSummaryPrimaryDriver =
    caseType === "transport"
      ? primaryDriver
        ? mapRiskLabelToPolicyLabel(primaryDriver, uiLanguage)
        : ""
      : primaryDriver;
  const executiveSummaryPropagationRootDifference =
    caseType === "transport" && propagationRootComparisonMessage
      ? {
          ...propagationRootComparisonMessage,
          driverA: toNarrativeCase(
            mapRiskLabelToPolicyLabel(
              propagationRootComparisonMessage.driverA,
              uiLanguage
            )
          ),
          driverB: toNarrativeCase(
            mapRiskLabelToPolicyLabel(
              propagationRootComparisonMessage.driverB,
              uiLanguage
            )
          ),
        }
      : propagationRootComparisonMessage;
  const executiveSummaryMessage = useMemo(
    () =>
      buildExecutiveSummaryMessage(
        executiveSummaryPrimaryDriver,
        executiveSummaryConstraintLabel,
        executiveSummaryPropagationRootDifference,
        goalConditionedSystemStatusMessage,
        uiLanguage,
        caseType,
        inspectionMode,
        scenarioTarget
      ),
    [
      executiveSummaryPrimaryDriver,
      executiveSummaryConstraintLabel,
      executiveSummaryPropagationRootDifference,
      goalConditionedSystemStatusMessage,
      uiLanguage,
      caseType,
      inspectionMode,
      scenarioTarget,
    ]
  );
  const executiveInspectorSummaryLines = [
    executiveSummaryMessage,
    decisionEffectSummaryMessage ?? decisionEffectText,
    breachEstimateExecutiveLabel,
    primaryDriverA &&
    primaryDriverB &&
    primaryDriverA !== primaryDriverB
      ? language === "sv"
        ? `Skillnaden mellan strategierna drivs främst av ${getNarrativeDriverLabel(
            primaryDriverB
          )}.`
        : `The difference between strategies is mainly driven by ${getNarrativeDriverLabel(
            primaryDriverB
          )}.`
      : null,
    firstDivergenceMonth != null
      ? language === "sv"
        ? `Skillnaden mellan strategierna börjar märkas runt M${firstDivergenceMonth}.`
        : `The difference between strategies begins around M${firstDivergenceMonth}.`
      : null,
  ].filter(Boolean);
  const hasStructuralDivergence =
    firstDivergenceMonth != null ||
    (primaryDriverA != null &&
      primaryDriverB != null &&
      primaryDriverA !== primaryDriverB) ||
    propagationRootComparisonMessage != null ||
    cascadePathwayComparisonMessage != null ||
    Boolean(dominantScenarioChannelText);
  const scenarioDifferenceText =
    !hasStructuralDivergence
      ? language === "sv"
        ? "Strategierna ger liknande utvecklingsförlopp inom analysperioden"
        : "Scenarios remain structurally similar"
      : firstDivergenceMonth != null && firstDivergenceMonth <= 6
      ? language === "sv"
        ? "Scenarierna divergerar tydligt"
        : "Scenarios diverge clearly"
      : firstDivergenceMonth != null
      ? language === "sv"
        ? "Scenarierna börjar divergera"
        : "Scenarios begin to diverge"
      : language === "sv"
      ? "Scenarierna divergerar strukturellt genom olika drivkedjor"
      : "Scenarios diverge structurally through different driver pathways";
  const localizePropagationNodeLabel = (label: string) => {
    const domainLabel = resolveRealEstatePrimaryRiskLabel(label);
    if (domainLabel !== label) return domainLabel;
    if (uiLanguage !== "sv") return label;
    if (
      caseType === "real-estate" &&
      (label === "Structural margin affected" ||
        label === "Strukturell marginal påverkas" ||
        label === "Strukturell marginal påverkad")
    ) {
      return "portföljens handlingsutrymme förändras";
    }
    if (label === "Constraint activated") return "Begränsning aktiverad";
    if (label === "Structural margin affected")
      return "Strukturell marginal påverkad";
    if (label === "Tipping risk window begins")
      return "Tippingriskfönster inleds";
    return label;
  };
  const getConstraintLabel = (
    constraintType: "capital" | "capacity" | "covenant" | "custom"
  ) =>
    constraintType === "capital"
      ? language === "sv"
        ? "Kapitalbegränsning"
        : "Capital constraint"
      : constraintType === "capacity"
      ? language === "sv"
        ? "Kapacitetsbegränsning"
        : "Capacity constraint"
      : constraintType === "covenant"
      ? language === "sv"
        ? "Kovenantbegränsning"
        : "Covenant constraint"
      : language === "sv"
      ? "Anpassad begränsning"
      : "Custom constraint";
  const getTransportReadableCascadeLine = (
    event: CascadeEvent,
    index: number
  ): string => {
    const readable = (event as any).readableLabel as string | undefined;
    if (readable && readable.trim().length > 0) {
      return index === 0 ? readable.trim() : `→ ${readable.trim()}`;
    }

    const normalizedSource =
      normalizeTransportDriverKey(event.sourceRisk) ?? event.sourceRisk ?? "";
    const normalizedTarget =
      normalizeTransportDriverKey(event.targetRisk) ?? event.targetRisk ?? "";

    if (language === "sv") {
      const sourceReadable =
        TRANSPORT_ENGINE_RISK_LABELS[normalizedSource]?.readableLabel_sv ??
        event.sourceRisk;
      const targetReadable =
        TRANSPORT_ENGINE_RISK_LABELS[normalizedTarget]?.readableLabel_sv ??
        event.targetRisk;

      return index === 0
        ? `${sourceReadable} påverkar ${targetReadable}`
        : `→ som påverkar ${targetReadable}`;
    }

    const sourceReadable =
      TRANSPORT_ENGINE_RISK_LABELS[normalizedSource]?.readableLabel_en ??
      event.sourceRisk;
    const targetReadable =
      TRANSPORT_ENGINE_RISK_LABELS[normalizedTarget]?.readableLabel_en ??
      event.targetRisk;

    return index === 0
      ? `${sourceReadable} affects ${targetReadable}`
      : `→ which affects ${targetReadable}`;
  };

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
      {scenarioTarget && caseType === "transport" && resolvedScenarioLabel && (
        <div
          style={{
            fontSize: "11px",
            opacity: 0.65,
            marginTop: "2px"
          }}
        >
          <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
            {language === "sv" ? "Scenario" : "Scenario"}
          </span>
          <span>{resolvedScenarioLabel}</span>
        </div>
      )}
      {inspectionMode === "executive" &&
        seriesLengthA > 0 &&
        seriesLengthB > 0 && (
        <div
          style={{
            fontSize: "11px",
            opacity: 0.65,
            marginTop: "2px"
          }}
        >
          {language === "sv"
            ? `Analysmål: ${resolvedAnalysisGoalLabel}`
            : `Analysis goal: ${resolvedAnalysisGoalLabel}`}
        </div>
      )}
      {caseType === "real-estate" && scenarioALabel && scenarioBLabel && (
        <div
          style={{
            fontSize: "11px",
            opacity: 0.9,
            marginTop: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px"
          }}
        >
          <div style={{ color: "#9CA3AF", fontWeight: 600 }}>
            {language === "sv" ? "Strategier" : "Strategies"}
          </div>
          <div>
            <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
              {language === "sv" ? "Baslinje: " : "Baseline: "}
            </span>
            <span>{scenarioALabel}</span>
          </div>
          <div>
            <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
              {language === "sv" ? "Målstrategi: " : "Target strategy: "}
            </span>
            <span>{scenarioBLabel}</span>
          </div>
        </div>
      )}
      {caseType === "transport" && goalDirectionIndicatorMessage && (
        <div
          style={{
            fontSize: "11px",
            opacity: 0.8,
            marginTop: "2px",
            color: "#cbd5e1",
          }}
        >
          {goalDirectionIndicatorMessage}
        </div>
      )}
      {caseType === "transport" && decisionEffectSummaryMessage && (
        <div
          style={{
            fontSize: "11px",
            opacity: 0.78,
            marginTop: "2px",
            color: "#cbd5e1",
          }}
        >
          {decisionEffectSummaryMessage}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          fontSize: "12px",
          color: "#e5e7eb",
        }}
      >
        {shouldShowCaseHeader && (
          <div>
            <span style={{ color: "#9CA3AF", marginRight: "6px" }}>{t.caseLabel}</span>
            <span>{scenarioHeader}</span>
          </div>
        )}
        {analysisReady &&
          caseType === "transport" &&
          executiveInspectorSummaryLines.length > 0 && (
            <div style={{ marginTop: "2px" }}>
              <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
                {language === "sv" ? "Sammanfattning" : "Summary"}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  lineHeight: 1.45,
                }}
              >
                {executiveInspectorSummaryLines.map((line, index) => (
                  <div key={`executive-summary-line-${index}`}>{line}</div>
                ))}
              </div>
            </div>
          )}
        {analysisReady && inspectionMode === "expert" && (
          <>
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
                  {isRealEstate
                    ? uiLanguage === "sv"
                      ? "Viktigaste påverkansfaktor"
                      : "Main influencing factor"
                    : t.primaryDriver}
                  :
                </span>
                <span>—</span>
              </div>
            )}
            {transportInspectorContext && (
              <div style={{ marginTop: "2px" }}>
                <div>
                  <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
                    {uiLanguage === "sv" ? "Policyspak:" : "Policy lever:"}
                  </span>
                  <span>{transportInspectorContext.policyLeverLabel}</span>
                </div>
                <div>
                  <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
                    {uiLanguage === "sv" ? "Systemdrivare:" : "System driver:"}
                  </span>
                  <span>{transportInspectorContext.systemDriverLabel}</span>
                </div>
                <div style={{ color: "#9CA3AF" }}>
                  {transportInspectorContext.propagationChainLabel}
                </div>
              </div>
            )}
          </>
        )}
        {analysisReady && caseType === "transport" && primaryDriver && (
          <div className="mb-2">
            <strong>
              {language === "sv" ? "Policy-drivare:" : "Policy driver:"}
            </strong>{" "}
            {selectedActions && selectedActions.length > 0 ? (
              <div>
                {selectedActions.map((action) => (
                  <div key={action}>
                    •{" "}
                    {TRANSPORT_POLICY_ACTION_LABELS[action]?.[language] ?? action}
                  </div>
                ))}
              </div>
            ) : (
              getTransportPolicyExplanationLabel(
                normalizeTransportDriverKey(primaryDriver) ?? primaryDriver,
                language
              )
            )}
          </div>
        )}
        {analysisReady && caseType === "transport" && primaryDriver && (
          <div className="mb-2">
            <strong>
              {language === "sv" ? "Systemdrivare:" : "System driver:"}
            </strong>{" "}
            {getTransportPolicyExplanationLabel(
              normalizeTransportDriverKey(primaryDriver) ?? primaryDriver,
              language
            )}
          </div>
        )}
        {analysisReady && (
          <div>
            {isRealEstate
              ? language === "sv"
                ? `Viktigaste påverkansfaktor: ${primaryDriverInfluenceText}`
                : `Main influencing factor: ${primaryDriverInfluenceText}`
              : language === "sv"
                ? `Primär drivare: ${
                    primaryDriverDisplayLabel
                      ? `${primaryDriverDisplayLabel} ↓`
                      : t.noActiveDriver
                  }`
                : `Primary driver: ${
                    primaryDriverDisplayLabel
                      ? `${primaryDriverDisplayLabel} ↓`
                      : t.noActiveDriver
                  }`}
          </div>
        )}
        {analysisReady && caseType === "transport" && executiveSummaryMessage && (
          <div
            style={{
              marginTop: "6px",
              marginBottom: "2px",
              padding: "8px 10px",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "6px",
              background: "rgba(15, 23, 42, 0.35)",
              color: "#dbe4ee",
              lineHeight: 1.45,
            }}
          >
            {executiveSummaryMessage}
          </div>
        )}
        {!analysisReady ? (
          <div style={{ opacity: 0.7 }}>
            Ingen simulering körd ännu
          </div>
        ) : (
        <>
        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {language === "sv"
              ? isRealEstate
                ? "Hur påverkan sprids i portföljen"
                : "Hur förändringen sprids i systemet"
              : isRealEstate
                ? "How impact spreads across the portfolio"
                : "Structural propagation chain"}
          </div>
          {inspectionMode === "expert" &&
            Array.isArray((transportInspectorContext as any)?.upstreamDependencies) &&
            (transportInspectorContext as any).upstreamDependencies.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
                  {language === "sv"
                    ? "Strukturell orsaksrelation"
                    : "Structural causal relation"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {(transportInspectorContext as any).upstreamDependencies
                    .concat([primaryDriver ?? ""])
                    .filter(Boolean)
                    .map((step: string, index: number) => (
                      <div key={`upstream-${step}-${index}`}>
                        {index === 0 ? "" : "→ "}
                        {getTransportPolicyExplanationLabel(
                          normalizeTransportDriverKey(step) ?? step,
                          language
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {transportInspectorContext?.propagationChainLabel ? (
              transportInspectorContext.propagationChainLabel
                .split(" → ")
                .map((step, index) => (
                  <div key={`${step}-${index}`}>
                    {index === 0 ? "" : "→ "}
                    {step}
                  </div>
                ))
            ) : !transportInspectorContext ? (
              structuralPropagationChain.length === 0 ? (
                <span style={{ color: "#6B7280" }}>—</span>
              ) : (
                structuralPropagationChain.map((node, index) => (
                  <div key={`${node.type}-${index}`}>
                    {index === 0 ? "" : "→ "}
                    {localizePropagationNodeLabel(node.label)}
                    {node.timing != null ? ` ~ M${node.timing}` : ""}
                  </div>
                ))
              )
            ) : (
              <span style={{ color: "#6B7280" }}>—</span>
            )}
          </div>
          {constraintActivationTimeline.length > 0 && (
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {constraintActivationTimeline.map((entry) => {
                const constraintLabel = getConstraintLabel(
                  entry.constraintType
                );

                return (
                  <div key={`${entry.constraintType}-${entry.activationStep}`}>
                    {entry.status === "approaching"
                      ? language === "sv"
                        ? `${constraintLabel} närmar sig M${entry.activationStep}`
                        : `${constraintLabel} approaching M${entry.activationStep}`
                      : language === "sv"
                      ? `${constraintLabel} aktiveras M${entry.activationStep}`
                      : `${constraintLabel} activates M${entry.activationStep}`}
                  </div>
                );
              })}
            </div>
          )}
          {constraintComparisonMessages.length > 0 && (
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {constraintComparisonMessages.map((entry) => {
                const constraintLabel = getConstraintLabel(entry.constraintType);

                return (
                  <div
                    key={`${entry.constraintType}-${entry.messageKey}-${entry.scenarioDirection}`}
                  >
                    {entry.messageKey === "avoided"
                      ? language === "sv"
                        ? caseType === "real-estate"
                          ? "ett strukturellt finansieringshinder undviks"
                          : `${constraintLabel} undviks i ${
                              entry.scenarioDirection === "baseline"
                                ? "nulägesstrategin"
                                : "målstrategin"
                            }`
                        : `${constraintLabel} avoided in ${
                            entry.scenarioDirection === "baseline"
                              ? "baseline strategy"
                              : "target strategy"
                          }`
                      : language === "sv"
                      ? caseType === "real-estate"
                        ? "inga kritiska hinder aktiveras tidigt"
                        : `${constraintLabel} aktiveras ${
                            entry.differenceMonths
                          } månader tidigare i ${
                            entry.scenarioDirection === "baseline"
                              ? "nulägesstrategin"
                              : "målstrategin"
                          }`
                      : `${constraintLabel} activates ${
                          entry.differenceMonths
                        } months earlier in ${
                          entry.scenarioDirection === "baseline"
                            ? "baseline strategy"
                            : "target strategy"
                        }`}
                  </div>
                );
              })}
            </div>
          )}
          {structuralGoalMessages.map((entry) => {
            const constraintLabel =
              getConstraintLabel(entry.constraintType);

            return (
              <div key={`${entry.constraintType}-goal`}>
                {language === "sv"
                  ? caseType === "real-estate"
                    ? "inga kritiska hinder aktiveras tidigt"
                    : `${constraintLabel} fördröjs ${entry.delayMonths} månader i ${
                        entry.winningScenario === "target"
                          ? "målstrategin"
                          : "nulägesstrategin"
                      }`
                  : `${constraintLabel} delayed ${entry.delayMonths} months in ${
                      entry.winningScenario === "target"
                        ? "target strategy"
                        : "baseline strategy"
                    }`}
              </div>
            );
          })}
          {caseType !== "real-estate" &&
            inspectionMode === "executive" &&
            seriesLengthA > 0 &&
            seriesLengthB > 0 && (
            <div style={{ marginTop: "8px", marginBottom: "8px" }}>
              <label style={{ fontSize: "12px", opacity: 0.7 }}>
                {language === "sv" ? "Analysmål" : "Analysis goal"}
              </label>

              <select
                value={resolvedGoalType}
                onChange={(e) =>
                  setLocalGoalType(e.target.value as GoalType)
                }
                style={{
                  marginLeft: "8px",
                  fontSize: "12px"
                }}
              >
                <option value="robustness">
                  {resolveGoalLabel("robustness", caseType)}
                </option>

                <option value="delay">
                  {resolveGoalLabel("delay", caseType)}
                </option>

                <option value="avoidance">
                  {resolveGoalLabel("avoidance", caseType)}
                </option>

                <option value="margin-preservation">
                  {resolveGoalLabel("margin-preservation", caseType)}
                </option>
              </select>
            </div>
          )}
          {structuralGoalSummaryMessage && (
            <div style={{ marginTop: "8px" }}>
              {resolvedGoalType === "margin-preservation"
                ? language === "sv"
                  ? `${
                      structuralGoalSummaryMessage.winningScenario === "target"
                        ? "Målstrategin"
                        : "Nulägesstrategin"
                    } bevarar marginalnivån längre innan första kritiska fall`
                  : `${
                      structuralGoalSummaryMessage.winningScenario === "target"
                        ? "Target strategy"
                        : "Baseline strategy"
                    } preserves structural margin longer before first critical decline`
                : language === "sv"
                ? (() => {
                    if (caseType === "real-estate") {
                      return structuralGoalSummaryMessage.winningScenario === "target"
                        ? "Målstrategin undviker ett kritiskt finansieringshinder"
                        : "Nulägesstrategin undviker ett kritiskt finansieringshinder";
                    }

                    const scenarioLabel =
                      structuralGoalSummaryMessage.winningScenario === "target"
                        ? "Målstrategin"
                        : "Nulägesstrategin";
                    const avoidedText =
                      structuralGoalSummaryMessage.avoidedConstraintCount > 0
                        ? `undvika ${structuralGoalSummaryMessage.avoidedConstraintCount} begränsning${
                            structuralGoalSummaryMessage.avoidedConstraintCount === 1 ? "" : "ar"
                          }`
                        : null;
                    const delayedText =
                      structuralGoalSummaryMessage.improvedConstraintCount > 0
                        ? `fördröja ${structuralGoalSummaryMessage.improvedConstraintCount}`
                        : null;
                    const detailText = [avoidedText, delayedText].filter(Boolean).join(" och ");
                    return `${scenarioLabel} förbättrar strukturell robusthet genom att ${detailText}`;
                  })()
                : (() => {
                    const scenarioLabel =
                      structuralGoalSummaryMessage.winningScenario === "target"
                        ? "Target strategy"
                        : "Baseline strategy";
                    const avoidedText =
                      structuralGoalSummaryMessage.avoidedConstraintCount > 0
                        ? `avoiding ${structuralGoalSummaryMessage.avoidedConstraintCount} constraint${
                            structuralGoalSummaryMessage.avoidedConstraintCount === 1 ? "" : "s"
                          }`
                        : null;
                    const delayedText =
                      structuralGoalSummaryMessage.improvedConstraintCount > 0
                        ? `delaying ${structuralGoalSummaryMessage.improvedConstraintCount}`
                        : null;
                    const detailText = [avoidedText, delayedText].filter(Boolean).join(" and ");
                    return `${scenarioLabel} improves structural robustness by ${detailText}`;
                  })()}
            </div>
          )}
          {inspectionMode === "executive" &&
            seriesLengthA > 0 &&
            seriesLengthB > 0 &&
            goalConditionedSystemStatusMessage && (
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "12px",
                  opacity: 0.8
                }}
              >
                {language === "sv"
                  ? (() => {
                      if (
                        goalConditionedSystemStatusMessage.narrativeFocus ===
                        "real-estate"
                      ) {
                        if (
                          goalConditionedSystemStatusMessage.messageKey ===
                          "activationTiming"
                        ) {
                          return `Utfallet påverkas främst av refinansieringstidpunkt och hur kapitalstrukturen absorberar tryck`;
                        }

                        if (
                          goalConditionedSystemStatusMessage.messageKey ===
                          "constraintAvoidance"
                        ) {
                          return `Utfallet påverkas främst av vilka refinansierings-, beläggnings- och kapitalkrav som kan undvikas`;
                        }

                        if (
                          goalConditionedSystemStatusMessage.messageKey ===
                          "marginPreservation"
                        ) {
                          return `Utfallet påverkas främst av hur beläggning, likviditet och refinansieringsförmåga bevarar handlingsutrymmet över tid`;
                        }

                        return `Utfallet formas främst av kapitalstruktur, beläggning och refinansieringsförmåga över tid`;
                      }

                      if (
                        goalConditionedSystemStatusMessage.messageKey ===
                        "activationTiming"
                      ) {
                        return `Utfallet påverkas främst av senare aktivering av systembegränsningar`;
                      }

                      if (
                        goalConditionedSystemStatusMessage.messageKey ===
                        "constraintAvoidance"
                      ) {
                        return `Utfallet påverkas främst av vilka begränsningar som helt undviks`;
                      }

                      if (
                        goalConditionedSystemStatusMessage.messageKey ===
                        "marginPreservation"
                      ) {
                        return `Utfallet påverkas främst av hur marginalnivån bevaras över tid`;
                      }

                      return `Utfallet påverkas främst av hur systemets handlingsutrymme bevaras längre`;
                    })()
                  : (() => {
                      if (
                        goalConditionedSystemStatusMessage.narrativeFocus ===
                        "real-estate"
                      ) {
                        if (
                          goalConditionedSystemStatusMessage.messageKey ===
                          "activationTiming"
                        ) {
                          return `Outcome driven primarily by refinancing timing and how the capital structure absorbs pressure`;
                        }

                        if (
                          goalConditionedSystemStatusMessage.messageKey ===
                          "constraintAvoidance"
                        ) {
                          return `Outcome driven primarily by which refinancing, occupancy, and capital constraints can be avoided`;
                        }

                        if (
                          goalConditionedSystemStatusMessage.messageKey ===
                          "marginPreservation"
                        ) {
                          return `Outcome driven primarily by how occupancy, liquidity, and refinancing capacity preserve room to act over time`;
                        }

                        return `Outcome driven primarily by capital structure, occupancy, and refinancing capacity over time`;
                      }

                      if (
                        goalConditionedSystemStatusMessage.messageKey ===
                        "activationTiming"
                      ) {
                        return `Outcome driven primarily by later constraint activation timing`;
                      }

                      if (
                        goalConditionedSystemStatusMessage.messageKey ===
                        "constraintAvoidance"
                      ) {
                        return `Outcome driven primarily by constraints avoided entirely`;
                      }

                      if (
                        goalConditionedSystemStatusMessage.messageKey ===
                        "marginPreservation"
                      ) {
                        return `Outcome driven primarily by preservation of structural margin over time`;
                      }

                      return `Outcome driven primarily by preservation of structural flexibility longer`;
                    })()}
              </div>
            )}
          {inspectionMode === "executive" &&
            seriesLengthA > 0 &&
            seriesLengthB > 0 &&
            structuralGoalSummaryMessage && (
            <div
              style={{
                marginTop: "6px",
                fontSize: "12px",
                opacity: 0.8
              }}
            >
              {language === "sv"
                ? (() => {
                    const delayedCount =
                      structuralGoalSummaryMessage.improvedConstraintCount ?? 0;

                    const avoidedCount =
                      structuralGoalSummaryMessage.avoidedConstraintCount ?? 0;

                    if (resolvedGoalType === "delay") {
                      return caseType === "real-estate"
                        ? "inga kritiska hinder aktiveras tidigt"
                        : `Utfallet påverkas främst av hur flera begränsningar aktiveras senare i tidslinjen`;
                    }

                    if (resolvedGoalType === "avoidance") {
                      return caseType === "real-estate"
                        ? "ett strukturellt finansieringshinder undviks"
                        : `Utfallet påverkas främst av vilka begränsningar som helt undviks`;
                    }

                    if (resolvedGoalType === "margin-preservation") {
                      return caseType === "real-estate"
                        ? "portföljens handlingsutrymme förändras"
                        : `Utfallet påverkas främst av hur marginalnivån bevaras över tid`;
                    }

                    return caseType === "real-estate"
                      ? delayedCount > 0
                        ? "inga kritiska hinder aktiveras tidigt"
                        : avoidedCount > 0
                          ? "ett finansieringshinder undviks"
                          : "portföljens handlingsutrymme förändras"
                      : `Utfallet påverkas främst av hur ${delayedCount} begränsningar fördröjs och ${avoidedCount} begränsningar undviks`;
                  })()
                : (() => {
                    const delayedCount =
                      structuralGoalSummaryMessage.improvedConstraintCount ?? 0;

                    const avoidedCount =
                      structuralGoalSummaryMessage.avoidedConstraintCount ?? 0;

                    if (resolvedGoalType === "delay") {
                      return `Outcome driven primarily by later constraint activation timing`;
                    }

                    if (resolvedGoalType === "avoidance") {
                      return `Outcome driven primarily by constraints avoided entirely`;
                    }

                    if (resolvedGoalType === "margin-preservation") {
                      return `Outcome driven primarily by preservation of structural margin over time`;
                    }

                    return `Outcome driven primarily by ${delayedCount} delayed constraints and ${avoidedCount} avoided constraints`;
                  })()}
            </div>
          )}
          {inspectionMode === "executive" &&
            seriesLengthA > 0 &&
            seriesLengthB > 0 &&
            dominantConstraintMessage && (
            <div
              style={{
                marginTop: "4px",
                fontSize: "12px",
                opacity: 0.85
              }}
            >
              {language === "sv"
                ? `Den största strukturella skillnaden drivs främst av ${
                    getNarrativeDriverLabel(
                      dominantConstraintMessage.constraintKey
                    ).toLowerCase()
                  }`
                : `Primary structural difference driven by ${
                    getNarrativeDriverLabel(
                      dominantConstraintMessage.constraintKey
                    ).toLowerCase()
                  }`}
            </div>
          )}
          {constraintOrderingMessages.length > 0 && (
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
              {constraintOrderingMessages.map((entry) => {
                const earlierConstraintLabel = getConstraintLabel(
                  entry.earlierConstraint
                );
                const laterConstraintLabel = getConstraintLabel(
                  entry.laterConstraint
                );

                return (
                  <div
                    key={`${entry.earlierConstraint}-${entry.laterConstraint}-${entry.scenarioDirection}`}
                  >
                    {language === "sv"
                      ? `${earlierConstraintLabel} inträffar före ${laterConstraintLabel.toLowerCase()} i ${
                          entry.scenarioDirection === "target"
                            ? "målstrategin"
                            : "nulägesstrategin"
                        } men efter i ${
                          entry.scenarioDirection === "target"
                            ? "nulägesstrategin"
                            : "målstrategin"
                        }`
                      : `${earlierConstraintLabel} occurs before ${laterConstraintLabel.toLowerCase()} in ${
                          entry.scenarioDirection === "target"
                            ? "target strategy"
                            : "baseline strategy"
                        } but after in ${
                          entry.scenarioDirection === "target"
                            ? "baseline strategy"
                            : "target strategy"
                        }`}
                  </div>
                );
              })}
            </div>
          )}
          {propagationRootComparisonMessage && (
            <div style={{ marginTop: "8px" }}>
              {(() => {
                const driverALabel = getNarrativeDriverLabel(
                  propagationRootComparisonMessage.driverA
                ).toLowerCase();
                const driverBLabel = getNarrativeDriverLabel(
                  propagationRootComparisonMessage.driverB
                ).toLowerCase();

                return language === "sv"
                  ? isRealEstate
                    ? `Det tydligaste affärstrycket flyttar från ${driverALabel} till ${driverBLabel} i ${
                        propagationRootComparisonMessage.scenarioDirection === "target"
                          ? "målstrategin"
                          : "nulägesstrategin"
                      }`
                    : `Systemets primära tryck flyttar från ${driverALabel} till ${driverBLabel} i ${
                        propagationRootComparisonMessage.scenarioDirection === "target"
                          ? "målstrategin"
                          : "nulägesstrategin"
                      }`
                  : isRealEstate
                    ? `The most visible business pressure shifts from ${driverALabel} to ${driverBLabel} in the ${
                        propagationRootComparisonMessage.scenarioDirection === "target"
                          ? "goal strategy"
                          : "baseline strategy"
                      }`
                    : `Primary system pressure shifts from ${driverALabel} to ${driverBLabel} in the ${
                        propagationRootComparisonMessage.scenarioDirection === "target"
                          ? "target strategy"
                          : "baseline strategy"
                      }`;
              })()}
            </div>
          )}
          {cascadePathwayComparisonMessage && (
            <div style={{ marginTop: "8px" }}>
              {(() => {
                const driverALabel = getNarrativeDriverLabel(
                  cascadePathwayComparisonMessage.driverA
                ).toLowerCase();

                const driverBLabel = getNarrativeDriverLabel(
                  cascadePathwayComparisonMessage.driverB
                ).toLowerCase();

                return language === "sv"
                  ? `Skillnaden mellan strategierna drivs främst av ${driverBLabel} i målstrategin men av ${driverALabel} i nulägesstrategin`
                  : `Margin erosion is driven by ${driverBLabel} in the target strategy but by ${driverALabel} in the baseline strategy`;
              })()}
            </div>
          )}
        </div>
        <div>
          <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
            {language === "sv"
              ? caseType === "real-estate"
                ? "Påverkan i portföljen"
                : "Påverkan i systemet"
              : t.systemPressure}
            :
          </span>
          <span>{systemPressureExecutiveLabel}</span>
        </div>
        <div>
          <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
            {language === "sv"
              ? caseType === "real-estate"
                ? "Risk att portföljen tappar handlingsutrymme"
                : "Risk att systemet tappar handlingsutrymme"
              : "Estimated structural breach"}
            :
          </span>
          <span>{breachEstimateExecutiveLabel}</span>
        </div>
        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {language === "sv"
              ? caseType === "real-estate"
                ? "Hur förändringen sprids i portföljen"
                : "Hur förändringen sprids i systemet"
              : "How the change spreads through the system"}
          </div>
          <div>
            {(() => {
              if (caseType === "transport") {
                const transportEventLabels = domainEvents
                  .slice(0, 3)
                  .map((event) => event.label);
                if (transportEventLabels.length === 0) {
                  return <span style={{ color: "#6B7280" }}>—</span>;
                }
                const primaryChannelLine = transportEventLabels.join(" → ");

                return (
                  <div style={{ marginTop: "8px", opacity: 0.9 }}>
                    <strong>
                      {language === "sv"
                        ? "Förändringen sprids vidare genom"
                        : "Primary propagation channel"}
                    </strong>
                    <div>{primaryChannelLine}</div>
                  </div>
                );
              }

              const propagationChainLabel =
                cascadeStructureText;
              if (!propagationChainLabel) {
                return <span style={{ color: "#6B7280" }}>—</span>;
              }
              const chainWithoutPrefix = propagationChainLabel
                .replace(/^.*?:\s*/, "")
                .replace(/->/g, "→");
              const chainSteps = chainWithoutPrefix
                .split("→")
                .map((step) => step.trim())
                .filter(Boolean);
              if (chainSteps.length === 0) {
                return <span style={{ color: "#6B7280" }}>—</span>;
              }
              return (
                <>
                  {chainSteps.map((step, index) => {
                    const normalizedStep = step.trim();
                    const readableStep = resolveRealEstatePrimaryRiskLabel(
                      mapRiskLabelToPolicyLabel(normalizedStep, uiLanguage)
                    );
                    return (
                      <div key={index}>
                        {index === 0
                          ? primaryDriver
                            ? resolveRealEstatePrimaryRiskLabel(
                                mapRiskLabelToPolicyLabel(primaryDriver, uiLanguage)
                              )
                            : primaryDriverInfluenceText
                          : `→ ${readableStep}`}
                      </div>
                    );
                  })}
                  {(() => {
                    const primaryChannelLine =
                      chainSteps.length > 0
                        ? chainSteps
                            .map((step) =>
                              resolveRealEstatePrimaryRiskLabel(
                                mapRiskLabelToPolicyLabel(step.trim(), uiLanguage)
                              )
                            )
                            .join(" → ")
                        : "";
                    const firstPropagationStep =
                      chainSteps.length > 0
                        ? resolveRealEstatePrimaryRiskLabel(
                            mapRiskLabelToPolicyLabel(
                              chainSteps[0].trim(),
                              uiLanguage
                            )
                          )
                        : "";
                    const shouldShowPrimaryChannel =
                      primaryChannelLine.trim() !== firstPropagationStep.trim();
                    if (!shouldShowPrimaryChannel) return null;
                    return (
                      <div style={{ marginTop: "8px", opacity: 0.9 }}>
                        <strong>
                          {uiLanguage === "sv"
                            ? isRealEstate
                              ? "Påverkan fortsätter via"
                              : "Förändringen sprids vidare genom"
                            : isRealEstate
                              ? "The impact continues through"
                              : "Primary propagation channel"}
                        </strong>
                        <div>{primaryChannelLine}</div>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        </div>
        {dominantScenarioChannelText && (
          <div>
            <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
              {language === "sv"
                ? "Skillnaden mellan strategierna drivs främst via"
                : "The difference between strategies is primarily driven via"}
            </div>
            <div>{dominantScenarioChannelText}</div>
          </div>
        )}

        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {language === "sv"
              ? "När förändringen börjar märkas"
              : "When effects begin to appear"}
          </div>

          {activeDomainEvents.length === 0 ? (
            <span style={{ color: "#6B7280" }}>—</span>
          ) : (
            activeDomainEvents.map((e, i) => (
              <div key={i}>
                M{e.month + 1} — {e.label}
              </div>
            ))
          )}
        </div>
        {caseType === "transport" &&
          primaryDriver &&
          (
            TRANSPORT_SYSTEM_DRIVERS[
              primaryDriver as keyof typeof TRANSPORT_SYSTEM_DRIVERS
            ]?.propagationChain as string[] | undefined
          )?.includes("demand") && (
          <div style={{ marginTop: "12px" }}>
            <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
              {language === "sv"
                ? "När efterfrågan börjar påverkas"
                : "DEMAND RESPONSE"}
            </div>

            <div>
              {language === "sv"
                ? "Efterfrågan börjar justeras när tillgänglighet och attraktivitet förändras."
                : "Demand begins adjusting as accessibility and modal attractiveness change."}
            </div>
          </div>
        )}

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
              {scenarioALegendLabel}: {typeof currentMargin === "number" ? currentMargin.toFixed(2) : currentMargin}
            </span>
            <span>
              {`${scenarioBLegendLabel}:`}{" "}
              {typeof alternativeMargin === "number"
                ? alternativeMargin.toFixed(2)
                : alternativeMargin}
            </span>
            <span>
              {language === "sv" ? "Skillnad:" : "Difference:"}{" "}
              {typeof marginImpact === "number"
                ? marginImpact.toFixed(2)
                : marginImpact}
            </span>
          </div>
        </div>
        <div style={{ marginTop: "6px" }}>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {language === "sv"
              ? "Handlingsutrymme framåt"
              : "Forward decision flexibility"}
          </div>
          <div>
            {marginTrend === "down"
              ? language === "sv"
                ? "Minskar över tid"
                : "Decreasing over time"
              : marginTrend === "up"
              ? language === "sv"
                ? "Ökar över tid"
                : "Increasing over time"
              : language === "sv"
              ? caseType === "real-estate"
                ? "Portföljens handlingsutrymme bedöms vara stabilt inom analysperioden"
                : "Systemets flexibilitet bedöms vara stabil inom analysperioden"
              : "Stable"}
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
        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {language === "sv" ? "Effekt av beslutet" : "DECISION EFFECT"}
          </div>
          <div>{decisionEffectText}</div>
        </div>

        <div>
          <div style={{ color: "#9CA3AF", marginBottom: "4px" }}>
            {language === "sv"
              ? "Skillnad mellan strategierna"
              : "Difference between strategies"}
          </div>
          <div>{scenarioDifferenceText}</div>
          <div>
            {firstDivergenceMonth != null
              ? language === "sv"
                ? `Skillnaden börjar uppstå runt M${firstDivergenceMonth}`
                : `Difference begins around M${firstDivergenceMonth}`
              : hasStructuralDivergence
              ? language === "sv"
                ? "Strategierna utvecklas olika eftersom de påverkar olika delar av systemet"
                : "Structural divergence detected through different drivers or propagation pathways"
              : language === "sv"
              ? "Ingen strukturell divergens identifierad inom aktuell simuleringshorisont"
              : "No structural divergence detected yet"}
          </div>
        </div>
        {inspectionMode === "expert" && (
          <div>
            <div style={{ color: "#9CA3AF", marginBottom: "6px", fontWeight: 600 }}>
              {uiLanguage === "sv"
                ? isRealEstate
                  ? "Fördjupad portföljdiagnostik"
                  : "Strukturellt inspektionslager — motordiagnostik"
                : isRealEstate
                  ? "Deeper portfolio diagnostics"
                  : "Structural inspection layer — engine diagnostics"}
            </div>
            <div style={{ display: "grid", gap: "6px" }}>
              <div>
                <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
                  {uiLanguage === "sv"
                    ? isRealEstate
                      ? "Antal aktiva samband:"
                      : "Driver interaction depth:"
                    : isRealEstate
                      ? "Active relationships:"
                      : "Driver interaction depth:"}
                </span>
                <span>{driverInteractionDepthText}</span>
              </div>
              <div>
                <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
                  {uiLanguage === "sv"
                    ? isRealEstate
                      ? "När begränsningar blir synliga:"
                      : "Constraint lifecycle:"
                    : isRealEstate
                      ? "Constraint timing:"
                      : "Constraint lifecycle:"}
                </span>
                <span>{constraintLifecycleText}</span>
              </div>
              <div>
                <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
                  {uiLanguage === "sv"
                    ? isRealEstate
                      ? "Påverkanskedja:"
                      : "Cascade structure:"
                    : isRealEstate
                      ? "Impact chain:"
                      : "Cascade structure:"}
                </span>
                <span>
                  {caseType === "transport"
                    ? domainEvents.length > 0
                      ? domainEvents
                          .slice(0, 3)
                          .map((event) => event.label)
                          .join(" → ")
                      : (uiLanguage === "sv" ? "Ingen aktiv struktur" : "No active structure")
                    : cascadeStructureText}
                </span>
              </div>
              <div>
                <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
                  {uiLanguage === "sv"
                    ? isRealEstate
                      ? "Hur handlingsutrymmet påverkas:"
                      : "Margin propagation mechanics:"
                    : isRealEstate
                      ? "How flexibility is affected:"
                      : "Margin propagation mechanics:"}
                </span>
                <span>{marginPropagationMechanicsText}</span>
              </div>
              <div>
                <span style={{ color: "#9CA3AF", marginRight: "6px" }}>
                  {uiLanguage === "sv" ? "Diagnostics metadata:" : "Diagnostics metadata:"}
                </span>
                <span>{`Horizon=${simulationHorizon ?? "—"}, SeriesA=${seriesLengthA}, SeriesB=${seriesLengthB}, SelectedM=${selectedMonthIndex != null ? selectedMonthIndex + 1 : "—"}`}</span>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default AIInspectorPanel;
