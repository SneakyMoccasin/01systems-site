"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { getSystemSnapshot } from "@/src/systemSnapshot/systemSnapshotStore";
import type { EngineState, RiskState } from "@/src/pilotFastighet/RealEstateEngine";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";
import { createInitialConstraintRegistry } from "@/src/pilotFastighet/constraintState";
import type { RiskLevel, ParameterSpec } from "@/src/pilotFastighet/impactContract";
import { getImpactContract } from "@/src/pilotFastighet/getImpactContract";
import {
  findTippingIndex,
  buildExecutiveConclusion,
} from "@/src/pilotFastighet/compareHelpers";
import { PILOT_CASES } from "@/src/pilotFastighet/pilotCases";
import { calculateExecutiveSummary } from "@/src/pilotFastighet/analysis/calculateExecutiveSummary";
import {
  createCleanRunSourceSnapshot,
  runReactAnalysisBoundary,
} from "@/src/pilotFastighet/analysis/reactScheduledAnalysisBoundary";
import {
  createPreconfiguredPlayback,
  getPreconfiguredPlaybackSnapshot,
  isPlaybackGenerationCurrent,
  type PreconfiguredPlayback,
} from "@/src/pilotFastighet/analysis/preconfiguredPlayback";
import { SnapshotCompare } from "@/src/pilotFastighet/components/SnapshotCompare";
import { ExecutiveSummaryCard } from "@/app/pilot-fastighet/components/ExecutiveSummaryCard";
import AIInterpretationPanel from "./components/AIInterpretationPanel";
import PromptDock from "./components/PromptDock";
import ScenarioPromptDock from "./components/ScenarioPromptDock";
import ScenarioLibrary from "./components/ScenarioLibrary";
import ScenarioInterpretationPanel from "./components/ScenarioInterpretationPanel";
import WhyPanel from "./components/WhyPanel";
import ScenarioOutcomePanel from "./components/ScenarioOutcomePanel";
import SystemDriversPanel from "./components/SystemDriversPanel";
import DecisionExplanationPanel from "./components/DecisionExplanationPanel";
import ScenarioPreviewPanel from "./components/ScenarioPreviewPanel";
import AIInspectorPanel from "./components/AIInspectorPanel";
import ScenarioPresetsPanel from "@/app/pilot-fastighet/components/ScenarioPresetsPanel";
import { mapRiskLabelToPolicyLabel } from "@/app/pilot-fastighet/components/inspector-utils/mapRiskLabelToPolicyLabel";
import {
  buildDomainPropagationEvents,
  getPrimaryPropagationSignature,
} from "./components/inspector-utils/buildDomainPropagationEvents";
import { buildConstraintActivationTimeline } from "./components/inspector-utils/buildConstraintActivationTimeline";
import { buildConstraintComparisonMessages } from "./components/inspector-utils/buildConstraintComparisonMessages";
import { buildStructuralGoalMessages } from "./components/inspector-utils/buildStructuralGoalMessages";
import { buildDominantConstraintMessage } from "./components/inspector-utils/buildDominantConstraintMessage";
import { DEFAULT_GOAL_TYPE } from "./components/inspector-utils/goalTypes";
import ActionPanel from "./components/ActionPanel";
import MarginGraph, {
  MarginGraphLegendRow,
  type DomainEvent,
  type MarginGraphSelectMonthPayload,
} from "./components/MarginGraph";
import { UI_TEXT, type Language, CASE_TRANSLATIONS, EVENT_TRANSLATIONS } from "@/src/pilotFastighet/uiText";
import { pulseLanguage, activeDomain, setActiveDomain, type DomainKey } from "@/src/i18n/pulseLanguage";
import { type ScenarioChange } from "@/lib/scenarioParser";
import { parsePreviewScenarioImpact } from "@/src/pilotFastighet/previewScenarioImpact";
import { getScenarioLibrary } from "@/src/pilotFastighet/scenarioLibrary";
import { resolveTransportInspectorContext } from "@/src/pilotFastighet/transportInspectorAdapter";
import {
  getTransportPolicyExplanationLabel,
} from "@/src/pilotFastighet/transportDomainMapping";
import {
  defaultRiskState,
  getRiskStateAfterPreset,
} from "@/src/pilotFastighet/presetRiskMapping";
import {
  ACTION_EFFECTS,
  resolveActionDrivenState,
} from "@/src/pilotFastighet/actionEffects";
import {
  buildDriverScoreState,
  type DriverScoreState,
} from "@/src/pilotFastighet/driverScoreState";
import { createFreshDomainScenarioState } from "@/src/pilotFastighet/domainState";
import {
  profileCount,
  profileMeasure,
  profileValue,
} from "@/src/lib/runtimeProfile";
import {
  getExecutiveDemoGoalOptionLabel,
  getExecutiveDemoGoalPickerLabel,
  getExecutiveDemoGraphFraming,
  getExecutiveDemoGraphTimelineMarkers,
  getExecutiveDemoHero,
  getExecutiveDemoMarginStripLabels,
  getExecutiveDemoPlaybackInitiativesNote,
  getExecutiveDemoScenarioComparisonStrip,
} from "@/src/pilotFastighet/executiveDemoFraming";
import {
  EXEC_DEMO_PLAYBACK_PRESET_ID,
  getExecutiveDemoPlaybackPresetTitle,
  getExecutiveDemoPlaybackRiskStates,
} from "@/src/pilotFastighet/executiveDemoPlaybackScenario";
import { getPilotStrategyColors } from "@/src/pilotFastighet/strategyColors";
import { surfaceOrgDemoText } from "@/src/pilotFastighet/executiveDemoTransformation";
import {
  installPulseUnhandledRejectionTracer,
  logPulseCaughtRejection,
} from "@/src/pilotFastighet/pulseTraceUnhandledRejection";

function buildScenarioTargetPolicyEvents(
  scenarioTarget: string | null | undefined,
  language: "sv" | "en"
): DomainEvent[] {
  if (!scenarioTarget) return [];

  const labels =
    language === "sv"
      ? {
          increase_accessibility: [
            "Tillgänglighet i nätverket",
            "Restidsreduktion",
            "Systemkopplingar stärks",
          ],
          increase_modal_attractiveness: [
            "Kollektivtrafikens attraktivitet",
            "Prioritering i nätverket",
            "Upplevd tillgänglighet stärks",
          ],
          reduce_capacity_pressure: [
            "Kapacitetstryck i nätverket",
            "Flödesavlastning",
            "Genomförandetakt stabiliseras",
          ],
          margin_stability: [
            "Systemets marginalnivå",
            "Begränsningar skjuts fram",
            "Handlingsutrymmet stabiliseras",
          ],
          avoid_tipping: [
            "Tipping-risk",
            "Kritiska begränsningar undviks",
            "Systemet håller avstånd till brytpunkter",
          ],
        }
      : {
          increase_accessibility: [
            "Network accessibility",
            "Travel time reduction",
            "System connections strengthen",
          ],
          increase_modal_attractiveness: [
            "Modal attractiveness",
            "Network priority",
            "Perceived accessibility improves",
          ],
          reduce_capacity_pressure: [
            "Network capacity pressure",
            "Flow relief",
            "Implementation pacing stabilises",
          ],
          margin_stability: [
            "System margin level",
            "Constraints are delayed",
            "Room to act stabilises",
          ],
          avoid_tipping: [
            "Tipping risk",
            "Critical constraints are avoided",
            "The system keeps distance from tipping points",
          ],
        };

  const sequence = labels[scenarioTarget as keyof typeof labels];
  if (!sequence) return [];

  return sequence.map((label, index) => ({
    month: index * 2,
    label,
  }));
}

function areRiskStatesEqual(a: RiskState, b: RiskState): boolean {
  if (a === b) return true;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

const STORAGE_KEY_A = "pulse_pilot_fastighet_history_A";
const STORAGE_KEY_B = "pulse_pilot_fastighet_history_B";
const SNAPSHOT_LABELS_KEY = "pulse.snapshotLabels.v1";
const UI_MODE_KEY = "pulse.pilotFastighet.uiMode.v1";

const VISIBLE_PILOT_CASES = PILOT_CASES.filter(
  (c) => c.id !== "neutral-baseline"
);
const EXEC_TIPPING_THRESHOLD = 0.9;
const EXEC_SUSTAIN_THRESHOLD = 0.8;
const EXEC_COLLAPSE_THRESHOLD = 0.6;
const MIN_STEPS_BEFORE_STEADY = 5;
const REQUIRED_STABLE_TICKS = 3;
const ANALYSIS_HORIZON = 16;
const TOP_LEVEL_GOAL_LABELS = {
  transport: {
    accessibility: { sv: "Öka tillgänglighet", en: "Increase accessibility" },
    congestion: { sv: "Minska trängsel", en: "Reduce congestion" },
    margin_stability: {
      sv: "Behåll marginalstabilitet",
      en: "Maintain margin stability",
    },
    avoid_tipping: { sv: "Undvik tipping-risk", en: "Avoid tipping risk" },
  },
  "real-estate": {
    accessibility: {
      sv: "Stärk uthyrningsattraktivitet",
      en: "Strengthen leasing attractiveness",
    },
    congestion: {
      sv: "Minska operativ belastning",
      en: "Reduce operational strain",
    },
    margin_stability: {
      sv: "Bevara portföljflexibilitet",
      en: "Preserve portfolio flexibility",
    },
    avoid_tipping: {
      sv: "Undvik refinansieringsrisk",
      en: "Avoid refinancing risk",
    },
  },
} as const;

function loadHistory(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(key: string, history: any[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(history));
}

function loadSnapshotLabels(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SNAPSHOT_LABELS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSnapshotLabels(labels: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SNAPSHOT_LABELS_KEY, JSON.stringify(labels));
}

export default function PilotFastighetPage() {
  profileCount("PilotFastighetPage.render");

  type ScenarioId = "A" | "B" | "BOTH";

  type FrozenSnapshot = {
    snapshotId: string;
    label?: string;
    createdAt: number;
    engineState: EngineState;
    metadata: {
      caseId: string | null;
      scenario: "A" | "B";
      modelVersion: string;
    };
  };

  const [riskStateBaseline, setRiskStateBaseline] = useState<
    Record<string, RiskLevel>
  >(() => structuredClone(defaultRiskState));
  const [riskStateA, setRiskStateA] = useState<RiskState>(() =>
    structuredClone(defaultRiskState)
  );
  const [riskStateB, setRiskStateB] = useState<RiskState>(() =>
    structuredClone(defaultRiskState)
  );
  const [driverScoresA, setDriverScoresA] = useState<DriverScoreState>(() =>
    buildDriverScoreState(defaultRiskState)
  );
  const [driverScoresB, setDriverScoresB] = useState<DriverScoreState>(() =>
    buildDriverScoreState(defaultRiskState)
  );
  const [baseRiskStateA, setBaseRiskStateA] = useState<RiskState>(() =>
    structuredClone(defaultRiskState)
  );
  const [baseRiskStateB, setBaseRiskStateB] = useState<RiskState>(() =>
    structuredClone(defaultRiskState)
  );
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("A");
  const [showA, setShowA] = useState(true);
  const [showB, setShowB] = useState(true);

  const [historyA, setHistoryA] = useState<FrozenSnapshot[]>([]);
  const [historyB, setHistoryB] = useState<FrozenSnapshot[]>([]);
  const [historyBaseline, setHistoryBaseline] = useState<FrozenSnapshot[]>([]);
  const [selectedSnapA, setSelectedSnapA] = useState<string>("");
  const [selectedSnapB, setSelectedSnapB] = useState<string>("");
  const [snapshotLabels, setSnapshotLabels] = useState<Record<string, string>>(
    () => loadSnapshotLabels()
  );
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState<string>("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [marginHistoryA, setMarginHistoryA] = useState<number[]>([]);
  const [marginHistoryB, setMarginHistoryB] = useState<number[]>([]);
  const [demandHistoryA, setDemandHistoryA] = useState<number[]>([]);
  const [demandHistoryB, setDemandHistoryB] = useState<number[]>([]);
  const [marginHistoryBaseline, setMarginHistoryBaseline] = useState<number[]>([]);
  const [tippingMarginIndexA, setTippingMarginIndexA] = useState<number | null>(null);
  const [tippingMarginIndexB, setTippingMarginIndexB] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedPilotCaseId, setSelectedPilotCaseId] = useState<string>("");
  const [selectedGoal, setSelectedGoal] = useState<
    "accessibility" | "congestion" | "margin_stability" | "avoid_tipping"
  >("accessibility");
  const [transportScenarioTarget, setTransportScenarioTarget] = useState<string | null>(null);
  const [showDriverActivations, setShowDriverActivations] = useState(false);
  const [freezeFlash, setFreezeFlash] = useState<"A" | "B" | null>(null);
  const [uiTheme, setUiTheme] = useState<"dark" | "light">("dark");
  const [uiLanguage, setUiLanguage] = useState<Language>("sv");
  const [uiMode, setUiMode] = useState<"executive" | "expert">("executive");
  const [executiveDemoMode, setExecutiveDemoMode] = useState(false);

  // Cascades and escalation come from the headless analysis facade.
  const [executiveSummary, setExecutiveSummary] =
    useState<ReturnType<typeof calculateExecutiveSummary> | null>(null);
  const [steadyStateStep, setSteadyStateStep] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedMonthData, setSelectedMonthData] =
    useState<MarginGraphSelectMonthPayload | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    return installPulseUnhandledRejectionTracer();
  }, []);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewChangesA, setPreviewChangesA] = useState<ScenarioChange[]>([]);
  const [previewChangesB, setPreviewChangesB] = useState<ScenarioChange[]>([]);
  const [previewScenarioTextA, setPreviewScenarioTextA] = useState<string | undefined>(undefined);
  const [previewScenarioTextB, setPreviewScenarioTextB] = useState<string | undefined>(undefined);
  const [scenarioHistory, setScenarioHistory] = useState<string[]>([]);
  const [scenarioPromptA, setScenarioPromptA] = useState("");
  const [scenarioALabel, setScenarioALabel] = useState<string>("");
  const [scenarioBLabel, setScenarioBLabel] = useState<string>("");
  const [scenarioPromptB, setScenarioPromptB] = useState("");
  const [parsedScenarioEffectsA, setParsedScenarioEffectsA] = useState<
    ScenarioChange[]
  >([]);
  const [parsedScenarioEffectsB, setParsedScenarioEffectsB] = useState<
    ScenarioChange[]
  >([]);
  const [simulationHorizon, setSimulationHorizon] = useState(36);
  const [customHorizon, setCustomHorizon] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [hasSimulationCompleted, setHasSimulationCompleted] = useState(false);
  const [simulationSource, setSimulationSource] = useState<
    "case" | "scenario" | "prompt" | "manual" | null
  >(null);
  const [cascadeEventsA, setCascadeEventsA] = useState<CascadeEvent[]>([]);
  const [cascadeEventsB, setCascadeEventsB] = useState<CascadeEvent[]>([]);
  const [domain, setDomain] = useState<DomainKey>(activeDomain);
  const [manualScenarioTarget, setManualScenarioTarget] = useState<"A" | "B">("A");
  const [appliedScenarioAId, setAppliedScenarioAId] = useState<string | null>(null);
  const [appliedScenarioBId, setAppliedScenarioBId] = useState<string | null>(null);
  const [selectedActionsA, setSelectedActionsA] = useState<string[]>([]);
  const [selectedActionsB, setSelectedActionsB] = useState<string[]>([]);

  const editableScenario: "A" | "B" =
    activeScenario === "A" || activeScenario === "B"
      ? activeScenario
      : manualScenarioTarget;

  const playbackRef = useRef<PreconfiguredPlayback | null>(null);
  const currentStateARef = useRef<EngineState | null>(null);
  const currentStateBRef = useRef<EngineState | null>(null);
  const playbackGenerationRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  profileValue(
    "PilotFastighetPage.marginSeries.points",
    Math.max(marginHistoryA.length, marginHistoryB.length),
    "points"
  );
  profileValue(
    "PilotFastighetPage.cascadeEvents",
    cascadeEventsA.length + cascadeEventsB.length,
    "events"
  );

  useEffect(() => {
    setHistoryA(loadHistory(STORAGE_KEY_A));
    setHistoryB(loadHistory(STORAGE_KEY_B));
    if (typeof window !== "undefined") {
      const savedMode = window.localStorage.getItem(UI_MODE_KEY);
      if (savedMode === "executive" || savedMode === "expert") {
        setUiMode(savedMode);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(UI_MODE_KEY, uiMode);
    }
  }, [uiMode]);

  useEffect(() => {
    if (!executiveDemoMode) {
      return;
    }
    setShowHelp(false);
    setUiMode("executive");
    setActiveDomain("realEstate");
    setDomain("realEstate");
    setSelectedPilotCaseId("");
    const demo = getExecutiveDemoPlaybackRiskStates();
    setBaseRiskStateA(structuredClone(demo.riskStateA));
    setBaseRiskStateB(structuredClone(demo.riskStateB));
    setRiskStateA(structuredClone(demo.riskStateA));
    setRiskStateB(structuredClone(demo.riskStateB));
    setDriverScoresA(buildDriverScoreState(demo.riskStateA));
    setDriverScoresB(buildDriverScoreState(demo.riskStateB));
    setSelectedActionsA([]);
    setSelectedActionsB([]);
    setScenarioALabel("");
    setScenarioBLabel("");
    setAppliedScenarioAId(EXEC_DEMO_PLAYBACK_PRESET_ID);
    setAppliedScenarioBId(EXEC_DEMO_PLAYBACK_PRESET_ID);
    setSelectedGoal("margin_stability");
    setShowA(true);
    setShowB(true);
    setActiveScenario("BOTH");
    setSimulationHorizon(36);
    setCustomHorizon(null);
    setIsDirty(false);

    const runId = window.setTimeout(() => {
      startSimulation(
        "manual",
        demo.riskStateA,
        demo.riskStateB,
        buildDriverScoreState(demo.riskStateA),
        buildDriverScoreState(demo.riskStateB)
      );
    }, 0);
    return () => window.clearTimeout(runId);
  }, [executiveDemoMode]);

  useEffect(() => {
    const scenarioLibrary = getScenarioLibrary(uiLanguage);

    const labelA =
      scenarioLibrary.find((p) => p.id === scenarioALabel)?.prompt ?? "";

    const labelB =
      scenarioLibrary.find((p) => p.id === scenarioBLabel)?.prompt ?? "";

    if (scenarioALabel) {
      setScenarioPromptA(labelA);
    }

    if (scenarioBLabel) {
      setScenarioPromptB(labelB);
    }
  }, [uiLanguage]);

  const handleScenarioSubmit = (textA: string, textB: string) => {

    const currentRiskStateA = {
      "Interest Rate Exposure": riskStateA.interestRateExposureRisk,
      "Energy Exposure": riskStateA.energyExposureRisk,
      "Tenant Stability": riskStateA.tenantStabilityRisk,
      "Maintenance Intensity": riskStateA.maintenanceIntensityRisk,
      "Refinancing Risk": riskStateA.refinancingRisk,
      "Demand Risk": riskStateA.demandRisk,
      "Pricing Power Risk": riskStateA.pricingPowerRisk,
      "Operational Efficiency Risk": riskStateA.operationalEfficiencyRisk,
      "Market Volatility Risk": riskStateA.marketVolatilityRisk,
      "Regulatory Pressure Risk": riskStateA.regulatoryPressureRisk,
      "Capital Commitment Rigidity Risk": riskStateA.capitalCommitmentRigidityRisk,
      "Leverage Level Risk": riskStateA.leverageLevelRisk,
    };
    const currentRiskStateB = {
      "Interest Rate Exposure": riskStateB.interestRateExposureRisk,
      "Energy Exposure": riskStateB.energyExposureRisk,
      "Tenant Stability": riskStateB.tenantStabilityRisk,
      "Maintenance Intensity": riskStateB.maintenanceIntensityRisk,
      "Refinancing Risk": riskStateB.refinancingRisk,
      "Demand Risk": riskStateB.demandRisk,
      "Pricing Power Risk": riskStateB.pricingPowerRisk,
      "Operational Efficiency Risk": riskStateB.operationalEfficiencyRisk,
      "Market Volatility Risk": riskStateB.marketVolatilityRisk,
      "Regulatory Pressure Risk": riskStateB.regulatoryPressureRisk,
      "Capital Commitment Rigidity Risk": riskStateB.capitalCommitmentRigidityRisk,
      "Leverage Level Risk": riskStateB.leverageLevelRisk,
    };

    const scenarios = getScenarioLibrary(uiLanguage);
    const selectedScenarioA = scenarios.find(
      (s) => s.prompt.trim() === textA.trim()
    ) as (typeof scenarios)[number] & {
      impact?: Record<string, RiskLevel>;
    };
    const selectedScenarioB = scenarios.find(
      (s) => s.prompt.trim() === textB.trim()
    ) as (typeof scenarios)[number] & {
      impact?: Record<string, RiskLevel>;
    };
    const changesA = selectedScenarioA?.impact
      ? Object.entries(selectedScenarioA.impact)
          .map(([key, to]) => {
            const parameter =
              key === "capitalCommitmentRigidity"
                ? "Capital Commitment Rigidity Risk"
                : key === "maintenanceIntensity"
                  ? "Maintenance Intensity"
                  : key === "operationalEfficiency"
                    ? "Operational Efficiency Risk"
                    : key === "refinancingRisk"
                      ? "Refinancing Risk"
                      : null;
            if (!parameter) return null;
            const from = currentRiskStateA[parameter as keyof typeof currentRiskStateA];
            if (!from || from === to) return null;
            return { parameter, from, to };
          })
          .filter((c): c is ScenarioChange => c !== null)
      : parsePreviewScenarioImpact(textA, currentRiskStateA);
    const changesB = selectedScenarioB?.impact
      ? Object.entries(selectedScenarioB.impact)
          .map(([key, to]) => {
            const parameter =
              key === "capitalCommitmentRigidity"
                ? "Capital Commitment Rigidity Risk"
                : key === "maintenanceIntensity"
                  ? "Maintenance Intensity"
                  : key === "operationalEfficiency"
                    ? "Operational Efficiency Risk"
                    : key === "refinancingRisk"
                      ? "Refinancing Risk"
                      : null;
            if (!parameter) return null;
            const from = currentRiskStateB[parameter as keyof typeof currentRiskStateB];
            if (!from || from === to) return null;
            return { parameter, from, to };
          })
          .filter((c): c is ScenarioChange => c !== null)
      : parsePreviewScenarioImpact(textB, currentRiskStateB);

    setParsedScenarioEffectsA(changesA);
    setParsedScenarioEffectsB(changesB);
    setPreviewChangesA(changesA);
    setPreviewChangesB(changesB);
    setPreviewScenarioTextA(textA || undefined);
    setPreviewScenarioTextB(textB || undefined);
    setScenarioHistory((prev) => {
      const entry = [textA, textB].filter(Boolean).join(" | ") || textA || textB;
      const next = [entry, ...prev.filter((s) => s !== entry)];
      return next.slice(0, 5);
    });
    setPreviewVisible(true);
  };

  const keyMap: Record<string, string> = {
    "Interest Rate Exposure": "interestRateExposureRisk",
    "Energy Exposure": "energyExposureRisk",
    "Tenant Stability": "tenantStabilityRisk",
    "Maintenance Intensity": "maintenanceIntensityRisk",
    "Refinancing Risk": "refinancingRisk",
    "Demand Risk": "demandRisk",
    "Pricing Power Risk": "pricingPowerRisk",
    "Operational Efficiency Risk": "operationalEfficiencyRisk",
    "Market Volatility Risk": "marketVolatilityRisk",
    "Regulatory Pressure Risk": "regulatoryPressureRisk",
    "Capital Commitment Rigidity Risk": "capitalCommitmentRigidityRisk",
    "Leverage Level Risk": "leverageLevelRisk",
  };

  function applyChangesToState(
    prev: Record<string, RiskLevel>,
    changes: ScenarioChange[]
  ): Record<string, RiskLevel> {
    const next = { ...prev };
    for (const change of changes) {
      const key = keyMap[change.parameter];
      if (key) {
        (next as Record<string, RiskLevel>)[key] = change.to;
      }
    }
    return next;
  }

  function applyScenarioChanges(
    changesA: ScenarioChange[],
    changesB: ScenarioChange[]
  ) {
    const nextA =
      Object.keys(changesA).length > 0
        ? applyChangesToState(
            baseRiskStateA as Record<string, RiskLevel>,
            changesA
          )
        : baseRiskStateA;
    const nextB =
      Object.keys(changesB).length > 0
        ? applyChangesToState(
            baseRiskStateB as Record<string, RiskLevel>,
            changesB
          )
        : baseRiskStateB;

    // Apply scenario changes to the preconfigured facade input states.
    const target = editableScenario;

    if (target === "A") {
      setBaseRiskStateA(structuredClone(nextA as RiskState));
      const resolved = resolveActionDrivenState(
        structuredClone(nextA as RiskState),
        selectedActionsA
      );
      setRiskStateA(resolved.riskState);
      setDriverScoresA(resolved.driverScores);
    }

    if (target === "B") {
      setBaseRiskStateB(structuredClone(nextB as RiskState));
      const resolved = resolveActionDrivenState(
        structuredClone(nextB as RiskState),
        selectedActionsB
      );
      setRiskStateB(resolved.riskState);
      setDriverScoresB(resolved.driverScores);
    }
  }

  function cancelPlayback() {
    playbackGenerationRef.current += 1;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function resetRunState() {
    cancelPlayback();
    playbackRef.current = null;
    currentStateARef.current = null;
    currentStateBRef.current = null;
    setMarginHistoryA([]);
    setMarginHistoryB([]);
    setDemandHistoryA([]);
    setDemandHistoryB([]);
    setMarginHistoryBaseline([]);
    setHistoryBaseline([]);
    setTippingMarginIndexA(null);
    setTippingMarginIndexB(null);
    setExecutiveSummary(null);
    setSteadyStateStep(null);
    setCascadeEventsA([]);
    setCascadeEventsB([]);
  }

  function startSimulation(
    source: "scenario" | "manual",
    riskOverrideA?: RiskState,
    riskOverrideB?: RiskState,
    driverScoreOverrideA?: DriverScoreState,
    driverScoreOverrideB?: DriverScoreState
  ) {
    profileCount("PilotFastighetPage.startSimulation.calls");
    const effectiveRiskStateA = riskOverrideA ?? riskStateA;
    const effectiveRiskStateB = riskOverrideB ?? riskStateB;
    const effectiveDriverScoresA = driverScoreOverrideA ?? driverScoresA;
    const effectiveDriverScoresB = driverScoreOverrideB ?? driverScoresB;
    setSimulationSource(source);
    setHasSimulationCompleted(false);
    setIsRunning(false);
    resetRunState();

    const runSource = createCleanRunSourceSnapshot({
      scenarioA: {
        baseRiskState: structuredClone(effectiveRiskStateA),
        baseDriverScores: structuredClone(effectiveDriverScoresA),
      },
      scenarioB: {
        baseRiskState: structuredClone(effectiveRiskStateB),
        baseDriverScores: structuredClone(effectiveDriverScoresB),
      },
      baseline: {
        baseRiskState: structuredClone(riskStateBaseline),
      },
    });
    const { analysis } = runReactAnalysisBoundary({
      executionMode: "configured-start",
      horizon: simulationHorizon,
      runSource,
    });
    const playback = createPreconfiguredPlayback(analysis, simulationHorizon);
    playbackRef.current = playback;
    currentStateARef.current = {
      step: 0,
      margin: 1,
      riskState: structuredClone(effectiveRiskStateA),
      driverScores: structuredClone(effectiveDriverScoresA),
      registry: createInitialConstraintRegistry(),
      cascadeEvents: [],
    };
    currentStateBRef.current = {
      step: 0,
      margin: 1,
      riskState: structuredClone(effectiveRiskStateB),
      driverScores: structuredClone(effectiveDriverScoresB),
      registry: createInitialConstraintRegistry(),
      cascadeEvents: [],
    };
    const runGeneration = playbackGenerationRef.current;
    let playbackTick = 0;
    setIsDirty(false);
    setIsRunning(true);

    intervalRef.current = window.setInterval(() => {
      try {
        profileCount("PilotFastighetPage.intervalTick.calls");
        profileMeasure("PilotFastighetPage.intervalTick.ms", () => {
          if (
            !isPlaybackGenerationCurrent(
              runGeneration,
              playbackGenerationRef.current
            ) ||
            playbackRef.current !== playback
          ) {
            return;
          }

          playbackTick += 1;
          const snapshot = getPreconfiguredPlaybackSnapshot(playback, playbackTick);
          currentStateARef.current = snapshot.currentStateA;
          currentStateBRef.current = snapshot.currentStateB;

          if (snapshot.isCompleted) {
            if (intervalRef.current) {
              window.clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }

          unstable_batchedUpdates(() => {
            if (snapshot.riskStateA && snapshot.driverScoresA) {
              setRiskStateA((prev) =>
                areRiskStatesEqual(prev, snapshot.riskStateA as RiskState)
                  ? prev
                  : structuredClone(snapshot.riskStateA as RiskState)
              );
              setDriverScoresA(structuredClone(snapshot.driverScoresA));
            }
            if (snapshot.riskStateB && snapshot.driverScoresB) {
              setRiskStateB((prev) =>
                areRiskStatesEqual(prev, snapshot.riskStateB as RiskState)
                  ? prev
                  : structuredClone(snapshot.riskStateB as RiskState)
              );
              setDriverScoresB(structuredClone(snapshot.driverScoresB));
            }
            setCascadeEventsA([...snapshot.cascadeEventsA]);
            setCascadeEventsB([...snapshot.cascadeEventsB]);
            setSteadyStateStep(snapshot.steadyStateStep);
            setTippingMarginIndexA(snapshot.tippingMarginIndexA);
            setTippingMarginIndexB(snapshot.tippingMarginIndexB);
            setMarginHistoryA([...snapshot.marginHistoryA]);
            setMarginHistoryB([...snapshot.marginHistoryB]);
            setDemandHistoryA([...snapshot.demandHistoryA]);
            setDemandHistoryB([...snapshot.demandHistoryB]);
            setMarginHistoryBaseline([...snapshot.marginHistoryBaseline]);
            if (snapshot.isCompleted) {
              setHasSimulationCompleted(true);
              setIsRunning(false);
            }
          });
        });
      } catch (err) {
        logPulseCaughtRejection("PilotFastighetPage.intervalTick", err);
        throw err;
      }
    }, 500);

  }

  useEffect(() => {
    return () => {
      playbackGenerationRef.current += 1;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // If the user stops the simulation, ensure the running interval is cleared.
  useEffect(() => {
    if (!isRunning && intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isRunning]);

  function defaultEngineState(riskState: Record<string, RiskLevel>) {
    return {
      step: 0,
      margin: 1,
      riskState,
      driverScores: buildDriverScoreState(riskState),
      registry: createInitialConstraintRegistry(),
      cascadeEvents: [] as CascadeEvent[],
    };
  }

  const stateA = currentStateARef.current
    ? currentStateARef.current
    : defaultEngineState(riskStateA);
  const stateB = currentStateBRef.current
    ? currentStateBRef.current
    : defaultEngineState(riskStateB);
  const activeState =
    activeScenario === "A" ? stateA : stateB;

  const activeRiskState =
    activeScenario === "B" ? riskStateB : riskStateA;

  const isEditableScenario = activeScenario === "A" || activeScenario === "B";

  function freezeScenarioA() {
    const snap: FrozenSnapshot = {
      snapshotId: new Date().toISOString(),
      label: "Scenario A",
      createdAt: Date.now(),
      engineState: JSON.parse(JSON.stringify(stateA)),
      metadata: {
        caseId: selectedPilotCaseId ?? null,
        scenario: "A",
        modelVersion: "pilot-fastighet-v0.4",
      },
    };
    const next = [snap, ...historyA];
    setHistoryA(next);
    saveHistory(STORAGE_KEY_A, next);
    setFreezeFlash("A");
    setTimeout(() => setFreezeFlash(null), 600);
  }

  function freezeScenarioB() {
    const snap: FrozenSnapshot = {
      snapshotId: new Date().toISOString(),
      label: "Scenario B",
      createdAt: Date.now(),
      engineState: JSON.parse(JSON.stringify(stateB)),
      metadata: {
        caseId: selectedPilotCaseId ?? null,
        scenario: "B",
        modelVersion: "pilot-fastighet-v0.4",
      },
    };
    const next = [snap, ...historyB];
    setHistoryB(next);
    saveHistory(STORAGE_KEY_B, next);
    setFreezeFlash("B");
    setTimeout(() => setFreezeFlash(null), 600);
  }

  function deleteSnapshotA(snapshotId: string) {
    const next = historyA.filter((s) => s.snapshotId !== snapshotId);
    setHistoryA(next);
    saveHistory(STORAGE_KEY_A, next);
    if (selectedSnapA === snapshotId) setSelectedSnapA("");
  }

  function deleteSnapshotB(snapshotId: string) {
    const next = historyB.filter((s) => s.snapshotId !== snapshotId);
    setHistoryB(next);
    saveHistory(STORAGE_KEY_B, next);
    if (selectedSnapB === snapshotId) setSelectedSnapB("");
  }

  const snapA = historyA.find((s) => s.snapshotId === selectedSnapA) ?? null;
  const snapB = historyB.find((s) => s.snapshotId === selectedSnapB) ?? null;

  const tippingIndexA = findTippingIndex(historyA);
  const tippingIndexB = findTippingIndex(historyB);
  const tippingStepA =
    tippingIndexA != null ? historyA[tippingIndexA]?.engineState?.step ?? null : null;
  const tippingStepB =
    tippingIndexB != null ? historyB[tippingIndexB]?.engineState?.step ?? null : null;

  const deltaMargin =
    snapA != null && snapB != null
      ? snapB.engineState.margin - snapA.engineState.margin
      : undefined;
  const lifecycleA =
    snapA?.engineState?.registry?.RefinancingConstraint?.lifecycle ?? undefined;
  const lifecycleB =
    snapB?.engineState?.registry?.RefinancingConstraint?.lifecycle ?? undefined;

  const executiveConclusion =
    deltaMargin !== undefined
      ? buildExecutiveConclusion({
          deltaMargin,
          lifecycleA,
          lifecycleB,
          tippingStepA,
          tippingStepB,
        })
      : null;

  function getDisplayLabel(snap: FrozenSnapshot): string {
    return snapshotLabels[snap.snapshotId] ?? snap.label ?? snap.snapshotId;
  }

  function saveLabel(snapshotId: string, label: string) {
    const trimmed = label.trim();
    const next = { ...snapshotLabels };
    if (trimmed) next[snapshotId] = trimmed;
    else delete next[snapshotId];
    setSnapshotLabels(next);
    saveSnapshotLabels(next);
    setEditingLabelId(null);
    setEditingLabelValue("");
  }

  const impactContract = getImpactContract(domain) as ParameterSpec[];
  const groupedParameters = impactContract.reduce(
    (acc, param) => {
      if (!acc[param.group]) {
        acc[param.group] = [];
      }
      acc[param.group].push(param);
      return acc;
    },
    {} as Record<string, ParameterSpec[]>
  );
  const goalRelevantDrivers: Record<string, string[]> = {
    accessibility: [
      "accessibility",
      "modal_attractiveness",
      "transit_signal_priority",
      "operational_capacity",
    ],
    congestion: [
      "congestion_pressure",
      "modal_attractiveness",
      "transit_signal_priority",
    ],
    margin_stability: [
      "capitalCommitmentRigidityRisk",
      "refinancingRisk",
      "interestRateExposureRisk",
      "maintenanceIntensityRisk",
    ],
    avoid_tipping: [
      "capitalCommitmentRigidityRisk",
      "leverageLevelRisk",
      "refinancingRisk",
    ],
  };

  function handleParameterChangeScenarioA(
    parameter: string,
    valueOrDelta: RiskLevel | number,
    isDelta = false
  ) {
    setIsDirty(true);
    const riskLevels: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "SEVERE"];

    const updateScenarioState = (current: RiskState): RiskState => {
      if (!(parameter in current)) return current;

      let nextValue: RiskLevel;
      if (isDelta) {
        const currentValue = current[parameter as keyof RiskState];
        const currentIndex = riskLevels.indexOf(currentValue);
        if (currentIndex < 0) return current;
        const delta = Number(valueOrDelta);
        const targetIndex = Math.max(
          0,
          Math.min(riskLevels.length - 1, currentIndex + Math.trunc(delta))
        );
        nextValue = riskLevels[targetIndex];
      } else {
        nextValue = valueOrDelta as RiskLevel;
      }

      return {
        ...current,
        [parameter]: nextValue,
      };
    };

    setBaseRiskStateA((prev) => {
      const nextBase = updateScenarioState(prev);
      const resolved = resolveActionDrivenState(nextBase, selectedActionsA);
      setRiskStateA(resolved.riskState);
      setDriverScoresA(resolved.driverScores);
      return nextBase;
    });
  }

  function handleParameterChangeScenarioB(
    parameter: string,
    valueOrDelta: RiskLevel | number,
    isDelta = false
  ) {
    setIsDirty(true);
    const riskLevels: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "SEVERE"];

    const updateScenarioState = (current: RiskState): RiskState => {
      if (!(parameter in current)) return current;

      let nextValue: RiskLevel;
      if (isDelta) {
        const currentValue = current[parameter as keyof RiskState];
        const currentIndex = riskLevels.indexOf(currentValue);
        if (currentIndex < 0) return current;
        const delta = Number(valueOrDelta);
        const targetIndex = Math.max(
          0,
          Math.min(riskLevels.length - 1, currentIndex + Math.trunc(delta))
        );
        nextValue = riskLevels[targetIndex];
      } else {
        nextValue = valueOrDelta as RiskLevel;
      }

      return {
        ...current,
        [parameter]: nextValue,
      };
    };

    setBaseRiskStateB((prev) => {
      const nextBase = updateScenarioState(prev);
      const resolved = resolveActionDrivenState(nextBase, selectedActionsB);
      setRiskStateB(resolved.riskState);
      setDriverScoresB(resolved.driverScores);
      return nextBase;
    });
  }

  function handleParameterChange(
    parameter: string,
    valueOrDelta: RiskLevel | number,
    isDelta = false
  ) {
    if (activeScenario === "A") {
      handleParameterChangeScenarioA(parameter, valueOrDelta, isDelta);
    } else if (activeScenario === "B") {
      handleParameterChangeScenarioB(parameter, valueOrDelta, isDelta);
    }
  }

  function applyAction(action: string) {
    if (editableScenario === "A") {
      setSelectedActionsA((prev) => {
        const nextActions = prev.includes(action)
          ? prev.filter((a) => a !== action)
          : [...prev, action];
        const resolved = resolveActionDrivenState(baseRiskStateA, nextActions);
        setRiskStateA(resolved.riskState);
        setDriverScoresA(resolved.driverScores);
        return nextActions;
      });
    } else if (editableScenario === "B") {
      setSelectedActionsB((prev) => {
        const nextActions = prev.includes(action)
          ? prev.filter((a) => a !== action)
          : [...prev, action];
        const resolved = resolveActionDrivenState(baseRiskStateB, nextActions);
        setRiskStateB(resolved.riskState);
        setDriverScoresB(resolved.driverScores);
        return nextActions;
      });
    }
  }

  const selectedActionsForPanel =
    editableScenario === "A"
      ? selectedActionsA
      : editableScenario === "B"
        ? selectedActionsB
        : [];
  const strategyView =
    activeScenario === "A"
      ? "baseline"
      : activeScenario === "B"
        ? "goal"
        : "both";
  const selectedScenario = editableScenario;
  const resolvedGoalType = DEFAULT_GOAL_TYPE;
  const constraintActivationTimelineA = useMemo(
    () =>
      buildConstraintActivationTimeline(stateA.registry).map((entry) => ({
        ...entry,
        monthIndex: entry.activationStep,
      })),
    [stateA.registry]
  );
  const constraintActivationTimelineB = useMemo(
    () =>
      buildConstraintActivationTimeline(stateB.registry).map((entry) => ({
        ...entry,
        monthIndex: entry.activationStep,
      })),
    [stateB.registry]
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
    [constraintActivationTimelineA, constraintActivationTimelineB]
  );
  const dominantConstraintMessage = useMemo(
    () =>
      buildDominantConstraintMessage(
        resolvedGoalType,
        constraintComparisonMessages,
        structuralGoalMessages
      ),
    [resolvedGoalType, constraintComparisonMessages, structuralGoalMessages]
  );
  const divergenceMonthIndex = useMemo(() => {
    if (!marginHistoryA?.length || !marginHistoryB?.length) return null;

    const length = Math.min(marginHistoryA.length, marginHistoryB.length);

    for (let i = 0; i < length; i++) {
      if (marginHistoryA[i] !== marginHistoryB[i]) {
        return i;
      }
    }

    return null;
  }, [marginHistoryA, marginHistoryB]);
  const caseType =
    domain === "municipal"
      ? "transport"
      : domain === "realEstate"
        ? "real-estate"
        : null;
  const execRealEstateGraphPassive =
    executiveDemoMode && caseType === "real-estate";
  const strategyColors = getPilotStrategyColors(execRealEstateGraphPassive);
  const visiblePilotCases = useMemo(
    () => VISIBLE_PILOT_CASES.filter((c) => c.domain === domain),
    [domain]
  );
  const resolveTopLevelGoalLabel = (
    goal:
      | "accessibility"
      | "congestion"
      | "margin_stability"
      | "avoid_tipping",
    currentCaseType?: "transport" | "real-estate" | null
  ) => {
    const labels =
      currentCaseType === "real-estate"
        ? TOP_LEVEL_GOAL_LABELS["real-estate"]
        : TOP_LEVEL_GOAL_LABELS.transport;

    return uiLanguage === "sv" ? labels[goal].sv : labels[goal].en;
  };
  const transportContextA = useMemo(() => {
    if (caseType !== "transport") return null;

    return resolveTransportInspectorContext({
      language: uiLanguage,
      selectedActions: selectedActionsA,
      cascadeEventsA,
      primaryPropagationSignatureA: getPrimaryPropagationSignature(cascadeEventsA),
    });
  }, [caseType, uiLanguage, selectedActionsA, cascadeEventsA]);
  const transportContextB = useMemo(() => {
    if (caseType !== "transport") return null;

    return resolveTransportInspectorContext({
      language: uiLanguage,
      selectedActions: selectedActionsB,
      cascadeEventsB,
      primaryPropagationSignatureB: getPrimaryPropagationSignature(cascadeEventsB),
    });
  }, [caseType, uiLanguage, selectedActionsB, cascadeEventsB]);
  const transportContext = useMemo(() => {
    if (caseType !== "transport") return null;

    return resolveTransportInspectorContext({
      language: uiLanguage,
      selectedActions: selectedActionsForPanel,
      cascadeEventsA,
      cascadeEventsB,
      primaryPropagationSignatureA: getPrimaryPropagationSignature(cascadeEventsA),
      primaryPropagationSignatureB: getPrimaryPropagationSignature(cascadeEventsB),
    });
  }, [caseType, uiLanguage, selectedActionsForPanel, cascadeEventsA, cascadeEventsB]);
  const primaryDriverA =
    transportContextA?.primaryDriver ??
    null;
  const primaryDriverB =
    transportContextB?.primaryDriver ??
    null;
  const primaryDriverChanged =
    primaryDriverA != null &&
    primaryDriverB != null &&
    primaryDriverA !== primaryDriverB;
  const constraintActivationChanged =
    constraintComparisonMessages.length > 0;
  const propagationRootChanged = primaryDriverChanged;
  const primaryDriver = transportContext?.primaryDriver ?? null;
  const domainEventsForGraph =
    caseType === "transport"
      ? buildDomainPropagationEvents(
          resolveTransportInspectorContext({
            language: uiLanguage,
            selectedActions: selectedActionsForPanel,
            primaryDriverKey: transportScenarioTarget,
            cascadeEventsA,
            cascadeEventsB,
            primaryPropagationSignatureA: getPrimaryPropagationSignature(cascadeEventsA),
            primaryPropagationSignatureB: getPrimaryPropagationSignature(cascadeEventsB),
          })?.primaryDriver ?? null,
          uiLanguage,
          undefined,
          undefined
        ).events
      : [];
  const scenarioTargetDriverEvents =
    caseType === "transport"
      ? [
          ...buildDomainPropagationEvents(
            resolveTransportInspectorContext({
              language: uiLanguage,
              selectedActions: selectedActionsForPanel,
              primaryDriverKey: transportScenarioTarget,
              cascadeEventsA,
              cascadeEventsB,
              primaryPropagationSignatureA: getPrimaryPropagationSignature(cascadeEventsA),
              primaryPropagationSignatureB: getPrimaryPropagationSignature(cascadeEventsB),
            })?.primaryDriver ?? null,
            uiLanguage,
            undefined,
            undefined
          ).events,
          ...buildScenarioTargetPolicyEvents(
            transportScenarioTarget,
            uiLanguage
          ),
        ]
      : [];
  const systemStatusCascadeChainText =
    caseType === "transport"
      ? transportContext?.propagationChainLabel ?? null
      : null;
  const diffSeries = marginHistoryB.map(
    (v, index) => v - (marginHistoryA[index] ?? v)
  );
  const firstDivergenceMonth =
    diffSeries?.findIndex((v) => Math.abs(v) > 0.01) ?? null;

  const baselineA = marginHistoryA.length > 0 ? marginHistoryA[0] : 0;
  const finalA =
    marginHistoryA.length > 0 ? marginHistoryA[marginHistoryA.length - 1] : 0;
  const baselineB = marginHistoryB.length > 0 ? marginHistoryB[0] : 0;
  const finalB =
    marginHistoryB.length > 0 ? marginHistoryB[marginHistoryB.length - 1] : 0;
  const structuralStatusA = executiveSummary
    ? executiveSummary.structuralStatusA
    : "stable";

  const THEME = {
    dark: {
      pageBg: "#0e1117",
      panelBg: "#111827",
      panelBorder: "#1F2937",
      graphBg: "#0b0f14",
      graphBorder: "#1f2937",
      text: "#E5E7EB",
      subtext: "#9CA3AF",
      buttonBg: "#111827",
      buttonBorder: "#374151",
    },
    light: {
      pageBg: "#F9FAFB",
      panelBg: "#FFFFFF",
      panelBorder: "#E5E7EB",
      graphBg: "#FFFFFF",
      graphBorder: "#E5E7EB",
      text: "#111827",
      subtext: "#6B7280",
      buttonBg: "#FFFFFF",
      buttonBorder: "#D1D5DB",
    },
  } as const;

  const theme = THEME[uiTheme];
  const t = UI_TEXT[uiLanguage];
  const pt = pulseLanguage[uiLanguage];
  const scenarioALabelText = executiveDemoMode
    ? uiLanguage === "sv"
      ? "Nuvarande strategi"
      : "Baseline"
    : uiLanguage === "sv"
      ? "Nuläge"
      : "Baseline";
  const scenarioBLabelText = executiveDemoMode
    ? uiLanguage === "sv"
      ? "Alternativ strategi"
      : "Goal strategy"
    : uiLanguage === "sv"
      ? "Målstrategi"
      : "Goal strategy";
  const scenarioStatusSuffix = uiLanguage === "sv" ? "status" : "status";
  const scenarioMarginSuffix = uiLanguage === "sv" ? "marginal" : "margin";

  const currentMarginA =
    marginHistoryA.length > 0
      ? marginHistoryA[marginHistoryA.length - 1]
      : null;

  const currentMarginB =
    marginHistoryB.length > 0
      ? marginHistoryB[marginHistoryB.length - 1]
      : null;

  const displayMarginB = useMemo(() => {
    return marginHistoryA.length > 0 && marginHistoryB.length > 0
      ? [marginHistoryA[0], ...marginHistoryB.slice(1)]
      : marginHistoryB;
  }, [marginHistoryA, marginHistoryB]);
  const scenarioLibraryForInspector = getScenarioLibrary(uiLanguage).filter((p) =>
    caseType === "real-estate"
      ? p.domain === "realEstate"
      : caseType === "transport"
        ? p.domain === "municipal"
        : true
  );
  const selectedScenarioALabel =
    scenarioLibraryForInspector.find((p) => p.id === scenarioALabel)?.label;
  const selectedScenarioBLabel =
    scenarioLibraryForInspector.find((p) => p.id === scenarioBLabel)?.label;

  const showBaselineOnly = marginHistoryB.length === 0;
  const pilotCase =
    selectedPilotCaseId !== ""
      ? PILOT_CASES.find((c) => c.id === selectedPilotCaseId) ?? null
      : null;
  const caseAName: string | null = null;
  const caseBName: string | null = pilotCase?.title ?? null;
  const graphTitle =
    caseAName && caseBName
      ? `${caseAName} vs ${caseBName}`
      : caseBName
      ? `Baseline vs ${caseBName}`
      : undefined;

  function getSystemStatus(margin: number | null): string {
    if (margin == null) return "IDLE";
    if (margin >= 1.0) return "ROBUST";
    if (margin >= EXEC_SUSTAIN_THRESHOLD) return "SUSTAINABLE";
    if (margin >= EXEC_COLLAPSE_THRESHOLD) return "STRUCTURAL_EROSION";
    return "FAILURE";
  }

  function getSystemStatusLabel(status: string): string {
    switch (status) {
      case "ROBUST":
        return pt.robust;
      case "SUSTAINABLE":
        return pt.sustainable;
      case "STRUCTURAL_EROSION":
        return pt.structuralErosion;
      case "FAILURE":
        return pt.collapseZone;
      default:
        return "IDLE";
    }
  }

  function getSystemStatusColor(status: string): string {
    switch (status) {
      case "ROBUST":
        return "#22c55e";
      case "SUSTAINABLE":
        return "#2563eb";
      case "STRUCTURAL_EROSION":
        return "#f97316";
      case "FAILURE":
        return "#ef4444";
      default:
        return "#9CA3AF";
    }
  }

  const currentStatusA = getSystemStatus(currentMarginA);
  const currentStatusB = getSystemStatus(currentMarginB);
  const labelA = getSystemStatusLabel(currentStatusA);
  const labelB = getSystemStatusLabel(currentStatusB);
  const colorA = getSystemStatusColor(currentStatusA);
  const colorB = getSystemStatusColor(currentStatusB);

  const structuralStatusKey = executiveSummary
    ? executiveSummary.structuralStatusB
    : "stable";

  const interpretation = executiveSummary
    ? (() => {
        const deltaSentence = t.common.deltaSentence(executiveSummary.deltaMargin);
        return structuralStatusKey === "structural_collapse"
          ? t.common.interpretation.structural_collapse(deltaSentence)
          : structuralStatusKey === "structural_breakdown"
          ? t.common.interpretation.marginal_exceedance(deltaSentence)
          : structuralStatusKey === "marginal_exceedance"
          ? t.common.interpretation.marginal_exceedance(deltaSentence)
          : structuralStatusKey === "functioning_but_doomed"
          ? t.common.interpretation.functioning_but_doomed(deltaSentence)
          : t.common.interpretation.stable(deltaSentence);
      })()
    : "";

  const narrativeText = executiveSummary
    ? (() => {
        const deltaStr = executiveSummary.deltaMargin.toFixed(2);
        const statusStr = t.structuralStatus[structuralStatusKey];
        const tippingQ = executiveSummary.tippingStep
          ? `M${executiveSummary.tippingStep}`
          : "";
        return executiveSummary.tippingStep
          ? t.common.narrative.withTipping(deltaStr, statusStr, tippingQ)
          : t.common.narrative.noTipping(deltaStr, statusStr);
      })()
    : "";

  const displayInterpretation = executiveDemoMode
    ? surfaceOrgDemoText(interpretation, uiLanguage)
    : interpretation;
  const displayNarrativeText = executiveDemoMode
    ? surfaceOrgDemoText(narrativeText, uiLanguage)
    : narrativeText;

  const expertMinimumMargin = executiveSummary?.minimumMargin ?? null;
  const expertSteps = Math.max(marginHistoryA.length, marginHistoryB.length);
  const expertTippingStep = executiveSummary?.tippingStep ?? null;

  const activeCascadeEvents =
    editableScenario === "B"
      ? cascadeEventsB
      : cascadeEventsA;
  const cascadeEvents =
    cascadeEventsB.length > 0 ? cascadeEventsB : cascadeEventsA;
  const firstSystemStatusCascadeEvent = cascadeEvents[0] as
    | (CascadeEvent & { sourceRiskLabel?: string })
    | undefined;
  const firstSystemStatusCascadeEventB = cascadeEventsB[0] as
    | (CascadeEvent & { sourceRiskLabel?: string })
    | undefined;
  const firstSystemStatusCascadeEventA = cascadeEventsA[0] as
    | (CascadeEvent & { sourceRiskLabel?: string })
    | undefined;
  const systemStatusPrimaryDriver =
    primaryDriver ??
    firstSystemStatusCascadeEvent?.sourceRiskLabel ??
    firstSystemStatusCascadeEvent?.sourceRisk ??
    firstSystemStatusCascadeEventB?.sourceRiskLabel ??
    firstSystemStatusCascadeEventB?.sourceRisk ??
    firstSystemStatusCascadeEventA?.sourceRiskLabel ??
    firstSystemStatusCascadeEventA?.sourceRisk ??
    null;
  const pageExecDemoRiskLabels =
    executiveDemoMode && caseType === "real-estate"
      ? ({ executiveDemo: true } as const)
      : undefined;
  const systemStatusPrimaryDriverLabel = systemStatusPrimaryDriver
    ? caseType === "transport"
      ? getTransportPolicyExplanationLabel(systemStatusPrimaryDriver, uiLanguage)
      : mapRiskLabelToPolicyLabel(systemStatusPrimaryDriver, uiLanguage, pageExecDemoRiskLabels)
    : null;
  const resolvedSystemStatusPrimaryDriver =
    caseType === "real-estate"
      ? mapRiskLabelToPolicyLabel(
          systemStatusPrimaryDriver ??
            firstSystemStatusCascadeEventB?.sourceRiskLabel ??
            firstSystemStatusCascadeEventA?.sourceRiskLabel ??
            "",
          uiLanguage,
          pageExecDemoRiskLabels
        ) || null
      : systemStatusPrimaryDriverLabel;
  const systemStatusPrimaryDriverDisplayText =
    caseType === "real-estate"
      ? resolvedSystemStatusPrimaryDriver
        ? uiLanguage === "sv"
          ? `${resolvedSystemStatusPrimaryDriver} påverkar utvecklingen tidigt`
          : `${resolvedSystemStatusPrimaryDriver} influences development early`
        : "—"
      : systemStatusPrimaryDriverLabel ?? "—";

  const driverLabels = (pt as any).driverLabels ?? {};
  const riskLabels = (pt as any).riskLabels ?? {};
  const getRiskLabel = (key: string) =>
    driverLabels[key] ??
    riskLabels[key] ??
    EVENT_TRANSLATIONS[key as keyof typeof EVENT_TRANSLATIONS]?.[uiLanguage] ??
    key;

  const cascadeDepth = activeCascadeEvents.length;
  const systemPressure =
    cascadeDepth <= 1
      ? "LOW"
      : cascadeDepth <= 3
      ? "MODERATE"
      : cascadeDepth <= 5
      ? "HIGH"
      : "SYSTEMIC";

  let sustainBreachStep: number | null = null;
  let collapseBreachStep: number | null = null;
  for (let i = 0; i < marginHistoryB.length; i++) {
    if (sustainBreachStep == null && marginHistoryB[i] <= EXEC_SUSTAIN_THRESHOLD) {
      sustainBreachStep = i + 1;
    }
    if (collapseBreachStep == null && marginHistoryB[i] <= EXEC_COLLAPSE_THRESHOLD) {
      collapseBreachStep = i + 1;
    }
  }

  let estimatedTimeToBreachA: number | null = null;
  if (marginHistoryA.length >= 4) {
    const n = marginHistoryA.length;
    const m0 = marginHistoryA[n - 4];
    const m3 = marginHistoryA[n - 1];
    const avgRate = (m3 - m0) / 3;
    if (avgRate < -1e-6 && m3 > EXEC_SUSTAIN_THRESHOLD) {
      const remaining = (m3 - EXEC_SUSTAIN_THRESHOLD) / -avgRate;
      estimatedTimeToBreachA = Math.max(0, Math.round(remaining));
    }
  }

  let estimatedTimeToBreachB: number | null = null;
  if (marginHistoryB.length >= 4) {
    const n = marginHistoryB.length;
    const m0 = marginHistoryB[n - 4];
    const m3 = marginHistoryB[n - 1];
    const avgRate = (m3 - m0) / 3;
    if (avgRate < -1e-6 && m3 > EXEC_SUSTAIN_THRESHOLD) {
      const remaining = (m3 - EXEC_SUSTAIN_THRESHOLD) / -avgRate;
      estimatedTimeToBreachB = Math.max(0, Math.round(remaining));
    }
  }

  let estimatedTimeToBreach: number | null = estimatedTimeToBreachB;

  let breachDifference: number | null = null;
  if (
    estimatedTimeToBreachA !== null &&
    estimatedTimeToBreachB !== null
  ) {
    breachDifference = estimatedTimeToBreachB - estimatedTimeToBreachA;
  }

  const activeMarginHistory =
    editableScenario === "B"
      ? marginHistoryB
      : marginHistoryA;
  const marginTrend: "declining" | "stable" | "improving" =
    activeMarginHistory.length >= 2
      ? (() => {
          const start = activeMarginHistory[0];
          const end = activeMarginHistory[activeMarginHistory.length - 1];
          const delta = end - start;
          if (delta < -1e-3) return "declining";
          if (delta > 1e-3) return "improving";
          return "stable";
        })()
      : "stable";

  const cascadeDelaySteps =
    cascadeEventsA.length > 0 ? (cascadeEventsA[0].delaySteps ?? 1) : 1;

  const decisionFlowEvents: { id: string; time: string; text: string }[] = [];
  const scenarioEventsForFlow =
    Math.max(marginHistoryA.length, marginHistoryB.length) > 0
      ? [
          {
            quarter: 1,
            type: "Maintenance deferred",
          },
          {
            quarter:
              tippingMarginIndexB != null ? tippingMarginIndexB + 1 : 0,
            type: "Capital constraint activated",
          },
        ].filter(
          (e) =>
            e.quarter > 0 &&
            e.quarter <= Math.max(
              marginHistoryA.length,
              marginHistoryB.length
            )
        )
      : [];

  for (const e of scenarioEventsForFlow) {
    const label =
      EVENT_TRANSLATIONS[e.type as keyof typeof EVENT_TRANSLATIONS]?.[
        uiLanguage
      ] ?? e.type;
    decisionFlowEvents.push({
      id: `scenario-${e.quarter}-${e.type}`,
      time: `M${e.quarter}`,
      text: label,
    });
  }

  if (tippingMarginIndexB != null) {
    decisionFlowEvents.push({
      id: "tipping",
      time: `M${tippingMarginIndexB + 1}`,
      text:
        uiLanguage === "sv"
          ? "Strukturell tippingpunkt detekterad"
          : "Structural tipping point detected",
    });
  }

  // Add cascade events to the decision flow (delayed after decision)
  const decisionTimeForCascade = 1; // scenario/decision at Q1
  const allCascadeEvents = [...cascadeEventsA, ...cascadeEventsB];
  if (allCascadeEvents.length > 0) {
    const seenPairs = new Set<string>();
    for (const e of allCascadeEvents) {
      const pairKey = `${e.sourceRisk}->${e.targetRisk}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const delaySteps = e.delaySteps ?? 1;
      const cascadeTime = decisionTimeForCascade + delaySteps;
      decisionFlowEvents.push({
        id: `cascade-${pairKey}`,
        time: `M${cascadeTime}`,
        text: `${getRiskLabel(e.sourceRisk)} → ${getRiskLabel(e.targetRisk)}`,
      });
    }
  }

  const sortedDecisionFlowEvents = [...decisionFlowEvents].sort((a, b) => {
    const ta = parseInt(a.time.replace(/^Q/, ""), 10) || 0;
    const tb = parseInt(b.time.replace(/^Q/, ""), 10) || 0;
    return ta - tb;
  });

  // ==================================================
  // 6️⃣ UI
  // ==================================================

  const executiveScenarioComparisonStrip = executiveDemoMode
    ? getExecutiveDemoScenarioComparisonStrip(uiLanguage)
    : null;

  const execRealEstateLayout = executiveDemoMode && caseType === "real-estate";

  return (
    <div
      style={{
        pointerEvents: "auto",
        width: "100%",
        maxWidth: "100%",
        marginLeft: "0",
        marginRight: "0",
        background: theme.pageBg,
        paddingLeft: execRealEstateLayout
          ? "clamp(20px, 3vw, 36px)"
          : executiveDemoMode
            ? "10px"
            : "24px",
        paddingRight: execRealEstateLayout
          ? "clamp(20px, 3vw, 36px)"
          : executiveDemoMode
            ? "10px"
            : "24px",
        ...(execRealEstateLayout
          ? {
              minHeight: "100dvh",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }
          : {}),
      }}
    >
      <div
        style={{
          padding: execRealEstateLayout
            ? "4px 0 11px"
            : executiveDemoMode
              ? "3px 10px 3px"
              : "32px",
          background: theme.pageBg,
          color: theme.text,
          ...(execRealEstateLayout
            ? {
                flex: "1 1 auto",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }
            : {}),
        }}
      >
        {executiveDemoMode ? (
          <div
            style={{
              marginBottom: execRealEstateLayout ? "15px" : "2px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: execRealEstateLayout ? "10px" : "6px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                flex: execRealEstateLayout ? "1 1 min(1400px, 100%)" : "1 1 min(560px, 100%)",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: execRealEstateLayout ? "9.5px" : "9px",
                  letterSpacing: execRealEstateLayout ? "0.12em" : "0.08em",
                  color: theme.subtext,
                  marginBottom: execRealEstateLayout ? "7px" : "2px",
                  textTransform: "uppercase",
                  fontWeight: execRealEstateLayout ? 600 : 400,
                }}
              >
                {getExecutiveDemoHero(uiLanguage).eyebrow}
              </div>
              <h1
                style={{
                  fontSize: execRealEstateLayout ? "18px" : "15px",
                  fontWeight: 700,
                  margin: execRealEstateLayout ? "0 0 10px 0" : "0 0 2px 0",
                  lineHeight: execRealEstateLayout ? 1.08 : 1.12,
                  color: theme.text,
                  letterSpacing: execRealEstateLayout ? "-0.028em" : undefined,
                }}
              >
                {getExecutiveDemoHero(uiLanguage).title}
              </h1>
              <p
                style={{
                  fontSize: execRealEstateLayout ? "12px" : "11px",
                  margin: execRealEstateLayout ? "0 0 5px 0" : "0 0 2px 0",
                  color: theme.text,
                  lineHeight: execRealEstateLayout ? 1.32 : 1.26,
                  fontWeight: 600,
                  maxWidth: execRealEstateLayout ? "min(1280px, 96%)" : "920px",
                }}
              >
                {getExecutiveDemoHero(uiLanguage).problemStatement}
              </p>
              <p
                style={{
                  fontSize: execRealEstateLayout ? "11px" : "10px",
                  margin: execRealEstateLayout ? "5px 0 0 0" : "0 0 1px 0",
                  color: theme.subtext,
                  lineHeight: execRealEstateLayout ? 1.38 : 1.28,
                  maxWidth: execRealEstateLayout ? "min(1240px, 94%)" : "920px",
                }}
              >
                {getExecutiveDemoHero(uiLanguage).subtitle}{" "}
                <span style={{ color: theme.subtext, opacity: 0.9 }}>
                  {getExecutiveDemoHero(uiLanguage).valueLine}
                </span>
              </p>
              {!execRealEstateLayout && (
              <p
                style={{
                  margin: execRealEstateLayout ? "1px 0 0" : "2px 0 0",
                  fontSize: "9.5px",
                  color: theme.subtext,
                  lineHeight: execRealEstateLayout ? 1.25 : 1.3,
                }}
              >
                <span style={{ fontWeight: 700, color: "#93c5fd" }}>
                  {uiLanguage === "sv" ? "Spår:" : "Preset:"}
                </span>{" "}
                {getExecutiveDemoPlaybackPresetTitle(uiLanguage)}
              </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: execRealEstateLayout ? "6px" : "6px",
                justifyContent: "flex-end",
                alignItems: "flex-start",
                flexShrink: 0,
                paddingTop: execRealEstateLayout ? "2px" : undefined,
                opacity: execRealEstateLayout ? 0.62 : 1,
              }}
            >
              <button
                type="button"
                onClick={() => setUiLanguage((l) => (l === "sv" ? "en" : "sv"))}
                style={{
                  borderRadius: "5px",
                  cursor: "pointer",
                  ...(execRealEstateLayout
                    ? {
                        padding: "4px 8px",
                        fontSize: "10px",
                        color: "#94a3b8",
                        border: "1px solid rgba(55,65,81,0.45)",
                        background: "rgba(15,23,42,0.55)",
                      }
                    : {
                        padding: "5px 9px",
                        fontSize: "11px",
                        border: "1px solid #374151",
                        background: "#111827",
                        color: "#E5E7EB",
                      }),
                }}
              >
                {uiLanguage === "sv" ? "SV" : "EN"}
              </button>
              <button
                type="button"
                onClick={() => setUiTheme((t) => (t === "dark" ? "light" : "dark"))}
                style={{
                  borderRadius: "5px",
                  cursor: "pointer",
                  ...(execRealEstateLayout
                    ? {
                        padding: "4px 8px",
                        fontSize: "10px",
                        color: "#94a3b8",
                        border: "1px solid rgba(55,65,81,0.45)",
                        background: "rgba(15,23,42,0.55)",
                      }
                    : {
                        padding: "5px 9px",
                        fontSize: "11px",
                        border: "1px solid #374151",
                        background: "#111827",
                        color: "#E5E7EB",
                      }),
                }}
              >
                {uiTheme === "dark" ? "Theme: Dark" : "Theme: Light"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUiMode((m) => (m === "executive" ? "expert" : "executive"));
                }}
                style={{
                  borderRadius: "5px",
                  cursor: "pointer",
                  ...(execRealEstateLayout
                    ? {
                        padding: "4px 8px",
                        fontSize: "10px",
                        color: "#94a3b8",
                        border: "1px solid rgba(55,65,81,0.45)",
                        background: "rgba(15,23,42,0.55)",
                      }
                    : {
                        padding: "5px 9px",
                        fontSize: "11px",
                        border: "1px solid #374151",
                        background: "#111827",
                        color: "#E5E7EB",
                      }),
                }}
              >
                {uiMode === "executive" ? pt.expertMode : pt.executiveMode}
              </button>
              <button
                type="button"
                onClick={() => setExecutiveDemoMode((v) => !v)}
                style={{
                  borderRadius: "5px",
                  cursor: "pointer",
                  ...(execRealEstateLayout
                    ? {
                        padding: "4px 8px",
                        fontSize: "10px",
                        color: "#a8b4c4",
                        border: "1px solid rgba(59,130,246,0.32)",
                        background: "rgba(30,58,95,0.35)",
                      }
                    : {
                        padding: "5px 9px",
                        fontSize: "11px",
                        border: "1px solid #3b82f6",
                        background: "#1e3a5f",
                        color: "#E5E7EB",
                      }),
                }}
                title={pt.executiveDemoPresentationExit}
              >
                {pt.executiveDemoPresentationExit}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: "22px", marginBottom: "24px" }}>
              {pt.pilotDomainTitle[domain]} — {pt.pilotPageTitleSuffix}
            </h1>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setUiLanguage((l) => (l === "sv" ? "en" : "sv"))}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "#E5E7EB",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {uiLanguage === "sv" ? "SV" : "EN"}
              </button>
              <button
                type="button"
                onClick={() => setUiTheme((t) => (t === "dark" ? "light" : "dark"))}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "#E5E7EB",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {uiTheme === "dark" ? "Theme: Dark" : "Theme: Light"}
              </button>
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "#E5E7EB",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Help
              </button>
              <button
                type="button"
                onClick={() => {
                  setUiMode((m) => (m === "executive" ? "expert" : "executive"));
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #374151",
                  background: "#111827",
                  color: "#E5E7EB",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {uiMode === "executive" ? pt.expertMode : pt.executiveMode}
              </button>
              <button
                type="button"
                onClick={() => setExecutiveDemoMode((v) => !v)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: executiveDemoMode ? "1px solid #3b82f6" : "1px solid #374151",
                  background: executiveDemoMode ? "#1e3a5f" : "#111827",
                  color: "#E5E7EB",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
                title={executiveDemoMode ? pt.executiveDemoPresentationExit : pt.executiveDemoPresentation}
              >
                {executiveDemoMode ? pt.executiveDemoPresentationExit : pt.executiveDemoPresentation}
              </button>
            </div>
          </>
        )}
      <div
        style={{
          marginBottom:
            executiveDemoMode
              ? execRealEstateLayout
                ? "8px"
                : "3px"
              : "16px",
          paddingTop: executiveDemoMode && execRealEstateLayout ? "10px" : undefined,
          borderTop:
            executiveDemoMode && execRealEstateLayout
              ? "1px solid rgba(148,163,184,0.14)"
              : undefined,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: executiveDemoMode ? (execRealEstateLayout ? "8px" : "5px") : "8px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: executiveDemoMode ? (execRealEstateLayout ? "7px" : "6px") : "12px",
            flexWrap: "wrap",
          }}
        >
          {!executiveDemoMode && (
            <>
              <label style={{ fontSize: "13px", marginRight: "6px", color: theme.subtext }}>Case</label>
              <select
                value={selectedPilotCaseId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedPilotCaseId(id);
                  setSimulationSource("case");
                  if (id === "") return;
                  const pilotCase = PILOT_CASES.find((c) => c.id === id);
                  if (pilotCase) {
                    setBaseRiskStateA(structuredClone(pilotCase.riskStateA));
                    setBaseRiskStateB(structuredClone(pilotCase.riskStateB));
                    setRiskStateA(structuredClone(pilotCase.riskStateA));
                    setRiskStateB(structuredClone(pilotCase.riskStateB));
                    setDriverScoresA(buildDriverScoreState(pilotCase.riskStateA));
                    setDriverScoresB(buildDriverScoreState(pilotCase.riskStateB));
                    setSelectedActionsA([]);
                    setSelectedActionsB([]);
                    setIsDirty(true);
                    setHasSimulationCompleted(false);
                    setIsRunning(false);
                    resetRunState();
                  }
                }}
                style={{
                  background: "#0e1117",
                  color: "#e6edf3",
                  border: "1px solid #2f333a",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "13px",
                  marginRight: "16px",
                }}
              >
                <option value="">Custom</option>
                {visiblePilotCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {CASE_TRANSLATIONS[c.title as keyof typeof CASE_TRANSLATIONS]?.[uiLanguage] ?? c.title}
                  </option>
                ))}
              </select>
            </>
          )}
          <label
            style={{
              fontSize: executiveDemoMode ? "11px" : "13px",
              marginRight: executiveDemoMode ? "4px" : "6px",
              color: theme.subtext,
            }}
          >
            {executiveDemoMode
              ? getExecutiveDemoGoalPickerLabel(uiLanguage)
              : uiLanguage === "sv"
                ? "Mål:"
                : "Goal:"}
          </label>
          <select
            value={selectedGoal}
            onChange={(e) => setSelectedGoal(e.target.value as any)}
            className={
              executiveDemoMode
                ? "px-1.5 py-0.5 text-[11px] rounded border bg-gray-800 text-gray-200"
                : "px-2 py-1 rounded border bg-gray-800 text-gray-200"
            }
          >
            <option value="accessibility">
              {executiveDemoMode
                ? getExecutiveDemoGoalOptionLabel("accessibility", uiLanguage)
                : resolveTopLevelGoalLabel("accessibility", caseType)}
            </option>
            <option value="congestion">
              {executiveDemoMode
                ? getExecutiveDemoGoalOptionLabel("congestion", uiLanguage)
                : resolveTopLevelGoalLabel("congestion", caseType)}
            </option>
            <option value="margin_stability">
              {executiveDemoMode
                ? getExecutiveDemoGoalOptionLabel("margin_stability", uiLanguage)
                : resolveTopLevelGoalLabel("margin_stability", caseType)}
            </option>
            <option value="avoid_tipping">
              {executiveDemoMode
                ? getExecutiveDemoGoalOptionLabel("avoid_tipping", uiLanguage)
                : resolveTopLevelGoalLabel("avoid_tipping", caseType)}
            </option>
          </select>
          <button
            type="button"
            className={activeScenario === "A" ? "active-button" : ""}
            onClick={() => {
              setShowA(true);
              setShowB(false);
              setActiveScenario("A");
            }}
            style={{
              padding: executiveDemoMode ? "5px 11px" : "8px 16px",
              fontSize: executiveDemoMode ? "11px" : undefined,
              background: showA && !showB ? "#2f333a" : "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: executiveDemoMode ? "5px" : "6px",
              color: "#e6edf3",
              cursor: "pointer",
            }}
          >
            {scenarioALabelText}
          </button>
          <button
            type="button"
            className={activeScenario === "B" ? "active-button" : ""}
            onClick={() => {
              setShowA(false);
              setShowB(true);
              setActiveScenario("B");
            }}
            style={{
              padding: executiveDemoMode ? "5px 11px" : "8px 16px",
              fontSize: executiveDemoMode ? "11px" : undefined,
              background: showB && !showA ? "#2f333a" : "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: executiveDemoMode ? "5px" : "6px",
              color: "#e6edf3",
              cursor: "pointer",
            }}
          >
            {scenarioBLabelText}
          </button>
          <button
            type="button"
            className={activeScenario === "BOTH" ? "active-button" : ""}
            onClick={() => {
              setShowA(true);
              setShowB(true);
              setActiveScenario("BOTH");
            }}
            style={{
              padding: executiveDemoMode ? "5px 11px" : "8px 16px",
              fontSize: executiveDemoMode ? "11px" : undefined,
              background: showA && showB ? "#2f333a" : "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: executiveDemoMode ? "5px" : "6px",
              color: "#e6edf3",
              cursor: "pointer",
            }}
          >
            {pulseLanguage[uiLanguage].both}
          </button>
          {!executiveDemoMode && (
            <>
              <button
                type="button"
                onClick={freezeScenarioA}
                style={{
                  padding: "8px 16px",
                  background: "#1a1a1a",
                  border: "1px solid #2f333a",
                  borderRadius: "6px",
                  color: "#e6edf3",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      opacity: freezeFlash === "A" ? 0.6 : 1,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {freezeFlash === "A" ? "✓" : "✚"}
                  </span>
                  {`${uiLanguage === "sv" ? "Frys" : "Freeze"} ${scenarioALabelText}`}
                </span>
              </button>
              <button
                type="button"
                onClick={freezeScenarioB}
                style={{
                  padding: "8px 16px",
                  background: "#1a1a1a",
                  border: "1px solid #2f333a",
                  borderRadius: "6px",
                  color: "#e6edf3",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      opacity: freezeFlash === "B" ? 0.6 : 1,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {freezeFlash === "B" ? "✓" : "✚"}
                  </span>
                  {`${uiLanguage === "sv" ? "Frys" : "Freeze"} ${scenarioBLabelText}`}
                </span>
              </button>
            </>
          )}
          <button
            type="button"
            disabled={isRunning}
            onClick={() => {
              startSimulation("manual", riskStateA, riskStateB);
            }}
            style={{
              padding: executiveDemoMode ? "5px 11px" : "8px 16px",
              fontSize: executiveDemoMode ? "11px" : undefined,
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: executiveDemoMode ? "5px" : "6px",
              color: "#e6edf3",
              cursor: isRunning ? "not-allowed" : "pointer",
            }}
          >
            Start
          </button>
          <button
            type="button"
            disabled={!isRunning}
            onClick={() => {
              cancelPlayback();
              setHasSimulationCompleted(true);
              setIsRunning(false);
              if (marginHistoryA.length > 0 && marginHistoryB.length > 0) {
                const summary = calculateExecutiveSummary({
                  marginSeriesA: marginHistoryA,
                  marginSeriesB: marginHistoryB,
                  tippingThreshold: EXEC_TIPPING_THRESHOLD,
                  sustainThreshold: EXEC_SUSTAIN_THRESHOLD,
                  collapseThreshold: EXEC_COLLAPSE_THRESHOLD,
                  tippingStepB: tippingMarginIndexB != null ? tippingMarginIndexB + 1 : null,
                });
                setExecutiveSummary(summary);
              } else {
                setExecutiveSummary(null);
              }
            }}
            style={{
              padding: executiveDemoMode ? "5px 11px" : "8px 16px",
              fontSize: executiveDemoMode ? "11px" : undefined,
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: executiveDemoMode ? "5px" : "6px",
              color: "#e6edf3",
              cursor: !isRunning ? "not-allowed" : "pointer",
            }}
          >
            Stop
          </button>
          <button
            type="button"
            onClick={() => {
              setHasSimulationCompleted(false);
              setIsRunning(false);
              resetRunState();
              setIsDirty(true);

              const caseId = selectedPilotCaseId;

              if (!caseId) {
                // Reset to engine baseline (all MODERATE), matching initial load
                setBaseRiskStateA(structuredClone(defaultRiskState));
                setBaseRiskStateB(structuredClone(defaultRiskState));
                setRiskStateA(structuredClone(defaultRiskState));
                setRiskStateB(structuredClone(defaultRiskState));
                setDriverScoresA(buildDriverScoreState(defaultRiskState));
                setDriverScoresB(buildDriverScoreState(defaultRiskState));
              } else {
                const pilotCase = PILOT_CASES.find((c) => c.id === caseId);
                if (pilotCase) {
                  setBaseRiskStateA(structuredClone(pilotCase.riskStateA));
                  setBaseRiskStateB(structuredClone(pilotCase.riskStateB));
                  setRiskStateA(structuredClone(pilotCase.riskStateA));
                  setRiskStateB(structuredClone(pilotCase.riskStateB));
                  setDriverScoresA(buildDriverScoreState(pilotCase.riskStateA));
                  setDriverScoresB(buildDriverScoreState(pilotCase.riskStateB));
                }
              }
              setSelectedActionsA([]);
              setSelectedActionsB([]);
              setScenarioPromptA("");
              setScenarioPromptB("");
              setScenarioALabel("");
              setScenarioBLabel("");
              setIsDirty(false);
              setShowHelp(false);
            }}
            style={{
              padding: executiveDemoMode ? "5px 11px" : "8px 16px",
              fontSize: executiveDemoMode ? "11px" : undefined,
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: executiveDemoMode ? "5px" : "6px",
              color: "#e6edf3",
              cursor: "pointer",
            }}
          >
            {pulseLanguage[uiLanguage].reset}
          </button>
          {execRealEstateLayout && (
            <div
              className="shrink-0 flex items-center gap-1.5 rounded-full border border-slate-600/65 bg-slate-900/75 px-2.5 py-1 max-h-[38px] max-w-[258px]"
              role="note"
              title={`${getExecutiveDemoPlaybackPresetTitle(uiLanguage)} — ${getExecutiveDemoPlaybackInitiativesNote(uiLanguage)}`}
            >
              <span className="shrink-0 rounded-sm border border-sky-900/60 bg-blue-950/80 px-[5px] py-[1px] text-[7.5px] font-bold uppercase tracking-wider text-sky-300">
                Demo
              </span>
              <div className="min-w-0 overflow-hidden leading-tight">
                <div className="truncate text-[9.5px] font-semibold text-slate-100">
                  {getExecutiveDemoPlaybackPresetTitle(uiLanguage)}
                </div>
                <div className="truncate text-[8px] text-slate-500">
                  {getExecutiveDemoPlaybackInitiativesNote(uiLanguage)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showHelp && !executiveDemoMode && (
        <div
          style={{
            marginBottom: "12px",
            padding: "18px 20px",
            borderRadius: "8px",
            background: "#0f172a",
            border: "1px solid #374151",
            fontSize: "13px",
            lineHeight: "1.65",
            color: "#E5E7EB",
          }}
        >
          <h3 style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700 }}>
            {pt.helpTitle}
          </h3>

          <ol style={{ margin: "8px 0", paddingLeft: "20px" }}>
            <li style={{ marginBottom: "8px" }}>{pt.helpStep1}</li>
            <li style={{ marginBottom: "8px" }}>{pt.helpStep2}</li>
            <li style={{ marginBottom: "10px" }}>{pt.helpStep3}</li>
          </ol>

          <p style={{ margin: "10px 0 8px" }}>{pt.helpZonesTitle}</p>

          <ul style={{ margin: "0 0 10px", paddingLeft: "20px" }}>
            <li style={{ marginBottom: "6px" }}>{pt.helpZoneRobust}</li>
            <li style={{ marginBottom: "6px" }}>{pt.helpZoneSustainable}</li>
            <li style={{ marginBottom: "6px" }}>{pt.helpZoneErosion}</li>
            <li style={{ marginBottom: "6px" }}>{pt.helpZoneCollapse}</li>
          </ul>

          <ol start={5} style={{ margin: "8px 0 0", paddingLeft: "20px" }}>
            <li style={{ marginBottom: "8px" }}>{pt.helpStep5}</li>
            <li>{pt.helpStep6}</li>
          </ol>
        </div>
      )}
      {!executiveDemoMode &&
        selectedPilotCaseId &&
        PILOT_CASES.find((c) => c.id === selectedPilotCaseId) && (
        <div style={{ marginBottom: "12px", fontSize: "12px", color: "#9ca3af" }}>
          {PILOT_CASES.find((c) => c.id === selectedPilotCaseId)?.oneLiner}
        </div>
      )}

      {!executiveDemoMode && isDirty && (
        <div style={{ marginBottom: "12px", fontSize: "13px", color: "#9ca3af" }}>
          {pt.actionNeedsStart}
        </div>
      )}

      <div
        style={{
          marginTop: execRealEstateLayout ? "0px" : executiveDemoMode ? "-1px" : "24px",
          display: "grid",
          gridTemplateColumns: execRealEstateLayout
            ? "minmax(0, 1fr)"
            : executiveDemoMode
              ? "minmax(0, 1fr) minmax(146px, 184px)"
              : "minmax(0, 420px) minmax(0, 1fr)",
          gap: executiveDemoMode ? (execRealEstateLayout ? "16px" : "7px") : "24px",
          alignItems: "start",
          minWidth: 0,
          maxWidth: "100%",
          overflowX: "hidden",
          ...(execRealEstateLayout
            ? { flex: "1 1 auto", minHeight: "min(63dvh, 1040px)" }
            : {}),
        }}
      >
        {!(executiveDemoMode && execRealEstateLayout) && (
        <div
          style={{
            position: "sticky",
            top: executiveDemoMode ? "6px" : "16px",
            minWidth: 0,
            maxWidth: "100%",
            gridColumn: executiveDemoMode ? "2 / 3" : "1 / 2",
          }}
        >
          <div
            style={{
              marginBottom: executiveDemoMode ? (execRealEstateLayout ? "0px" : "3px") : "24px",
            }}
          >
            {executiveDemoMode ? (
              <div
                className="rounded-md border border-slate-600/70 bg-slate-900/60 px-2 py-1 text-gray-200"
              >
                <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 mb-0">
                  {uiLanguage === "sv" ? "Demo" : "Demo"}
                </div>
                <div className="text-[11px] font-medium text-slate-100 leading-snug">
                  {getExecutiveDemoPlaybackPresetTitle(uiLanguage)}
                </div>
                <p className="text-[9px] text-slate-500 leading-snug m-0 mt-1">
                  {getExecutiveDemoPlaybackInitiativesNote(uiLanguage)}
                </p>
              </div>
            ) : (
              <ActionPanel
                language={uiLanguage}
                domain={domain}
                selectedActionsA={selectedActionsA}
                selectedActionsB={selectedActionsB}
                strategyView={strategyView}
                strategyColors={strategyColors}
                applyAction={applyAction}
                executiveDemoMode={executiveDemoMode}
              />
            )}
            {!executiveDemoMode &&
              Object.entries(groupedParameters).map(([groupName, params]) => (
                <div
                  key={groupName}
                  style={{
                    marginBottom: "24px",
                    padding: "16px",
                    background: "#1a1a1a",
                    border: "1px solid #2f333a",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    {groupName}
                  </div>
                  {params.map((param) => {
                    const isGoalRelevant =
                      selectedGoal &&
                      goalRelevantDrivers[selectedGoal]?.includes(param.key);

                    return (
                      <div
                        key={param.key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px",
                          background: isGoalRelevant
                            ? "rgba(59,130,246,0.12)"
                            : "transparent",
                          borderLeft: isGoalRelevant
                            ? "3px solid #3b82f6"
                            : "3px solid transparent",
                          paddingLeft: "6px",
                        }}
                      >
                        <span style={{ fontSize: "13px" }}>
                          {pulseLanguage[uiLanguage].riskLabels[param.key] ??
                            (typeof param.label === "string"
                              ? param.label
                              : param.label[uiLanguage])}
                        </span>
                        <select
                          value={activeRiskState[param.key]}
                          disabled={!isEditableScenario}
                          onChange={(e) => {
                            handleParameterChange(param.key, e.target.value as RiskLevel);
                          }}
                          style={{
                            background: "#0e1117",
                            color: "#e6edf3",
                            border: "1px solid #2f333a",
                            borderRadius: "6px",
                            padding: "4px 8px",
                          }}
                        >
                          <option value="LOW">LOW</option>
                          <option value="MODERATE">MODERATE</option>
                          <option value="HIGH">HIGH</option>
                          <option value="SEVERE">SEVERE</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
        )}
        <div
          style={{
            minWidth: 0,
            maxWidth: "100%",
            overflowX: "hidden",
            gridColumn:
              executiveDemoMode && execRealEstateLayout
                ? "1 / -1"
                : executiveDemoMode
                  ? "1 / 2"
                  : "2 / 3",
            ...(execRealEstateLayout
              ? {
                  display: "flex",
                  flexDirection: "column",
                  flex: "1 1 auto",
                  minHeight: 0,
                }
              : {}),
          }}
        >
          {/* Impact panel – margins above graph */}
          <div
            style={{
              marginBottom: executiveDemoMode ? (execRealEstateLayout ? "6px" : "4px") : "24px",
              padding: executiveDemoMode ? (execRealEstateLayout ? "7px 14px 8px" : "4px 9px") : "16px 20px",
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: executiveDemoMode ? (execRealEstateLayout ? "12px" : "11px") : "16px",
                flexWrap: "wrap",
                alignItems: "flex-end",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: execRealEstateLayout ? "10px" : executiveDemoMode ? "9px" : "12px",
                    color: "#9CA3AF",
                  }}
                >
                  {executiveDemoMode
                    ? getExecutiveDemoMarginStripLabels(uiLanguage).scenarioA
                    : uiLanguage === "sv"
                      ? "Nuvarande strategi – marginal"
                      : "Baseline – margin"}
                </div>
                <div
                  style={{
                    fontSize: execRealEstateLayout ? "14px" : executiveDemoMode ? "13px" : "18px",
                    fontWeight: 600,
                  }}
                >
                  {stateA.margin.toFixed(5)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: execRealEstateLayout ? "10px" : executiveDemoMode ? "9px" : "12px",
                    color: "#9CA3AF",
                  }}
                >
                  {executiveDemoMode
                    ? getExecutiveDemoMarginStripLabels(uiLanguage).scenarioB
                    : uiLanguage === "sv"
                      ? "Alternativ strategi – marginal"
                      : "Goal strategy – margin"}
                </div>
                <div
                  style={{
                    fontSize: execRealEstateLayout ? "14px" : executiveDemoMode ? "13px" : "18px",
                    fontWeight: 600,
                  }}
                >
                  {stateB.margin.toFixed(5)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: execRealEstateLayout ? "10px" : executiveDemoMode ? "9px" : "12px",
                    color: "#9CA3AF",
                  }}
                >
                  {executiveDemoMode
                    ? getExecutiveDemoMarginStripLabels(uiLanguage).delta
                    : uiLanguage === "sv"
                      ? "Skillnad"
                      : "Difference"}
                </div>
                <div
                  style={{
                    fontSize: execRealEstateLayout ? "14px" : executiveDemoMode ? "13px" : "16px",
                    fontWeight: 600,
                  }}
                >
                  {(stateB.margin - stateA.margin).toFixed(5)}
                </div>
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: execRealEstateLayout ? "10px" : executiveDemoMode ? "9px" : "12px",
                  color: "#9CA3AF",
                  fontWeight: 500,
                  textAlign: "right",
                }}
              >
                {executiveDemoMode
                  ? `${getExecutiveDemoMarginStripLabels(uiLanguage).period}: M1 → M${(stateA.step ?? 0) + 1}`
                  : uiLanguage === "sv"
                    ? `Simulerad period: M1 → M${(stateA.step ?? 0) + 1}`
                    : `Simulated period: M1 → M${(stateA.step ?? 0) + 1}`}
              </div>
            </div>
          </div>

          {executiveScenarioComparisonStrip && (
              <div
                style={{
                  marginBottom: execRealEstateLayout ? "7px" : "3px",
                  display: "flex",
                  gap: execRealEstateLayout ? "8px" : "6px",
                  flexWrap: "wrap",
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    flex: "1 1 240px",
                    minWidth: 0,
                    padding: execRealEstateLayout ? "7px 9px 8px" : "5px 8px",
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 700,
                      color: "#94a3b8",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {executiveScenarioComparisonStrip.current.heading}
                  </div>
                  <p
                    style={{
                      margin: execRealEstateLayout ? "1px 0 0" : "2px 0 0",
                      color: "#e2e8f0",
                      fontSize: "10px",
                      lineHeight: execRealEstateLayout ? 1.28 : 1.3,
                    }}
                  >
                    {executiveScenarioComparisonStrip.current.bullets.join(
                      uiLanguage === "sv" ? " · " : " · "
                    )}
                  </p>
                </div>
                <div
                  style={{
                    flex: "1 1 240px",
                    minWidth: 0,
                    padding: execRealEstateLayout ? "7px 9px 8px" : "5px 8px",
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 700,
                      color: "#94a3b8",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {executiveScenarioComparisonStrip.alternative.heading}
                  </div>
                  <p
                    style={{
                      margin: execRealEstateLayout ? "1px 0 0" : "2px 0 0",
                      color: "#e2e8f0",
                      fontSize: "10px",
                      lineHeight: execRealEstateLayout ? 1.28 : 1.3,
                    }}
                  >
                    {executiveScenarioComparisonStrip.alternative.bullets.join(" · ")}
                  </p>
                </div>
              </div>
            )}

          {/* Margin trajectory graph */}
          <div
            style={{
              marginBottom: execRealEstateLayout ? "3px" : executiveDemoMode ? "5px" : "12px",
              padding: execRealEstateLayout
                ? "0 3px 0px"
                : executiveDemoMode
                  ? "5px 9px 6px"
                  : "12px 16px",
              width: "100%",
              border: `1px solid ${theme.graphBorder}`,
              borderRadius: "8px",
              background: theme.graphBg,
              position: "relative",
              cursor: isDragging ? "grabbing" : "grab",
            }}
        onMouseDown={(e) => {
          isDraggingRef.current = true;
          setIsDragging(true);
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          const clickX = e.clientX - rect.left;
          const width = rect.width;
          const raw = (clickX / width) * marginHistoryA.length;
          const q = Math.min(
            marginHistoryA.length,
            Math.max(1, Math.round(raw))
          );
          setSelectedQuarter(q);
        }}
        onMouseMove={(e) => {
          if (!isDraggingRef.current) return;
          const rect = svgRef.current?.getBoundingClientRect();
          if (!rect) return;
          const clickX = e.clientX - rect.left;
          const width = rect.width;
          const raw = (clickX / width) * marginHistoryA.length;
          const q = Math.min(
            marginHistoryA.length,
            Math.max(1, Math.round(raw))
          );
          setSelectedQuarter(q);
        }}
        onMouseUp={() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }}
      >
        <div className={executiveDemoMode ? "flex flex-col gap-0" : "flex flex-col gap-1.5"}>
          {executiveDemoMode ? (
            <>
              <div
                className={
                  execRealEstateLayout
                    ? "font-semibold text-slate-100 text-[11px] leading-tight tracking-tight"
                    : "font-semibold text-slate-100 text-[10px] leading-none tracking-tight"
                }
              >
                {getExecutiveDemoGraphFraming(uiLanguage).title}
              </div>
              {execRealEstateLayout && (
                <p
                  className="text-[9px] text-slate-400 leading-snug max-w-[52rem] mt-1 mb-0 font-medium"
                  style={{ letterSpacing: "0.01em" }}
                >
                  {getExecutiveDemoGraphFraming(uiLanguage).purposeLine}
                </p>
              )}
              <div
                className={
                  execRealEstateLayout
                    ? "text-[9.5px] text-slate-500 leading-[1.32] max-w-[52rem] mt-1"
                    : "text-[9px] text-slate-500 leading-snug max-w-3xl mt-0.5"
                }
              >
                {getExecutiveDemoGraphFraming(uiLanguage).lead}{" "}
                <span className="text-slate-600">
                  {getExecutiveDemoGraphFraming(uiLanguage).nonOptimization}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="font-medium text-slate-200 text-sm">
                {pt.transportGraphSectionTitle}
              </div>
              <div className="text-xs text-slate-500">
                {caseType === "real-estate"
                  ? `${pt.transportGraphFocusPrefix} ${pt.transportGraphFocusRealEstate}`
                  : `${pt.transportGraphFocusPrefix} ${
                      transportScenarioTarget === "avoid_tipping"
                        ? pt.transportGraphFocusTransport.avoid_tipping
                        : transportScenarioTarget === "stabilize_margin"
                        ? pt.transportGraphFocusTransport.stabilize_margin
                        : transportScenarioTarget === "reduce_capacity_pressure"
                        ? pt.transportGraphFocusTransport.reduce_capacity_pressure
                        : transportScenarioTarget === "increase_modal_attractiveness"
                        ? pt.transportGraphFocusTransport.increase_modal_attractiveness
                        : pt.transportGraphFocusTransport.default
                    }`}
              </div>

              <div className="text-xs text-slate-400 leading-relaxed max-w-xl">
                {caseType === "real-estate"
                  ? pt.transportGraphDescriptionRealEstate
                  : pt.transportGraphDescriptionTransport}
              </div>
              <button
                onClick={() => setShowDriverActivations((prev) => !prev)}
                className="text-xs text-slate-400 hover:text-slate-200"
                style={{ alignSelf: "flex-start" }}
              >
                {caseType === "real-estate"
                  ? showDriverActivations
                    ? pt.hideEarlyInfluencePoints
                    : pt.showEarlyInfluencePoints
                  : showDriverActivations
                    ? pt.hideDriverActivations
                    : pt.showDriverActivations}
              </button>
            </>
          )}
        </div>
        <MarginGraphLegendRow
          uiLanguage={uiLanguage}
          executiveDemoMode={executiveDemoMode}
          compactExecutivePresentation={executiveDemoMode && caseType === "real-estate"}
          scenarioALabelText={scenarioALabelText}
          scenarioBLabelText={scenarioBLabelText}
          selectedScenarioALabel={
            selectedScenarioALabel
              ? executiveDemoMode
                ? surfaceOrgDemoText(selectedScenarioALabel, uiLanguage)
                : selectedScenarioALabel
              : undefined
          }
          selectedScenarioBLabel={
            selectedScenarioBLabel
              ? executiveDemoMode
                ? surfaceOrgDemoText(selectedScenarioBLabel, uiLanguage)
                : selectedScenarioBLabel
              : undefined
          }
        />
        {breachDifference !== null && !executiveDemoMode && (
          <div
            style={{
              fontSize: "13px",
              color: "#374151",
              marginBottom: "6px",
              fontWeight: 500,
            }}
          >
            {breachDifference <= 0
              ? executiveDemoMode
                ? surfaceOrgDemoText(
                    pulseLanguage[uiLanguage].scenarioBDoesNotDelayBreach,
                    uiLanguage
                  )
                : pulseLanguage[uiLanguage].scenarioBDoesNotDelayBreach
              : executiveDemoMode
                ? surfaceOrgDemoText(
                    typeof pulseLanguage[uiLanguage].scenarioBDelaysBreachBy === "function"
                      ? pulseLanguage[uiLanguage].scenarioBDelaysBreachBy(breachDifference)
                      : String(pulseLanguage[uiLanguage].scenarioBDelaysBreachBy),
                    uiLanguage
                  )
                : typeof pulseLanguage[uiLanguage].scenarioBDelaysBreachBy === "function"
                  ? pulseLanguage[uiLanguage].scenarioBDelaysBreachBy(breachDifference)
                  : String(pulseLanguage[uiLanguage].scenarioBDelaysBreachBy)}
          </div>
        )}
        <div
          style={{
            display: execRealEstateLayout ? "grid" : "flex",
            flexDirection: execRealEstateLayout ? undefined : "row",
            gridTemplateColumns: execRealEstateLayout
              ? "minmax(300px, 0.35fr) minmax(0, 0.65fr)"
              : undefined,
            gap: executiveDemoMode ? (execRealEstateLayout ? 14 : 9) : 16,
            alignItems: execRealEstateLayout ? "stretch" : "flex-start",
            minWidth: 0,
            maxWidth: "100%",
            overflowX: "hidden",
            ...(execRealEstateLayout
              ? { flex: "1 1 auto", minHeight: "min(44dvh, 720px)" }
              : {}),
          }}
        >
          <div
            style={
              execRealEstateLayout
                ? {
                    minWidth: 0,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    flex: "1 1 auto",
                    overflowX: "hidden",
                  }
                : {
                    flex: executiveDemoMode ? "0 0 clamp(284px, 30vw, 304px)" : "1 1 0",
                    minWidth: 0,
                    maxWidth: executiveDemoMode ? 304 : "min(100%, 420px)",
                    background: executiveDemoMode ? "transparent" : "#111827",
                    borderRadius: executiveDemoMode ? 0 : 8,
                    padding: executiveDemoMode ? 0 : 12,
                    overflowX: "hidden",
                  }
            }
          >
              {caseType === "transport" && !executiveDemoMode && (
                <ScenarioPresetsPanel
                  scenarioTarget={transportScenarioTarget}
                  setScenarioTarget={setTransportScenarioTarget}
                  language={uiLanguage}
                />
              )}
              <AIInspectorPanel
                language={uiLanguage}
                scenarioALabel={selectedScenarioALabel}
                scenarioBLabel={selectedScenarioBLabel}
                tippingQuarter={
                  tippingMarginIndexB != null ? tippingMarginIndexB + 1 : null
                }
                currentMargin={finalA}
                alternativeMargin={finalB}
                marginImpact={finalB - finalA}
                marginHistoryA={marginHistoryA}
                marginHistoryB={marginHistoryB}
                cascadeEvents={cascadeEvents}
                cascadeEventsA={cascadeEventsA}
                cascadeEventsB={cascadeEventsB}
                seriesLengthA={marginHistoryA.length}
                seriesLengthB={marginHistoryB.length}
                simulationHorizon={simulationHorizon}
                primaryDriverA={primaryDriverA}
                primaryDriverB={primaryDriverB}
                primaryDriver={primaryDriver}
                systemPressure={systemPressure}
                constraintBreakQuarter={estimatedTimeToBreach}
                constraintRegistryA={stateA.registry}
                constraintRegistryB={stateB.registry}
                constraintRegistry={stateB.registry}
                structuralStatus={t.structuralStatus[structuralStatusKey]}
                selectedMonthIndex={selectedMonthData?.monthIndex ?? null}
                selectedMarginValueA={selectedMonthData?.marginA ?? null}
                selectedMarginValueB={selectedMonthData?.marginB ?? null}
                selectedGoal={selectedGoal}
                scenarioTarget={transportScenarioTarget}
                selectedActions={selectedActionsForPanel}
                inspectionMode={uiMode}
                caseType={caseType}
                dominantScenarioDifferenceChannel={
                  transportContext?.dominantScenarioDifferenceChannel ?? null
                }
                executiveDemoMode={executiveDemoMode}
              />
          </div>
          <div
            style={
              execRealEstateLayout
                ? {
                    minWidth: 0,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    flex: "1 1 auto",
                    overflowX: "hidden",
                  }
                : {
                    flex: executiveDemoMode ? "1 1 0" : "2.2 1 0",
                    minWidth: 0,
                  }
            }
          >
            <div
              style={{
                width: "100%",
                maxWidth: "100%",
                overflowX: "hidden",
                overflowY: execRealEstateLayout ? "visible" : "hidden",
                ...(execRealEstateLayout
                  ? {
                      flex: "1 1 auto",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: 0,
                    }
                  : {}),
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  ...(execRealEstateLayout
                    ? { flex: "1 1 auto", display: "flex", flexDirection: "column", minHeight: 0 }
                    : {}),
                }}
              >
                {!executiveDemoMode && isDirty && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#b45309",
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    {pt.simulationNeedsUpdate}
                  </div>
                )}
                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    ...(execRealEstateLayout
                      ? { flex: "1 1 auto", minHeight: 0 }
                      : {}),
                  }}
                >
                <MarginGraph
                  marginHistoryA={marginHistoryA}
                  marginHistoryB={marginHistoryB}
                  demandHistoryA={demandHistoryA}
                  demandHistoryB={demandHistoryB}
                  driverEvents={
                    caseType === "transport" ? domainEventsForGraph : []
                  }
                  scenarioTargetDriverEvents={scenarioTargetDriverEvents}
                  displayMarginB={displayMarginB}
                  tippingMarginIndexA={tippingMarginIndexA}
                  tippingMarginIndexB={tippingMarginIndexB}
                  hoverIndex={hoverIndex}
                  showA={showA}
                  showBaselineOnly={showBaselineOnly}
                  showB={showB}
                  simulationHorizon={simulationHorizon}
                  theme={theme}
                  uiLanguage={uiLanguage}
                  svgRef={svgRef}
                  setHoverIndex={setHoverIndex}
                  cascadeEventsA={cascadeEventsA}
                  cascadeEventsB={cascadeEventsB}
                  onSelectMonth={setSelectedMonthData}
                  selectedMonthIndex={selectedMonthData?.monthIndex}
                  graphTitle={undefined}
                  dominantConstraintMessage={dominantConstraintMessage ?? undefined}
                  constraintActivationTimeline={
                    selectedScenario === "A"
                      ? constraintActivationTimelineA
                      : constraintActivationTimelineB
                  }
                  divergenceMonthIndex={divergenceMonthIndex}
                  executiveDemoMode={executiveDemoMode}
                  caseType={caseType}
                  executiveNarrativeMarkers={
                    executiveDemoMode && caseType === "real-estate"
                      ? getExecutiveDemoGraphTimelineMarkers(uiLanguage)
                      : undefined
                  }
                  scenarioALabel={scenarioALabel}
                  scenarioBLabel={scenarioBLabel}
                  scenarioALegendDefault={scenarioALabelText}
                  scenarioBLegendDefault={scenarioBLabelText}
                  scenarioTarget={transportScenarioTarget}
                  showDriverActivations={showDriverActivations}
                />
                {executiveDemoMode && caseType === "real-estate" && (
                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: "1px",
                      flexShrink: 0,
                    }}
                  >
                  <AIInterpretationPanel
                    language={uiLanguage}
                    executiveDemoMode={executiveDemoMode}
                    executiveInterpretationStrip
                    tippingQuarter={
                      tippingMarginIndexB != null ? tippingMarginIndexB + 1 : null
                    }
                    caseName={getExecutiveDemoPlaybackPresetTitle(uiLanguage)}
                    events={[
                      { quarter: 1, type: "Maintenance deferred" },
                      {
                        quarter:
                          tippingMarginIndexB != null
                            ? tippingMarginIndexB + 1
                            : 0,
                        type: "Capital constraint activated",
                      },
                    ].filter((e) => e.quarter > 0)}
                    simulationCompleted={hasSimulationCompleted}
                    currentMargin={finalA}
                    alternativeMargin={finalB}
                    marginImpact={finalB - finalA}
                    cascadeEventsA={cascadeEventsA}
                    cascadeEventsB={cascadeEventsB}
                    primaryDriver={primaryDriver}
                    systemPressure={systemPressure}
                    estimatedTimeToBreach={estimatedTimeToBreach}
                    decisionFlowEvents={sortedDecisionFlowEvents}
                    marginTrend={marginTrend}
                    cascadeDelay={cascadeDelaySteps}
                    caseType={caseType}
                    selectedActions={selectedActionsForPanel}
                    primaryDriverChanged={primaryDriverChanged}
                    constraintActivationChanged={constraintActivationChanged}
                    propagationRootChanged={propagationRootChanged}
                    dominantScenarioDifferenceChannel={
                      transportContext?.dominantScenarioDifferenceChannel ??
                      (transportContextA?.primaryDriver &&
                      transportContextB?.primaryDriver &&
                      transportContextA.primaryDriver !== transportContextB.primaryDriver
                        ? `${transportContextA.primaryDriver} → ${transportContextB.primaryDriver}`
                        : null)
                    }
                  />
                  </div>
                )}
                {!executiveDemoMode && (
                  <>
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "14px",
                        borderRadius: "12px",
                        background: "rgba(30, 41, 59, 0.6)",
                        border: "1px solid rgba(148, 163, 184, 0.2)"
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "8px" }}>
                        {uiLanguage === "sv" ? "Systemstatus" : "System status"}
                      </div>
                      <div>
                        {uiLanguage === "sv"
                          ? `Nuläge: ${finalA >= 0 ? "Robust" : "Kollapszon"} (marginal ${finalA.toFixed(2)})`
                          : `Baseline: ${finalA >= 0 ? "Robust" : "Collapse zone"} (margin ${finalA.toFixed(2)})`}
                      </div>
                      <div>
                        {uiLanguage === "sv"
                          ? `Målstrategi: ${finalB >= 0 ? "Robust" : "Kollapszon"} (marginal ${finalB.toFixed(2)})`
                          : `Goal strategy: ${finalB >= 0 ? "Robust" : "Collapse zone"} (margin ${finalB.toFixed(2)})`}
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        {uiLanguage === "sv"
                          ? `Kapitalbegränsning: ${
                              tippingMarginIndexB != null ? "AKTIV" : "INAKTIV"
                            }`
                          : `Capital constraint: ${
                              tippingMarginIndexB != null ? "ACTIVE" : "INACTIVE"
                            }`}
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        {uiLanguage === "sv"
                          ? caseType === "real-estate"
                            ? `Viktigaste påverkansfaktor: ${systemStatusPrimaryDriverDisplayText}`
                            : `Primär drivare: ${systemStatusPrimaryDriverDisplayText}`
                          : caseType === "real-estate"
                            ? `Main influencing factor: ${systemStatusPrimaryDriverDisplayText}`
                            : `Primary driver: ${systemStatusPrimaryDriverDisplayText}`}
                      </div>
                    </div>
                    <AIInterpretationPanel
                  language={uiLanguage}
                  executiveDemoMode={executiveDemoMode}
                  tippingQuarter={
                    tippingMarginIndexB != null ? tippingMarginIndexB + 1 : null
                  }
                  caseName={
                    executiveDemoMode
                      ? getExecutiveDemoPlaybackPresetTitle(uiLanguage)
                      : PILOT_CASES.find((c) => c.id === selectedPilotCaseId)?.title ?? ""
                  }
                  events={[
                    { quarter: 1, type: "Maintenance deferred" },
                    {
                      quarter:
                        tippingMarginIndexB != null
                          ? tippingMarginIndexB + 1
                          : 0,
                      type: "Capital constraint activated",
                    },
                  ].filter((e) => e.quarter > 0)}
                  simulationCompleted={hasSimulationCompleted}
                  currentMargin={finalA}
                  alternativeMargin={finalB}
                  marginImpact={finalB - finalA}
                  cascadeEventsA={cascadeEventsA}
                  cascadeEventsB={cascadeEventsB}
                  primaryDriver={primaryDriver}
                  systemPressure={systemPressure}
                  estimatedTimeToBreach={estimatedTimeToBreach}
                  decisionFlowEvents={sortedDecisionFlowEvents}
                  marginTrend={marginTrend}
                  cascadeDelay={cascadeDelaySteps}
                  caseType={caseType}
                  selectedActions={selectedActionsForPanel}
                  primaryDriverChanged={primaryDriverChanged}
                  constraintActivationChanged={constraintActivationChanged}
                  propagationRootChanged={propagationRootChanged}
                  dominantScenarioDifferenceChannel={
                    transportContext?.dominantScenarioDifferenceChannel ??
                    (
                      transportContextA?.primaryDriver &&
                      transportContextB?.primaryDriver &&
                      transportContextA.primaryDriver !== transportContextB.primaryDriver
                        ? `${transportContextA.primaryDriver} → ${transportContextB.primaryDriver}`
                        : null
                    )
                  }
                />
                  </>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {selectedMonthData && !executiveDemoMode && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 6,
              background: "#0f172a",
              border: "1px solid #1e293b",
              fontSize: 13,
              display: "flex",
              gap: 18,
            }}
          >
            <div>
              Month:
              <strong>
                {" "}
                M{selectedMonthData.monthIndex + 1}
              </strong>
            </div>

            <div>
              {`${scenarioALabelText}:`}
              <strong>
                {" "}
                {selectedMonthData.marginA.toFixed(1)}%
              </strong>
            </div>

            <div>
              {`${scenarioBLabelText}:`}
              <strong>
                {" "}
                {selectedMonthData.marginB.toFixed(1)}%
              </strong>
            </div>

            <div>
              Difference:
              <strong>
                {" "}
                {selectedMonthData.difference.toFixed(1)}%
              </strong>
            </div>
          </div>
        )}
        {!executiveDemoMode && <div style={{ height: 8 }} />}
        {!executiveDemoMode && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              marginBottom: 4,
            }}
          >
            {pt.pilotSimulationHorizonLabel}
          </div>

          {[12, 36, 60].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setSimulationHorizon(q);
                setCustomHorizon(null);
              }}
              style={{
                marginRight: 6,
                padding: "4px 10px",
                fontSize: 11,
                border: "1px solid #374151",
                background: simulationHorizon === q && customHorizon == null ? "#1F2937" : "#111827",
                color: "#E5E7EB",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {q}M
            </button>
          ))}
          <span style={{ marginLeft: 8, fontSize: 11, color: "#9CA3AF" }}>{pt.pilotCustomHorizonLabel}</span>
          <input
            type="number"
            min={1}
            max={120}
            placeholder="Custom Q"
            value={customHorizon ?? ""}
            style={{
              width: "80px",
              marginLeft: "8px",
              padding: "4px 6px",
              border: "1px solid #374151",
              borderRadius: "4px",
              background: "#111827",
              color: "#e5e7eb",
              fontSize: "12px",
            }}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") {
                setCustomHorizon(null);
                return;
              }
              const v = parseInt(raw, 10);
              if (!isNaN(v) && v >= 1 && v <= 120) {
                setCustomHorizon(v);
                setSimulationHorizon(v);
              }
            }}
          />
        </div>
        )}
        {!executiveDemoMode && (
        <select
          value={domain}
          onChange={(e) => {
            const newDomain = e.target.value as DomainKey;
            setDomain(newDomain);
            setActiveDomain(newDomain);
            const freshDomainState = createFreshDomainScenarioState(newDomain);
            resetRunState();
            setHasSimulationCompleted(false);
            setIsRunning(false);
            setSelectedPilotCaseId(freshDomainState.selectedPilotCaseId);
            setBaseRiskStateA(freshDomainState.baseRiskStateA);
            setBaseRiskStateB(freshDomainState.baseRiskStateB);
            setRiskStateA(freshDomainState.riskStateA);
            setRiskStateB(freshDomainState.riskStateB);
            setDriverScoresA(freshDomainState.driverScoresA);
            setDriverScoresB(freshDomainState.driverScoresB);
            setSelectedActionsA(freshDomainState.selectedActionsA);
            setSelectedActionsB(freshDomainState.selectedActionsB);
            setScenarioPromptA(freshDomainState.scenarioPromptA);
            setScenarioPromptB(freshDomainState.scenarioPromptB);
            setScenarioALabel(freshDomainState.scenarioALabel);
            setScenarioBLabel(freshDomainState.scenarioBLabel);
            setAppliedScenarioAId(freshDomainState.appliedScenarioAId);
            setAppliedScenarioBId(freshDomainState.appliedScenarioBId);
            setTransportScenarioTarget(null);
            setManualScenarioTarget("A");
            setIsDirty(false);
          }}
          style={{
            marginBottom: "10px",
            padding: "6px",
            borderRadius: "4px",
          }}
        >
          <option value="realEstate">{pt.pilotDomainTitle.realEstate}</option>
          <option value="municipal">{pt.pilotDomainTitle.municipal}</option>
          <option value="consulting">{pt.pilotDomainTitle.consulting}</option>
        </select>
        )}
        {!executiveDemoMode && (
          <>
        <div>
        <ScenarioLibrary
          domain={domain}
          language={uiLanguage}
          scenarioTarget={editableScenario}
          onScenarioTargetChange={
            activeScenario === "BOTH"
              ? (target) => {
                  setManualScenarioTarget(target);
                }
              : undefined
          }
          onSelectScenario={(presetId) => {
            const presetLibrary = getScenarioLibrary(uiLanguage);
            const preset = presetLibrary.find((p) => p.id === presetId);
            const prompt = preset?.prompt ?? "";
            const nextPresetState = getRiskStateAfterPreset(presetId) as RiskState;
            const selectedActionKeys = preset?.actionKeys ?? [];
            const knownActionKeys = new Set(Object.keys(ACTION_EFFECTS));
            const applicableActions = selectedActionKeys.filter((a) => knownActionKeys.has(a));
            const missingActionKeys = selectedActionKeys.filter((a) => !knownActionKeys.has(a));
            if (missingActionKeys.length > 0) {
              console.warn("[PULSE TRANSPORT] Missing intervention keys:", missingActionKeys);
            }
            const resolvedScenarioState = resolveActionDrivenState(
              nextPresetState,
              applicableActions
            );
            const applyTo = editableScenario;

            if (editableScenario === "A") {
              setBaseRiskStateA(structuredClone(nextPresetState));
              setRiskStateA(structuredClone(resolvedScenarioState.riskState));
              setDriverScoresA(resolvedScenarioState.driverScores);
              setScenarioPromptA(prompt);
              setAppliedScenarioAId(presetId);
              setSelectedActionsA(applicableActions);
            }
            if (editableScenario === "B") {
              setBaseRiskStateB(structuredClone(nextPresetState));
              setRiskStateB(structuredClone(resolvedScenarioState.riskState));
              setDriverScoresB(resolvedScenarioState.driverScores);
              setScenarioPromptB(prompt);
              setAppliedScenarioBId(presetId);
              setSelectedActionsB(applicableActions);
            }

            if (applyTo === "A") {
              setScenarioALabel(preset?.id ?? "");
            } else {
              setScenarioBLabel(preset?.id ?? "");
            }

            setIsDirty(true);
            if (presetId === "interest-shock") {
            }
          }}
        />
        </div>
        <ScenarioPromptDock
          language={uiLanguage}
          onScenarioSubmit={handleScenarioSubmit}
          scenarioHistory={scenarioHistory}
          onSimulationSourceChange={(source) => setSimulationSource(source)}
          scenarioPromptA={scenarioPromptA}
          scenarioPromptB={scenarioPromptB}
          onScenarioPromptAChange={setScenarioPromptA}
          onScenarioPromptBChange={setScenarioPromptB}
        />
        <ScenarioPreviewPanel
          visible={previewVisible}
          changesA={previewChangesA}
          changesB={previewChangesB}
          scenarioTextA={previewScenarioTextA}
          scenarioTextB={previewScenarioTextB}
          language={uiLanguage}
          onApply={() => {
            const nextA =
              previewChangesA.length > 0
                ? applyChangesToState(
                    riskStateA as Record<string, RiskLevel>,
                    previewChangesA
                  )
                : riskStateA;
            const nextB =
              previewChangesB.length > 0
                ? applyChangesToState(
                    riskStateB as Record<string, RiskLevel>,
                    previewChangesB
                  )
                : riskStateB;

            applyScenarioChanges(previewChangesA, previewChangesB);
            startSimulation("manual", nextA as RiskState, nextB as RiskState);
            setPreviewVisible(false);
          }}
          onCancel={() => {
            setPreviewVisible(false);
          }}
        />
          </>
        )}
        {false && (
          <PromptDock
            language={uiLanguage}
            cascadeEventsA={cascadeEventsA}
            cascadeEventsB={cascadeEventsB}
            cascadeDelay={cascadeDelaySteps}
            primaryDriver={primaryDriver}
            systemPressure={systemPressure}
            estimatedTimeToBreach={estimatedTimeToBreach}
            marginTrend={marginTrend}
            decisionFlowEvents={sortedDecisionFlowEvents}
          />
        )}
      </div>

      {!executiveDemoMode && (
      <div
        style={{
          marginTop: "4px",
          marginBottom: "32px",
          fontSize: "12px",
          color: "#9CA3AF",
        }}
      >
        <span>{pt.systemPressure}: </span>
        <span style={{ fontWeight: 600 }}>{systemPressure}</span>
        <br />
        <span>{pt.estimatedStructuralBreach} </span>
        <span style={{ fontWeight: 600 }}>
          {estimatedTimeToBreach != null ? `~${estimatedTimeToBreach} steps` : "—"}
        </span>
      </div>
      )}

      {!isRunning && executiveSummary && !executiveDemoMode && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: executiveDemoMode ? "1fr" : "1.4fr 1fr",
            gap: executiveDemoMode ? "0" : "24px",
            marginTop: executiveDemoMode ? "20px" : "28px",
            alignItems: "stretch",
          }}
        >
          <div>
            <ExecutiveSummaryCard
              executiveSummary={executiveSummary}
              theme={theme}
              t={t}
              structuralStatusKey={structuralStatusKey}
              interpretation={displayInterpretation}
              narrativeText={displayNarrativeText}
              tippingStepA={tippingStepA}
              tippingStepB={tippingStepB}
              executiveDemoMode={executiveDemoMode}
              uiLanguage={uiLanguage}
            />
          </div>
          {!executiveDemoMode && (
          <SnapshotCompare
            baselineA={baselineA}
            finalA={finalA}
            baselineB={baselineB}
            finalB={finalB}
            structuralStatusA={t.structuralStatus[structuralStatusA]}
            structuralStatusB={t.structuralStatus[structuralStatusKey]}
            deltaMargin={executiveSummary.deltaMargin}
            tippingStep={executiveSummary.tippingStep}
            tippingLabel={t.common.tippingPrefix}
            noTippingText={t.common.noTipping}
          />
          )}
        </div>
      )}

      {!executiveDemoMode && (
        <>
      <div style={{ marginTop: "32px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
        <div
          style={{
            flex: "1 1 280px",
            padding: "16px",
            background: "#1a1a1a",
            border: "1px solid #2f333a",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#9ca3af" }}>
            {`Frozen Snapshots — ${scenarioALabelText}`}
          </div>
          {historyA.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#6b7280" }}>No snapshots yet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {historyA.map((s) => (
                <li
                  key={s.snapshotId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                    padding: "8px 0",
                    background: "#111827",
                    border:
                      selectedSnapA === s.snapshotId || selectedSnapB === s.snapshotId
                        ? "1px solid #3b82f6"
                        : "1px solid #1f2937",
                    borderRadius: "4px",
                    transition: "background 0.15s ease, border 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1f2937";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#111827";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        {editingLabelId === s.snapshotId ? (
                          <input
                            type="text"
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            onBlur={() => saveLabel(s.snapshotId, editingLabelValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveLabel(s.snapshotId, editingLabelValue);
                              if (e.key === "Escape") {
                                setEditingLabelId(null);
                                setEditingLabelValue("");
                              }
                            }}
                            autoFocus
                            style={{
                              fontSize: "12px",
                              color: "#e6edf3",
                              background: "#0e1117",
                              border: "1px solid #2f333a",
                              borderRadius: "4px",
                              padding: "4px 6px",
                              width: "140px",
                            }}
                          />
                        ) : (
                          <>
                            <span
                              style={{ fontSize: "12px", color: "#9ca3af", cursor: "pointer" }}
                              title="Double-click to rename"
                              onDoubleClick={() => {
                                setEditingLabelId(s.snapshotId);
                                setEditingLabelValue(getDisplayLabel(s));
                              }}
                            >
                              {getDisplayLabel(s)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLabelId(s.snapshotId);
                                setEditingLabelValue(getDisplayLabel(s));
                              }}
                              style={{
                                padding: "2px 4px",
                                background: "transparent",
                                border: "none",
                                color: "#6b7280",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                              title="Rename"
                              aria-label="Rename snapshot"
                            >
                              ✎
                            </button>
                          </>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#9CA3AF",
                          marginTop: "4px",
                        }}
                      >
                        {new Date(s.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSnapA(s.snapshotId)}
                      style={{
                        padding: "4px 8px",
                        background: "#0e1117",
                        border: "1px solid #2f333a",
                        borderRadius: "4px",
                        color: "#e6edf3",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Select as A
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSnapshotA(s.snapshotId)}
                      style={{
                        padding: "4px 8px",
                        background: "#0e1117",
                        border: "1px solid #2f333a",
                        borderRadius: "4px",
                        color: "#e6edf3",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          style={{
            flex: "1 1 280px",
            padding: "16px",
            background: "#1a1a1a",
            border: "1px solid #2f333a",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#9ca3af" }}>
            {`Frozen Snapshots — ${scenarioBLabelText}`}
          </div>
          {historyB.length === 0 ? (
            <div style={{ fontSize: "13px", color: "#6b7280" }}>No snapshots yet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {historyB.map((s) => (
                <li
                  key={s.snapshotId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                    padding: "8px 0",
                    background: "#111827",
                    border:
                      selectedSnapA === s.snapshotId || selectedSnapB === s.snapshotId
                        ? "1px solid #3b82f6"
                        : "1px solid #1f2937",
                    borderRadius: "4px",
                    transition: "background 0.15s ease, border 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#1f2937";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#111827";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        {editingLabelId === s.snapshotId ? (
                          <input
                            type="text"
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            onBlur={() => saveLabel(s.snapshotId, editingLabelValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveLabel(s.snapshotId, editingLabelValue);
                              if (e.key === "Escape") {
                                setEditingLabelId(null);
                                setEditingLabelValue("");
                              }
                            }}
                            autoFocus
                            style={{
                              fontSize: "12px",
                              color: "#e6edf3",
                              background: "#0e1117",
                              border: "1px solid #2f333a",
                              borderRadius: "4px",
                              padding: "4px 6px",
                              width: "140px",
                            }}
                          />
                        ) : (
                          <>
                            <span
                              style={{ fontSize: "12px", color: "#9ca3af", cursor: "pointer" }}
                              title="Double-click to rename"
                              onDoubleClick={() => {
                                setEditingLabelId(s.snapshotId);
                                setEditingLabelValue(getDisplayLabel(s));
                              }}
                            >
                              {getDisplayLabel(s)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingLabelId(s.snapshotId);
                                setEditingLabelValue(getDisplayLabel(s));
                              }}
                              style={{
                                padding: "2px 4px",
                                background: "transparent",
                                border: "none",
                                color: "#6b7280",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                              title="Rename"
                              aria-label="Rename snapshot"
                            >
                              ✎
                            </button>
                          </>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#9CA3AF",
                          marginTop: "4px",
                        }}
                      >
                        {new Date(s.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSnapB(s.snapshotId)}
                      style={{
                        padding: "4px 8px",
                        background: "#0e1117",
                        border: "1px solid #2f333a",
                        borderRadius: "4px",
                        color: "#e6edf3",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Select as B
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSnapshotB(s.snapshotId)}
                      style={{
                        padding: "4px 8px",
                        background: "#0e1117",
                        border: "1px solid #2f333a",
                        borderRadius: "4px",
                        color: "#e6edf3",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {snapA != null && snapB != null && (
        <div
          style={{
            marginTop: "32px",
            padding: "16px",
            background: "#1a1a1a",
            border: "1px solid #2f333a",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#9ca3af" }}>
            {`Compare Frozen Snapshots (${scenarioBLabelText} − ${scenarioALabelText})`}
          </div>
          <button
            type="button"
            onClick={() => setShowTechnicalDetails((v) => !v)}
            style={{
              marginBottom: "12px",
              padding: "6px 10px",
              fontSize: "12px",
              background: "#0e1117",
              border: "1px solid #2f333a",
              borderRadius: "4px",
              color: "#9ca3af",
              cursor: "pointer",
            }}
          >
            {showTechnicalDetails ? "Hide technical details" : "Show technical details"}
          </button>
          <div style={{ fontSize: "13px", lineHeight: "1.8" }}>
            <strong>{`${scenarioALabelText}:`}</strong> {snapA.engineState.margin.toFixed(3)}
            <br />
            <strong>{`${scenarioBLabelText}:`}</strong> {snapB.engineState.margin.toFixed(3)}
            <br />
            <strong>Margin impact:</strong> {(snapB.engineState.margin - snapA.engineState.margin).toFixed(3)}
            <br />
            <strong>Tipping (ACTIVE):</strong>{" "}
{tippingStepA != null ? `${scenarioALabelText}: M${tippingStepA}` : `${scenarioALabelText}: never`} |{" "}
              {tippingStepB != null ? `${scenarioBLabelText}: M${tippingStepB}` : `${scenarioBLabelText}: never`}
            <br />
            {executiveConclusion != null && (
              <>
                <strong>Conclusion:</strong> {executiveConclusion.title}
                <br />
                {executiveConclusion.tags.length > 0 && (
                  <>
                    <strong>Tags:</strong> {executiveConclusion.tags.join(", ")}
                    <br />
                  </>
                )}
              </>
            )}
            {showTechnicalDetails && (
              <>
                <strong>{`Refinancing lifecycle (${scenarioALabelText}):`}</strong> {snapA.engineState.registry.RefinancingConstraint.lifecycle}
                <br />
                <strong>{`Refinancing lifecycle (${scenarioBLabelText}):`}</strong> {snapB.engineState.registry.RefinancingConstraint.lifecycle}
                <br />
                <strong>{`Step (${scenarioALabelText}):`}</strong> {snapA.engineState.step}
                <br />
                <strong>{`Step (${scenarioBLabelText}):`}</strong> {snapB.engineState.step}
              </>
            )}
          </div>
          {/* Self-check cases: (1) A tips at step 3, B at step 1 → conclusion B triggers earlier, tag Risk ↑.
              (2) B never tips → "B avoids ACTIVE while A triggers it" or "No ACTIVE tipping" if A also never.
              (3) Verify tags: Margin up/down, Stability up/down, Risk ↑ from lifecycle/tipping. */}
        </div>
      )}
        </>
      )}
        </div>
      </div>

      {uiMode === "expert" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "38%",
            height: "100%",
            background: "rgba(11, 15, 20, 0.92)",
            zIndex: 1000,
            padding: "24px",
            color: "#E5E7EB",
            borderLeft: "1px solid #1F2937",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: "28px",
              paddingBottom: "20px",
              borderBottom: "1px solid #1F2937",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#E5E7EB" }}>
                {pt.expertMode}
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#9CA3AF" }}>
                {pt.structuralInspectionLayer}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setUiMode("executive");
              }}
              aria-label={pt.expertCloseAriaLabel}
              style={{
                flexShrink: 0,
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                background: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "6px",
                color: "#9CA3AF",
                fontSize: "16px",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              marginBottom: "18px",
              paddingBottom: "10px",
              borderBottom: "1px solid #1f2937",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9CA3AF",
                marginBottom: "6px",
              }}
            >
              {uiLanguage === "sv"
                ? "Strukturell diagnostik"
                : "Structural diagnostics"}
            </div>

            <div
              style={{
                fontSize: "15px",
                color: "#E5E7EB",
                fontWeight: 500,
              }}
            >
              {uiLanguage === "sv"
                ? "Modellens tillståndsinspektion och begränsningspropagering"
                : "Model state inspection and constraint propagation structure"}
            </div>
          </div>

          <SystemDriversPanel
            primaryDriver={primaryDriver ?? undefined}
            systemPressure={systemPressure}
            marginTrend={marginTrend}
            cascadeEventsA={activeCascadeEvents}
            cascadeEventsB={cascadeEventsB}
            estimatedTimeToBreach={estimatedTimeToBreach}
            language={uiLanguage}
          />

          <DecisionExplanationPanel
            primaryDriver={primaryDriver ?? undefined}
            systemPressure={systemPressure}
            marginTrend={marginTrend}
            cascadeEventsA={cascadeEventsA}
            cascadeEventsB={cascadeEventsB}
            estimatedTimeToBreach={estimatedTimeToBreach}
            language={uiLanguage}
          />

          <ScenarioInterpretationPanel
            parsedScenarioEffectsA={parsedScenarioEffectsA}
            parsedScenarioEffectsB={parsedScenarioEffectsB}
            scenarioTextA={previewScenarioTextA}
            scenarioTextB={previewScenarioTextB}
            language={uiLanguage}
          />

          <ScenarioOutcomePanel
            breachA={tippingMarginIndexA != null ? tippingMarginIndexA + 1 : null}
            breachB={tippingMarginIndexB != null ? tippingMarginIndexB + 1 : null}
            finalMarginA={finalA}
            finalMarginB={finalB}
            breachDifference={breachDifference}
            language={uiLanguage}
          />

          <div
            style={{
              marginBottom: "28px",
              padding: "16px 20px",
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "8px",
            }}
          >
          <section style={{ marginBottom: "0" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#9CA3AF",
                marginBottom: "12px",
              }}
            >
              {pt.structuralMetrics}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  color: "#6B7280",
                }}
              >
                <span>minimumMargin</span>
                <span style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                  {expertMinimumMargin != null ? expertMinimumMargin.toFixed(4) : "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  color: "#6B7280",
                }}
              >
                <span>collapseThreshold</span>
                <span style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                  {EXEC_COLLAPSE_THRESHOLD}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  color: "#6B7280",
                }}
              >
                <span>sustainThreshold</span>
                <span style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                  {EXEC_SUSTAIN_THRESHOLD}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  color: "#6B7280",
                }}
              >
                <span>{pt.tippingStep}</span>
                <span style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                  {expertTippingStep != null ? `M${expertTippingStep}` : "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  color: "#6B7280",
                }}
              >
                <span>{pt.simulationMonths}</span>
                <span style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                  {expertSteps}
                </span>
              </div>
            </div>
          </section>
          </div>

          <div style={{ height: "1px", background: "#1F2937", marginBottom: "28px" }} />

          <div
            style={{
              marginBottom: "28px",
              padding: "16px 20px",
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "8px",
            }}
          >
          <section style={{ marginBottom: "0" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#9CA3AF",
                marginBottom: "12px",
              }}
            >
              {pt.constraintView}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  color: "#6B7280",
                }}
              >
                <span>Sustain breach</span>
                <span style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                  {sustainBreachStep != null
                    ? `Sustain threshold crossed at M${sustainBreachStep}`
                    : "Sustain threshold not crossed"}
                </span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "rgba(156,163,175,0.8)",
                  marginTop: "2px",
                }}
              >
                Minimum structural capital buffer required for long-term stability.
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  color: "#6B7280",
                }}
              >
                <span>Collapse breach</span>
                <span style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                  {collapseBreachStep != null
                    ? `Collapse threshold crossed at M${collapseBreachStep}`
                    : "Collapse threshold not crossed"}
                </span>
              </div>
              {steadyStateStep !== null && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    color: "#6B7280",
                  }}
                >
                  <span>Steady state detected</span>
                  <span style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                    System stabilized at M{steadyStateStep}. No structural change detected for {REQUIRED_STABLE_TICKS} consecutive ticks (after minimum {MIN_STEPS_BEFORE_STEADY} months).
                  </span>
                </div>
              )}
            </div>
          </section>
          </div>
        </div>
      )}
      </div>
      <style jsx>{`
        .active-button {
          background-color: #3b82f6 !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}
