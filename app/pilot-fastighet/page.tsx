"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getSystemSnapshot } from "@/src/systemSnapshot/systemSnapshotStore";
import { RealEstateEngine, type RiskState } from "@/src/pilotFastighet/RealEstateEngine";
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
import MarginGraph, {
  MarginGraphLegendRow,
  type MarginGraphSelectMonthPayload,
} from "./components/MarginGraph";
import { UI_TEXT, type Language, CASE_TRANSLATIONS, EVENT_TRANSLATIONS } from "@/src/pilotFastighet/uiText";
import { pulseLanguage, activeDomain, setActiveDomain, type DomainKey } from "@/src/i18n/pulseLanguage";
import { type ScenarioChange } from "@/lib/scenarioParser";
import { parsePreviewScenarioImpact } from "@/src/pilotFastighet/previewScenarioImpact";
import { getScenarioLibrary } from "@/src/pilotFastighet/scenarioLibrary";
import {
  defaultRiskState,
  getRiskStateAfterPreset,
} from "@/src/pilotFastighet/presetRiskMapping";

const STORAGE_KEY_A = "pulse_pilot_fastighet_history_A";
const STORAGE_KEY_B = "pulse_pilot_fastighet_history_B";
const SNAPSHOT_LABELS_KEY = "pulse.snapshotLabels.v1";

const VISIBLE_PILOT_CASES = PILOT_CASES.filter(
  (c) => c.id !== "neutral-baseline"
);
const EXEC_TIPPING_THRESHOLD = 0.9;
const EXEC_SUSTAIN_THRESHOLD = 0.8;
const EXEC_COLLAPSE_THRESHOLD = 0.6;
const MIN_STEPS_BEFORE_STEADY = 5;
const REQUIRED_STABLE_TICKS = 3;
const ANALYSIS_HORIZON = 16;
const domainTitles = {
  realEstate: "Real Estate Portfolio",
  municipal: "Municipal System",
  consulting: "Decision Environment",
};

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
  type ScenarioId = "A" | "B" | "BOTH";

  type FrozenSnapshot = {
    snapshotId: string;
    label?: string;
    createdAt: number;
    engineState: ReturnType<RealEstateEngine["getState"]>;
    metadata: {
      caseId: string | null;
      scenario: "A" | "B";
      modelVersion: string;
    };
  };

  type Scenario = {
    id: ScenarioId;
    label: string;
    engine: RealEstateEngine;
    riskState: Record<string, RiskLevel>;
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
  const [marginHistoryBaseline, setMarginHistoryBaseline] = useState<number[]>([]);
  const [tippingMarginIndexA, setTippingMarginIndexA] = useState<number | null>(null);
  const [tippingMarginIndexB, setTippingMarginIndexB] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedPilotCaseId, setSelectedPilotCaseId] = useState<string>("");
  const [freezeFlash, setFreezeFlash] = useState<"A" | "B" | null>(null);
  const [uiTheme, setUiTheme] = useState<"dark" | "light">("dark");
  const [uiLanguage, setUiLanguage] = useState<Language>("sv");
  const [uiMode, setUiMode] = useState<"executive" | "expert">("executive");

  // NOTE: Cascades/escalation are computed by RealEstateEngine during ticks.
  // We intentionally avoid running propagateRisks in the UI layer.
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
  const [scenarioTarget, setScenarioTarget] = useState<"A" | "B">("A");
  const [appliedScenarioAId, setAppliedScenarioAId] = useState<string | null>(null);
  const [appliedScenarioBId, setAppliedScenarioBId] = useState<string | null>(null);

  const engineARef = useRef<RealEstateEngine | null>(null);
  const engineBRef = useRef<RealEstateEngine | null>(null);
  const engineBaselineRef = useRef<RealEstateEngine | null>(null);
  const intervalRef = useRef<number | null>(null);
  const marginHistoryARef = useRef<number[]>([]);
  const marginHistoryBRef = useRef<number[]>([]);
  const lastMarginARef = useRef<number | null>(null);
  const lastMarginBRef = useRef<number | null>(null);
  const stableCounterARef = useRef(0);
  const stableCounterBRef = useRef(0);

  useEffect(() => {
    setHistoryA(loadHistory(STORAGE_KEY_A));
    setHistoryB(loadHistory(STORAGE_KEY_B));
  }, []);

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
    console.log("SIMULATE CLICKED");
    console.log("Scenario A preview:", previewScenarioTextA);
    console.log("Scenario B preview:", previewScenarioTextB);
    console.log("Scenario A prompt:", scenarioPromptA);
    console.log("Scenario B prompt:", scenarioPromptB);

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

    console.log("Parsing scenarios...");
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
            riskStateA as Record<string, RiskLevel>,
            changesA
          )
        : riskStateA;
    const nextB =
      Object.keys(changesB).length > 0
        ? applyChangesToState(
            riskStateB as Record<string, RiskLevel>,
            changesB
          )
        : riskStateB;

    // Apply scenario changes to input risk states.
    // Escalation, propagation, and cascade events are computed inside RealEstateEngine.
    const target = scenarioTarget;

    if (target === "A") {
      setRiskStateA(structuredClone(nextA as RiskState));
    }

    if (target === "B") {
      setRiskStateB(structuredClone(nextB as RiskState));
    }
  }

  function resetRunState() {
    setMarginHistoryA([]);
    setMarginHistoryB([]);
    setMarginHistoryBaseline([]);
    setHistoryBaseline([]);
    setTippingMarginIndexA(null);
    setTippingMarginIndexB(null);
    setExecutiveSummary(null);
    setSteadyStateStep(null);
    setCascadeEventsA([]);
    setCascadeEventsB([]);

    lastMarginARef.current = null;
    lastMarginBRef.current = null;
    stableCounterARef.current = 0;
    stableCounterBRef.current = 0;
  }

  function startSimulation(
    source: "scenario" | "manual",
    riskOverrideA?: RiskState,
    riskOverrideB?: RiskState
  ) {
    const effectiveRiskStateA = riskOverrideA ?? riskStateA;
    const effectiveRiskStateB = riskOverrideB ?? riskStateB;
    setSimulationSource(source);
    setHasSimulationCompleted(false);
    setIsRunning(false);
    resetRunState();

    // RealEstateEngine is the single source of truth for escalation, propagation,
    // and cascade event generation. The UI passes the initial risk state only.
    const snapshotA = { ...effectiveRiskStateA };
    const snapshotB = { ...effectiveRiskStateB };
    const snapshotBaseline = { ...riskStateBaseline };
    marginHistoryARef.current = [];
    marginHistoryBRef.current = [];
    engineARef.current = new RealEstateEngine(snapshotA);
    engineBRef.current = new RealEstateEngine(snapshotB);
    engineBaselineRef.current = new RealEstateEngine(snapshotBaseline);
    setIsDirty(false);
    setIsRunning(true);

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = window.setInterval(() => {
      if (!engineARef.current || !engineBRef.current) return;
      const engineA = engineARef.current;
      const engineB = engineBRef.current;
      const engineBaseline = engineBaselineRef.current;

      engineA.stepForward();
      engineB.stepForward();
      if (engineBaseline) engineBaseline.stepForward();

      const sA = engineA.getState();
      const sB = engineB.getState();
      const sBaseline = engineBaseline?.getState();

      marginHistoryARef.current.push(sA.margin);
      marginHistoryBRef.current.push(sB.margin);
      if (sA.step <= 3 || sB.step <= 3) {
      }

      // Keep the UI in sync with the engine (single source of truth).
      setRiskStateA(structuredClone(sA.riskState as RiskState));
      setRiskStateB(structuredClone(sB.riskState as RiskState));
      if (Array.isArray((sA as any).cascadeEvents)) {
        setCascadeEventsA((sA as any).cascadeEvents);
      }
      if (Array.isArray((sB as any).cascadeEvents)) {
        setCascadeEventsB((sB as any).cascadeEvents);
      }

      if (sA.step > simulationHorizon && sB.step > simulationHorizon) {
        if (engineBaselineRef.current) engineBaselineRef.current = null;

        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }


        setHasSimulationCompleted(true);
        setIsRunning(false);
        return;
      }

      const epsilon = 1e-6;

      if (sA.step > MIN_STEPS_BEFORE_STEADY) {
        if (lastMarginARef.current !== null) {
          const isStableA =
            Math.abs(sA.margin - lastMarginARef.current) < epsilon;
          if (isStableA) {
            stableCounterARef.current += 1;
          } else {
            stableCounterARef.current = 0;
          }
          if (stableCounterARef.current >= REQUIRED_STABLE_TICKS) {
            setSteadyStateStep(sA.step);
          }
        }
      }
      lastMarginARef.current = sA.margin;

      if (sB.step > MIN_STEPS_BEFORE_STEADY) {
        if (lastMarginBRef.current !== null) {
          const isStableB =
            Math.abs(sB.margin - lastMarginBRef.current) < epsilon;
          if (isStableB) {
            stableCounterBRef.current += 1;
          } else {
            stableCounterBRef.current = 0;
          }
          if (stableCounterBRef.current >= REQUIRED_STABLE_TICKS) {
            setSteadyStateStep(sB.step);
          }
        }
      }
      lastMarginBRef.current = sB.margin;

      setMarginHistoryA((prev) => {
        const idx = prev.length;
        if (sA.registry?.RefinancingConstraint?.lifecycle === "ACTIVE") {
          setTippingMarginIndexA((t) => (t === null ? idx : t));
        }
        return [...prev, sA.margin];
      });

      setMarginHistoryB((prev) => {
        const idx = prev.length;
        if (sB.registry?.RefinancingConstraint?.lifecycle === "ACTIVE") {
          setTippingMarginIndexB((t) => (t === null ? idx : t));
        }
        return [...prev, sB.margin];
      });

      if (sBaseline != null) {
        setMarginHistoryBaseline((prev) => [...prev, sBaseline.margin]);
      }
    }, 500);

    console.log("[PULSE TRACE] Simulation started", {
      source: simulationSource,
      riskStateA: snapshotA,
      riskStateB: snapshotB,
      simulationHorizon,
    });
  }

  useEffect(() => {
    return () => {
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
      registry: createInitialConstraintRegistry(),
      cascadeEvents: [] as CascadeEvent[],
    };
  }

  const stateA = engineARef.current
    ? engineARef.current.getState()
    : defaultEngineState(riskStateA);
  const stateB = engineBRef.current
    ? engineBRef.current.getState()
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

  const currentMarginA =
    marginHistoryA.length > 0
      ? marginHistoryA[marginHistoryA.length - 1]
      : null;

  const currentMarginB =
    marginHistoryB.length > 0
      ? marginHistoryB[marginHistoryB.length - 1]
      : null;

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

  const expertMinimumMargin = executiveSummary?.minimumMargin ?? null;
  const expertSteps = Math.max(marginHistoryA.length, marginHistoryB.length);
  const expertTippingStep = executiveSummary?.tippingStep ?? null;

  const primaryDriver = cascadeEventsA.length > 0 ? cascadeEventsA[0].sourceRisk : null;
  const cascadeEvents =
    cascadeEventsB.length > 0 ? cascadeEventsB : cascadeEventsA;

  const driverLabels = (pt as any).driverLabels ?? {};
  const riskLabels = (pt as any).riskLabels ?? {};
  const getRiskLabel = (key: string) =>
    driverLabels[key] ??
    riskLabels[key] ??
    EVENT_TRANSLATIONS[key as keyof typeof EVENT_TRANSLATIONS]?.[uiLanguage] ??
    key;

  const cascadeDepth = cascadeEventsA.length;
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

  const marginTrend: "declining" | "stable" | "improving" =
    marginHistoryB.length >= 2
      ? (() => {
          const start = marginHistoryB[0];
          const end = marginHistoryB[marginHistoryB.length - 1];
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

  return (
    <div
      style={{
        pointerEvents: "auto",
        width: "100%",
        maxWidth: "100%",
        marginLeft: "0",
        marginRight: "0",
        paddingLeft: "24px",
        paddingRight: "24px",
      }}
    >
      <div style={{ padding: "32px", background: theme.pageBg, color: theme.text }}>
        <h1 style={{ fontSize: "22px", marginBottom: "24px" }}>
          {domainTitles[domain]} — Decision Impact Simulation
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
      </div>
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
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
                setRiskStateA(structuredClone(pilotCase.riskStateA));
                setRiskStateB(structuredClone(pilotCase.riskStateB));
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
            {VISIBLE_PILOT_CASES.map((c) => (
              <option key={c.id} value={c.id}>
                {CASE_TRANSLATIONS[c.title as keyof typeof CASE_TRANSLATIONS]?.[uiLanguage] ?? c.title}
              </option>
            ))}
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
              padding: "8px 16px",
              background: showA && !showB ? "#2f333a" : "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "6px",
              color: "#e6edf3",
              cursor: "pointer",
            }}
          >
            Scenario A
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
              padding: "8px 16px",
              background: showB && !showA ? "#2f333a" : "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "6px",
              color: "#e6edf3",
              cursor: "pointer",
            }}
          >
            Scenario B
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
              padding: "8px 16px",
              background: showA && showB ? "#2f333a" : "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "6px",
              color: "#e6edf3",
              cursor: "pointer",
            }}
          >
            {pulseLanguage[uiLanguage].both}
          </button>
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
              Freeze Scenario A
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
              Freeze Scenario B
            </span>
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => {
              startSimulation("manual", riskStateA, riskStateB);
            }}
            style={{
              padding: "8px 16px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "6px",
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
              if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
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
                console.log("Executive summary", summary);
              } else {
                setExecutiveSummary(null);
                console.log("Executive summary", null);
              }
            }}
            style={{
              padding: "8px 16px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "6px",
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
                setRiskStateA(structuredClone(defaultRiskState));
                setRiskStateB(structuredClone(defaultRiskState));
              } else {
                const pilotCase = PILOT_CASES.find((c) => c.id === caseId);
                if (pilotCase) {
                  setRiskStateA(structuredClone(pilotCase.riskStateA));
                  setRiskStateB(structuredClone(pilotCase.riskStateB));
                }
              }
              setScenarioPromptA("");
              setScenarioPromptB("");
              setScenarioALabel("");
              setScenarioBLabel("");
              setIsDirty(false);
              setShowHelp(false);
            }}
            style={{
              padding: "8px 16px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "6px",
              color: "#e6edf3",
              cursor: "pointer",
            }}
          >
            {pulseLanguage[uiLanguage].reset}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setUiMode((m) => (m === "executive" ? "expert" : "executive"))}
          style={{
            padding: "6px 12px",
            fontSize: "12px",
            background: theme.buttonBg,
            border: `1px solid ${theme.buttonBorder}`,
            borderRadius: "6px",
            color: theme.text,
            cursor: "pointer",
          }}
        >
          {uiMode === "executive" ? "Executive Mode" : "Expert Mode"}
        </button>
      </div>
      {showHelp && (
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
      {selectedPilotCaseId && PILOT_CASES.find((c) => c.id === selectedPilotCaseId) && (
        <div style={{ marginBottom: "12px", fontSize: "12px", color: "#9ca3af" }}>
          {PILOT_CASES.find((c) => c.id === selectedPilotCaseId)?.oneLiner}
        </div>
      )}

      {isDirty && (
        <div style={{ marginBottom: "12px", fontSize: "13px", color: "#9ca3af" }}>
          {pt.actionNeedsStart}
        </div>
      )}

      <div
        style={{
          marginTop: "24px",
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <div style={{ position: "sticky", top: "16px" }}>
          <div style={{ marginBottom: "24px" }}>
            {Object.entries(groupedParameters).map(([groupName, params]) => (
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
                {params.map((param) => (
                  <div
                    key={param.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <span style={{ fontSize: "13px" }}>
                      {pulseLanguage[uiLanguage].riskLabels[param.key] ?? param.label}
                    </span>
                    <select
                      value={activeRiskState[param.key]}
                      disabled={!isEditableScenario}
                      onChange={(e) => {
                        setIsDirty(true);
                        const parameter = param.key;
                        const nextValue = e.target.value as RiskLevel;
                        if (activeScenario === "A") {
                          setRiskStateA((prev) => {
                            const nextState = {
                              ...prev,
                              [parameter]: nextValue,
                            };
                            return nextState;
                          });
                        } else if (activeScenario === "B") {
                          setRiskStateB((prev) => ({
                            ...prev,
                            [parameter]: nextValue,
                          }));
                        }
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
                ))}
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* Impact panel – margins above graph */}
          <div
            style={{
              marginBottom: "24px",
              padding: "16px 20px",
              background: "#111827",
              border: "1px solid #1f2937",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Nuvarande strategi – marginal</div>
                <div style={{ fontSize: "18px", fontWeight: 600 }}>
                  {stateA.margin.toFixed(5)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Alternativ strategi – marginal</div>
                <div style={{ fontSize: "18px", fontWeight: 600 }}>
                  {stateB.margin.toFixed(5)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Skillnad</div>
                <div style={{ fontSize: "16px", fontWeight: 600 }}>
                  {(stateB.margin - stateA.margin).toFixed(5)}
                </div>
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: "12px",
                  color: "#9CA3AF",
                  fontWeight: 500,
                  textAlign: "right",
                }}
              >
                {uiLanguage === "sv"
                  ? `Simulerad period: M1 → M${(stateA.step ?? 0) + 1}`
                  : `Simulated period: M1 → M${(stateA.step ?? 0) + 1}`}
              </div>
            </div>
          </div>

          {/* Margin trajectory graph */}
          <div
            style={{
              marginBottom: "12px",
              padding: "12px 16px",
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
        <MarginGraphLegendRow uiLanguage={uiLanguage} />
        {breachDifference !== null && (
          <div
            style={{
              fontSize: "13px",
              color: "#374151",
              marginBottom: "6px",
              fontWeight: 500,
            }}
          >
            {breachDifference <= 0
              ? pulseLanguage[uiLanguage].scenarioBDoesNotDelayBreach
              : (typeof pulseLanguage[uiLanguage].scenarioBDelaysBreachBy === "function"
                  ? pulseLanguage[uiLanguage].scenarioBDelaysBreachBy(breachDifference)
                  : String(pulseLanguage[uiLanguage].scenarioBDelaysBreachBy))}
          </div>
        )}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flex: 2, minWidth: 0 }}>
            <div
              style={{
                width: "100%",
                overflowX: "auto",
                overflowY: "hidden",
              }}
            >
              <div style={{ minWidth: 720 }}>
                {isDirty && (
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
                <div style={{ pointerEvents: "none" }}>
                <MarginGraph
                  marginHistoryA={marginHistoryA}
                  marginHistoryB={marginHistoryB}
                  displayMarginB={
                    marginHistoryA.length > 0 && marginHistoryB.length > 0
                      ? [marginHistoryA[0], ...marginHistoryB.slice(1)]
                      : marginHistoryB
                  }
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
                  scenarioALabel={scenarioALabel}
                  scenarioBLabel={scenarioBLabel}
                />
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: "#111827",
              borderRadius: 8,
              padding: 12,
              minWidth: 260,
            }}
          >
            {selectedMonthData && (
              <AIInspectorPanel
                language={uiLanguage}
                caseName={
                  PILOT_CASES.find((c) => c.id === selectedPilotCaseId)?.title ?? ""
                }
                tippingQuarter={
                  tippingMarginIndexB != null ? tippingMarginIndexB + 1 : null
                }
                currentMargin={finalA}
                alternativeMargin={finalB}
                marginImpact={finalB - finalA}
                cascadeEvents={cascadeEvents}
                cascadeEventsA={cascadeEventsA}
                cascadeEventsB={cascadeEventsB}
                seriesLengthA={marginHistoryA.length}
                seriesLengthB={marginHistoryB.length}
                simulationHorizon={simulationHorizon}
                primaryDriver={primaryDriver}
                systemPressure={systemPressure}
                constraintBreakQuarter={estimatedTimeToBreach}
                structuralStatus={t.structuralStatus[structuralStatusKey]}
                selectedMonthIndex={selectedMonthData?.monthIndex ?? null}
                selectedMarginValueA={selectedMonthData?.marginA ?? null}
                selectedMarginValueB={selectedMonthData?.marginB ?? null}
              />
            )}
          </div>
        </div>
        {selectedMonthData && (
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
              Scenario A:
              <strong>
                {" "}
                {selectedMonthData.marginA.toFixed(1)}%
              </strong>
            </div>

            <div>
              Scenario B:
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
        <div style={{ height: 8 }} />
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              marginBottom: 4,
            }}
          >
            Simulation horizon
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
          <span style={{ marginLeft: 8, fontSize: 11, color: "#9CA3AF" }}>Custom horizon</span>
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
        <select
          value={domain}
          onChange={(e) => {
            const newDomain = e.target.value as DomainKey;
            setDomain(newDomain);
            setActiveDomain(newDomain);
          }}
          style={{
            marginBottom: "10px",
            padding: "6px",
            borderRadius: "4px",
          }}
        >
          <option value="realEstate">Real Estate</option>
          <option value="municipal">Municipal</option>
          <option value="consulting">Consulting</option>
        </select>
        <div>
        <ScenarioLibrary
          debugTag="PILOT_FASTIGHET_PAGE"
          language={uiLanguage}
          scenarioTarget={scenarioTarget}
          onScenarioTargetChange={(target) => {
            setScenarioTarget(target);
          }}
          onSelectScenario={(presetId) => {
            console.log("[PULSE TARGET]", scenarioTarget);
            console.log("Scenario selected:", presetId);
            const presetLibrary = getScenarioLibrary(uiLanguage);
            const preset = presetLibrary.find((p) => p.id === presetId);
            const prompt = preset?.prompt ?? "";
            const nextPresetState = getRiskStateAfterPreset(presetId) as RiskState;
            const applyTo = scenarioTarget;

            if (scenarioTarget === "A") {
              setRiskStateA(structuredClone(nextPresetState));
              setScenarioPromptA(prompt);
              setAppliedScenarioAId(presetId);
            }
            if (scenarioTarget === "B") {
              setRiskStateB(structuredClone(nextPresetState));
              setScenarioPromptB(prompt);
              setAppliedScenarioBId(presetId);
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
        <ScenarioInterpretationPanel
          parsedScenarioEffectsA={parsedScenarioEffectsA}
          parsedScenarioEffectsB={parsedScenarioEffectsB}
          scenarioTextA={previewScenarioTextA}
          scenarioTextB={previewScenarioTextB}
          language={uiLanguage}
        />
        <SystemDriversPanel
          primaryDriver={primaryDriver ?? undefined}
          systemPressure={systemPressure}
          marginTrend={marginTrend}
          cascadeEventsA={cascadeEventsA}
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
        <ScenarioOutcomePanel
          breachA={tippingMarginIndexA != null ? tippingMarginIndexA + 1 : null}
          breachB={tippingMarginIndexB != null ? tippingMarginIndexB + 1 : null}
          finalMarginA={finalA}
          finalMarginB={finalB}
          breachDifference={breachDifference}
          language={uiLanguage}
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
        <WhyPanel
          primaryDriver={primaryDriver}
          cascadeEventsA={cascadeEventsA}
          cascadeEventsB={cascadeEventsB}
          marginImpact={finalB - finalA}
          breachDifference={breachDifference}
          language={uiLanguage}
          getRiskLabel={getRiskLabel}
        />
        <AIInterpretationPanel
          language={uiLanguage}
          tippingQuarter={
            tippingMarginIndexB != null ? tippingMarginIndexB + 1 : null
          }
          caseName={
            PILOT_CASES.find((c) => c.id === selectedPilotCaseId)?.title ?? ""
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
        />
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
        {selectedQuarter != null && (
          <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "8px" }}>
            M{selectedQuarter} — Scenario A: {marginHistoryA[selectedQuarter - 1]?.toFixed(2) ?? "—"} | Scenario B: {marginHistoryB[selectedQuarter - 1]?.toFixed(2) ?? "—"}
          </div>
        )}
      </div>

      {/* System Status panel – below graph */}
      <div
        style={{
          marginTop: "24px",
          marginBottom: "16px",
          padding: "16px 20px",
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "8px",
        }}
      >
        <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "8px" }}>{pt.systemStatus}</div>
        <div style={{ fontSize: "13px", lineHeight: 1.6 }}>
          <span style={{ color: "#9CA3AF" }}>{pulseLanguage[uiLanguage].scenarioAStatus} </span>
          <span style={{ color: colorA, fontWeight: 600 }}>
            {labelA}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.6, marginTop: "4px" }}>
          {pulseLanguage[uiLanguage].scenarioAMargin} {currentMarginA != null ? currentMarginA.toFixed(2) : "—"}
        </div>
        <div style={{ fontSize: "13px", lineHeight: 1.6, marginTop: "8px" }}>
          <span style={{ color: "#9CA3AF" }}>{pulseLanguage[uiLanguage].scenarioBStatus} </span>
          <span style={{ color: colorB, fontWeight: 600 }}>
            {labelB}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.6, marginTop: "4px" }}>
          {pulseLanguage[uiLanguage].scenarioBMargin} {currentMarginB != null ? currentMarginB.toFixed(2) : "—"}
        </div>
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #1f2937" }}>
          <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
            {(pt as any).capitalConstraint ?? "Capital constraint"}
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color:
                activeState.registry.RefinancingConstraint.lifecycle === "ACTIVE"
                  ? "#ef4444"
                  : "#22c55e",
            }}
          >
            {activeState.registry.RefinancingConstraint.lifecycle === "ACTIVE"
              ? ((pt as any).active ?? "ACTIVE")
              : ((pt as any).inactive ?? "INACTIVE")}
          </div>
        </div>
      </div>

      {/* System Cascade panel – shows first 6 cascade events */}
      <div
        style={{
          marginTop: "12px",
          marginBottom: "16px",
          padding: "12px 16px",
          background: "#0b1120",
          border: "1px solid #1f2937",
          borderRadius: "8px",
        }}
      >
        <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "4px" }}>
          {pt.primaryDriver}: {primaryDriver ? getRiskLabel(primaryDriver) : "—"}
        </div>
        <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "6px" }}>
          {pt.cascade}
        </div>
        {cascadeEventsA.length === 0 && cascadeEventsB.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#6B7280" }}>—</div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "12px",
              color: "#E5E7EB",
            }}
          >
            {cascadeEventsA.slice(0, 6).map((e, idx) => (
              <li key={`a-${idx}`} style={{ marginBottom: "2px" }}>
                A: {getRiskLabel(e.sourceRisk)} → {getRiskLabel(e.targetRisk)} ({e.level})
              </li>
            ))}
            {cascadeEventsB.slice(0, 6).map((e, idx) => (
              <li key={`b-${idx}`} style={{ marginBottom: "2px" }}>
                B: {getRiskLabel(e.sourceRisk)} → {getRiskLabel(e.targetRisk)} ({e.level})
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* System Pressure classification */}
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

      {!isRunning && executiveSummary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "24px",
            marginTop: "28px",
            alignItems: "stretch",
          }}
        >
          <div>
            <ExecutiveSummaryCard
              executiveSummary={executiveSummary}
              theme={theme}
              t={t}
              structuralStatusKey={structuralStatusKey}
              interpretation={interpretation}
              narrativeText={narrativeText}
              tippingStepA={tippingStepA}
              tippingStepB={tippingStepB}
            />
          </div>
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
        </div>
      )}

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
            Frozen Snapshots — Scenario A
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
            Frozen Snapshots — Scenario B
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
            Compare Frozen Snapshots (Scenario B − Scenario A)
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
            <strong>Scenario A:</strong> {snapA.engineState.margin.toFixed(3)}
            <br />
            <strong>Scenario B:</strong> {snapB.engineState.margin.toFixed(3)}
            <br />
            <strong>Margin impact:</strong> {(snapB.engineState.margin - snapA.engineState.margin).toFixed(3)}
            <br />
            <strong>Tipping (ACTIVE):</strong>{" "}
{tippingStepA != null ? `Scenario A: Q${tippingStepA}` : "Scenario A: never"} |{" "}
              {tippingStepB != null ? `Scenario B: Q${tippingStepB}` : "Scenario B: never"}
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
                <strong>Refinancing lifecycle (Scenario A):</strong> {snapA.engineState.registry.RefinancingConstraint.lifecycle}
                <br />
                <strong>Refinancing lifecycle (Scenario B):</strong> {snapB.engineState.registry.RefinancingConstraint.lifecycle}
                <br />
                <strong>Q (Scenario A):</strong> {snapA.engineState.step}
                <br />
                <strong>Q (Scenario B):</strong> {snapB.engineState.step}
              </>
            )}
          </div>
          {/* Self-check cases: (1) A tips at step 3, B at step 1 → conclusion B triggers earlier, tag Risk ↑.
              (2) B never tips → "B avoids ACTIVE while A triggers it" or "No ACTIVE tipping" if A also never.
              (3) Verify tags: Margin up/down, Stability up/down, Risk ↑ from lifecycle/tipping. */}
        </div>
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
                Expert Mode
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#9CA3AF" }}>
                Structural inspection layer
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUiMode("executive")}
              aria-label="Close Expert Mode"
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

          <section style={{ marginBottom: "28px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#9CA3AF",
                marginBottom: "12px",
              }}
            >
              Structural Metrics
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
                <span>Tipping (Q)</span>
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
                <span>quarters</span>
                <span style={{ color: "#9CA3AF", fontVariantNumeric: "tabular-nums" }}>
                  {expertSteps}
                </span>
              </div>
            </div>
          </section>

          <div style={{ height: "1px", background: "#1F2937", marginBottom: "28px" }} />

          <section style={{ marginBottom: "28px" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#9CA3AF",
                marginBottom: "12px",
              }}
            >
              Constraint View
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
                    ? `Sustain threshold crossed at Q${sustainBreachStep}`
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
                    ? `Collapse threshold crossed at Q${collapseBreachStep}`
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
                    System stabilized at M{steadyStateStep}. No structural change detected for {REQUIRED_STABLE_TICKS} consecutive ticks (after minimum {MIN_STEPS_BEFORE_STEADY} quarters).
                  </span>
                </div>
              )}
            </div>
          </section>

          <div style={{ height: "1px", background: "#1F2937", marginBottom: "28px" }} />

          <section style={{ marginBottom: "0" }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#9CA3AF",
                marginBottom: "10px",
              }}
            >
              Scenario Metadata
            </div>
            <div style={{ fontSize: "13px", color: "#6B7280" }}>—</div>
          </section>
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
