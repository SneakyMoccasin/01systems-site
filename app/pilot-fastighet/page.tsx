"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getSystemSnapshot } from "@/src/systemSnapshot/systemSnapshotStore";
import { RealEstateEngine } from "@/src/pilotFastighet/RealEstateEngine";
import { createInitialConstraintRegistry } from "@/src/pilotFastighet/constraintState";
import { REAL_ESTATE_IMPACT_CONTRACT } from "@/src/pilotFastighet/impactContract";
import type { RiskLevel } from "@/src/pilotFastighet/impactContract";
import {
  findTippingIndex,
  buildExecutiveConclusion,
} from "@/src/pilotFastighet/compareHelpers";
import { PILOT_CASES } from "@/src/pilotFastighet/pilotCases";
import { calculateExecutiveSummary } from "@/src/pilotFastighet/analysis/calculateExecutiveSummary";
import { SnapshotCompare } from "@/src/pilotFastighet/components/SnapshotCompare";
import { ExecutiveSummaryCard } from "@/app/pilot-fastighet/components/ExecutiveSummaryCard";
import { UI_TEXT, type Language } from "@/src/pilotFastighet/uiText";

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
  type ScenarioId = "A" | "B";

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

  const defaultRiskState = {
    demandRisk: "MODERATE",
    pricingPowerRisk: "MODERATE",
    tenantStabilityRisk: "MODERATE",
    maintenanceIntensityRisk: "MODERATE",
    operationalEfficiencyRisk: "MODERATE",
    energyExposureRisk: "MODERATE",
    interestRateExposureRisk: "MODERATE",
    leverageLevelRisk: "MODERATE",
    refinancingRisk: "MODERATE",
    marketVolatilityRisk: "MODERATE",
    regulatoryPressureRisk: "MODERATE",
    capitalCommitmentRigidityRisk: "MODERATE",
  } as const satisfies Record<string, RiskLevel>;

  const [riskStateA, setRiskStateA] = useState<Record<string, RiskLevel>>({ ...defaultRiskState });
  const [riskStateB, setRiskStateB] = useState<Record<string, RiskLevel>>({ ...defaultRiskState });
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("A");
  const [showA, setShowA] = useState(true);
  const [showB, setShowB] = useState(true);

  const [historyA, setHistoryA] = useState<FrozenSnapshot[]>([]);
  const [historyB, setHistoryB] = useState<FrozenSnapshot[]>([]);
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
  const [tippingMarginIndexA, setTippingMarginIndexA] = useState<number | null>(null);
  const [tippingMarginIndexB, setTippingMarginIndexB] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedPilotCaseId, setSelectedPilotCaseId] = useState<string>("");
  const [isAutoScale, setIsAutoScale] = useState(false);
  const [freezeFlash, setFreezeFlash] = useState<"A" | "B" | null>(null);
  const [uiTheme, setUiTheme] = useState<"dark" | "light">("dark");
  const [uiLanguage, setUiLanguage] = useState<Language>("sv");
  const [uiMode, setUiMode] = useState<"executive" | "expert">("executive");
  const [executiveSummary, setExecutiveSummary] =
    useState<ReturnType<typeof calculateExecutiveSummary> | null>(null);
  const [steadyStateStep, setSteadyStateStep] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const engineARef = useRef<RealEstateEngine | null>(null);
  const engineBRef = useRef<RealEstateEngine | null>(null);
  const lastMarginARef = useRef<number | null>(null);
  const lastMarginBRef = useRef<number | null>(null);
  const stableCounterARef = useRef(0);
  const stableCounterBRef = useRef(0);

  useEffect(() => {
    setHistoryA(loadHistory(STORAGE_KEY_A));
    setHistoryB(loadHistory(STORAGE_KEY_B));
  }, []);

  const [, setRenderTick] = useState(0);

  function resetRunState() {
    setMarginHistoryA([]);
    setMarginHistoryB([]);
    setTippingMarginIndexA(null);
    setTippingMarginIndexB(null);
    setExecutiveSummary(null);
    setSteadyStateStep(null);

    lastMarginARef.current = null;
    lastMarginBRef.current = null;
    stableCounterARef.current = 0;
    stableCounterBRef.current = 0;
  }

  function startSimulation() {
    setIsRunning(false);
    resetRunState();
    const snapshotA = { ...riskStateA };
    const snapshotB = { ...riskStateB };
    engineARef.current = new RealEstateEngine(snapshotA);
    engineBRef.current = new RealEstateEngine(snapshotB);
    setIsDirty(false);
    setIsRunning(true);
  }

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      if (!engineARef.current || !engineBRef.current) return;
      const engineA = engineARef.current;
      const engineB = engineBRef.current;
      engineA.stepForward();
      engineB.stepForward();
      const sA = engineA.getState();
      const sB = engineB.getState();

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
      setRenderTick((t) => t + 1);
    }, 350);
    return () => window.clearInterval(id);
  }, [isRunning]);

  function defaultEngineState(riskState: Record<string, RiskLevel>) {
    return {
      step: 1,
      margin: 1,
      riskState,
      registry: createInitialConstraintRegistry(),
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

  const activeRiskState = activeScenario === "A" ? riskStateA : riskStateB;
  const setActiveRiskState = activeScenario === "A" ? setRiskStateA : setRiskStateB;

  function freezeScenarioA() {
    const snap: FrozenSnapshot = {
      snapshotId: new Date().toISOString(),
      label: "Current Strategy",
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
      label: "Alternative Strategy",
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

  const groupedParameters = REAL_ESTATE_IMPACT_CONTRACT.reduce(
    (acc, param) => {
      if (!acc[param.group]) {
        acc[param.group] = [];
      }
      acc[param.group].push(param);
      return acc;
    },
    {} as Record<string, typeof REAL_ESTATE_IMPACT_CONTRACT>
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

  const systemStatus = (() => {
    if (!executiveSummary) return "IDLE";

    const structuralB = executiveSummary.structuralStatusB;

    if (structuralB === "structural_collapse") return "COLLAPSED";
    if (structuralB === "structural_breakdown" || structuralB === "functioning_but_doomed") {
      return "PRESSURED";
    }
    return "STABLE";
  })();

  const systemStatusLabel =
    executiveSummary
      ? `Alternative Strategy: ${
          t.structuralStatus[
            executiveSummary.structuralStatusB ?? "stable"
          ]
        }`
      : "IDLE";

  const systemStatusMinLine = executiveSummary
    ? `Min Current: ${executiveSummary.minimumMarginA.toFixed(2)} | Min Alternative: ${executiveSummary.minimumMarginB.toFixed(2)}`
    : null;

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
          ? `Q${executiveSummary.tippingStep}`
          : "";
        return executiveSummary.tippingStep
          ? t.common.narrative.withTipping(deltaStr, statusStr, tippingQ)
          : t.common.narrative.noTipping(deltaStr, statusStr);
      })()
    : "";

  const expertMinimumMargin = executiveSummary?.minimumMargin ?? null;
  const expertSteps = Math.max(marginHistoryA.length, marginHistoryB.length);
  const expertTippingStep = executiveSummary?.tippingStep ?? null;

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

  // ==================================================
  // 6️⃣ UI
  // ==================================================

  return (
    <div
      style={{
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
          Real Estate Portfolio – Decision Impact Analysis
        </h1>

      <div
        style={{
          marginBottom: "16px",
          display: "flex",
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
            if (id === "") return;
            const pilotCase = PILOT_CASES.find((c) => c.id === id);
            if (pilotCase) {
              setRiskStateA({ ...pilotCase.riskStateA });
              setRiskStateB({ ...pilotCase.riskStateB });
              setIsDirty(true);
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
              {c.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setShowA(true);
            setShowB(false);
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
          Current
        </button>
        <button
          type="button"
          onClick={() => {
            setShowA(false);
            setShowB(true);
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
          Alternative
        </button>
        <button
          type="button"
          onClick={() => {
            setShowA(true);
            setShowB(true);
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
          Both
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
            Freeze Current
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
            Freeze Alternative
          </span>
        </button>
        <button
          type="button"
          disabled={isRunning}
          onClick={startSimulation}
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
            setIsRunning(false);
            resetRunState();
            setIsDirty(true);

            const caseId = selectedPilotCaseId;

            if (!caseId) {
              // Custom: reset all risks to LOW
              const lowRiskState = Object.keys(defaultRiskState).reduce(
                (acc, key) => {
                  acc[key] = "LOW";
                  return acc;
                },
                {} as Record<string, RiskLevel>
              );
              setRiskStateA({ ...lowRiskState });
              setRiskStateB({ ...lowRiskState });
            } else {
              const pilotCase = PILOT_CASES.find((c) => c.id === caseId);
              if (pilotCase) {
                setRiskStateA({ ...pilotCase.riskStateA });
                setRiskStateB({ ...pilotCase.riskStateB });
              }
            }
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
          Reset
        </button>
        <button
          type="button"
          onClick={() => setIsAutoScale((v) => !v)}
          style={{
            padding: "8px 16px",
            background: "#1a1a1a",
            border: "1px solid #2f333a",
            borderRadius: "6px",
            color: "#e6edf3",
            cursor: "pointer",
          }}
        >
          {isAutoScale ? "Auto-scale: ON" : "Auto-scale: OFF"}
        </button>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => setUiLanguage((l) => (l === "sv" ? "en" : "sv"))}
            style={{
              padding: "8px 16px",
              background: theme.buttonBg,
              border: `1px solid ${theme.buttonBorder}`,
              borderRadius: "6px",
              color: theme.text,
              cursor: "pointer",
            }}
          >
            {uiLanguage === "sv" ? "SV" : "EN"}
          </button>
          <button
            type="button"
            onClick={() =>
              setUiTheme((t) => (t === "dark" ? "light" : "dark"))
            }
            style={{
              padding: "8px 16px",
              background: theme.buttonBg,
              border: `1px solid ${theme.buttonBorder}`,
              borderRadius: "6px",
              color: theme.text,
              cursor: "pointer",
            }}
          >
            {uiTheme === "dark" ? "Theme: Dark" : "Theme: Light"}
          </button>
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
      </div>
      {selectedPilotCaseId && PILOT_CASES.find((c) => c.id === selectedPilotCaseId) && (
        <div style={{ marginBottom: "12px", fontSize: "12px", color: "#9ca3af" }}>
          {PILOT_CASES.find((c) => c.id === selectedPilotCaseId)?.oneLiner}
        </div>
      )}

      {isDirty && (
        <div style={{ marginBottom: "12px", fontSize: "13px", color: "#9ca3af" }}>
          New action selected — press Start to simulate.
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
                    <span style={{ fontSize: "13px" }}>{param.label}</span>
                    <select
                      value={activeRiskState[param.key]}
                      onChange={(e) => {
                        setIsDirty(true);
                        setActiveRiskState({
                          ...activeRiskState,
                          [param.key]: e.target.value as RiskLevel,
                        });
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
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Current Strategy margin</div>
                <div style={{ fontSize: "18px", fontWeight: 600 }}>
                  {stateA.margin.toFixed(5)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Alternative Strategy margin</div>
                <div style={{ fontSize: "18px", fontWeight: 600 }}>
                  {stateB.margin.toFixed(5)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Δ Impact</div>
                <div style={{ fontSize: "16px", fontWeight: 600 }}>
                  {(stateB.margin - stateA.margin).toFixed(5)}
                </div>
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
        <div
          style={{
            fontSize: "12px",
            color: "#9CA3AF",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "8px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "12px",
                borderTop: "2px solid #2563eb",
              }}
            />
            {t.common.legend.scenarioA}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "12px",
                borderTop: "2px dashed #2563eb",
              }}
            />
            {t.common.legend.scenarioB}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "12px",
                borderTop: "1.5px dashed #9CA3AF",
              }}
            />
            {t.common.legend.sustain}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "12px",
                borderTop: "2px solid",
                borderTopColor: theme.graphBg === "#0b0f14" ? "#E5E7EB" : "#4B5563",
              }}
            />
            {t.common.legend.zeroLine}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "12px",
                borderTop: "1px dashed #374151",
              }}
            />
            {t.common.legend.grid}
          </span>
        </div>
        <svg
          ref={svgRef}
          viewBox="0 0 600 300"
          preserveAspectRatio="none"
          width="100%"
          height={480}
          style={{ display: "block", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "4px", minHeight: 480 }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const LEFT_PADDING = 55;
            const graphWidth = 600 - LEFT_PADDING - 10;
            const viewBoxX = (e.clientX - rect.left) / rect.width * 600;
            const x = viewBoxX - LEFT_PADDING;
            const quarterWidth =
              graphWidth / Math.max(marginHistoryA.length - 1, 1);
            const clampedX = Math.max(0, Math.min(x, graphWidth));
            const index = Math.round(clampedX / quarterWidth);
            if (index >= 0 && index < marginHistoryA.length) {
              setHoverIndex(index);
            } else {
              setHoverIndex(null);
            }
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {(() => {
            const startMargin = marginHistoryA.length > 0 ? marginHistoryA[0] : 1;
            const LEFT_PADDING = 55;
            const totalSteps = Math.max(marginHistoryA.length, marginHistoryB.length, 1);
            const graphWidth = 600 - LEFT_PADDING - 10;
            const scaleX = (index: number) => {
              if (totalSteps <= 1) return LEFT_PADDING;
              return LEFT_PADDING + (index / (totalSteps - 1)) * graphWidth;
            };

            const displayMarginB =
              marginHistoryA.length > 0 && marginHistoryB.length > 0
                ? [marginHistoryA[0], ...marginHistoryB.slice(1)]
                : marginHistoryB;

            const allMargins = [...marginHistoryA, ...displayMarginB];

            const dataMax =
              allMargins.length > 0
                ? Math.max(...allMargins)
                : 1;

            const dataMin =
              allMargins.length > 0
                ? Math.min(...allMargins)
                : 0;

            const padding = 0.1;
            let yMax: number;
            let yMin: number;
            if (isAutoScale) {
              yMax = dataMax + padding;
              yMin = dataMin - padding;
            } else {
              yMax = 1.2;
              yMin = -1.0;
            }

            const range = yMax - yMin;
            const TOP_PADDING = 12;
            const BOTTOM_PADDING = 8;
            const gridLevels = 4;
            const scaleY = (value: number) =>
              TOP_PADDING +
              ((yMax - value) / (yMax - yMin)) * (300 - TOP_PADDING - BOTTOM_PADDING);
            const pointsA = marginHistoryA.map((m, i) => `${scaleX(i)},${scaleY(m)}`).join(" ");
            const pointsB = displayMarginB.map((m, i) => `${scaleX(i)},${scaleY(m)}`).join(" ");
            const zeroBetween = yMin <= 0 && yMax >= 0;
            const numYTicks = 9;
            const yTickValues = Array.from({ length: numYTicks }, (_, i) =>
              yMin + (range / (numYTicks - 1)) * i
            );

            const tippingIndex = tippingMarginIndexB ?? null;
            const tippingMargin =
              tippingIndex !== null && marginHistoryB[tippingIndex] !== undefined
                ? marginHistoryB[tippingIndex]
                : null;
            const tippingY =
              tippingMargin !== null ? scaleY(tippingMargin) : null;

            return (
              <>
                <rect x={0} y={0} width={600} height={300} fill="white" />
                {/* Y-axis line */}
                <line x1={LEFT_PADDING} y1={0} x2={LEFT_PADDING} y2={300} stroke="#9ca3af" strokeWidth={1} />
                {Array.from({ length: gridLevels }).map((_, i) => {
                  const value = yMin + (range / (gridLevels - 1)) * i;
                  const y = scaleY(value);

                  return (
                    <line
                      key={`grid-${i}`}
                      x1={LEFT_PADDING}
                      x2={600}
                      y1={y}
                      y2={y}
                      stroke="#94a3b8"
                      strokeWidth={1}
                      strokeOpacity={0.18}
                    />
                  );
                })}
                <line
                  x1={LEFT_PADDING}
                  x2={600}
                  y1={scaleY(EXEC_SUSTAIN_THRESHOLD)}
                  y2={scaleY(EXEC_SUSTAIN_THRESHOLD)}
                  stroke="#9CA3AF"
                  strokeWidth={1.25}
                  strokeDasharray="6 4"
                  opacity={0.85}
                />
                {yTickValues.map((value, i) => (
                  <text
                    key={`ytick-${i}`}
                    x={LEFT_PADDING - 8}
                    y={scaleY(value)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize="11"
                    fill="#6b7280"
                  >
                    {value.toFixed(2)}
                  </text>
                ))}
                {zeroBetween && (
                  <line
                    x1={LEFT_PADDING}
                    y1={scaleY(0)}
                    x2={600}
                    y2={scaleY(0)}
                    stroke={theme.graphBg === "#0b0f14" ? "#E5E7EB" : "#4B5563"}
                    strokeWidth={2}
                  />
                )}
                {tippingIndex !== null && tippingY !== null && (
                  <rect
                    x={scaleX(tippingIndex)}
                    y={tippingY}
                    width={scaleX(tippingIndex + 2) - scaleX(tippingIndex)}
                    height={300 - tippingY}
                    fill="#f97316"
                    opacity={0.11}
                  />
                )}
                {tippingIndex !== null && tippingY !== null && (
                  <text
                    x={scaleX(tippingIndex + 1)}
                    y={tippingY + (300 - tippingY) / 2}
                    fill="#ea580c"
                    fontSize="12"
                    fontWeight={500}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    opacity={0.9}
                  >
                    Tipping risk
                  </text>
                )}
                {hoverIndex !== null && (
                  <line
                    x1={scaleX(hoverIndex)}
                    x2={scaleX(hoverIndex)}
                    y1={0}
                    y2={300}
                    stroke="#9ca3af"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                  />
                )}
                {hoverIndex !== null && marginHistoryA[hoverIndex] !== undefined && (
                  <circle
                    cx={scaleX(hoverIndex)}
                    cy={scaleY(marginHistoryA[hoverIndex])}
                    r={4}
                    fill="#2563eb"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                )}
                {hoverIndex !== null && marginHistoryB[hoverIndex] !== undefined && (
                  <circle
                    cx={scaleX(hoverIndex)}
                    cy={scaleY(marginHistoryB[hoverIndex])}
                    r={4}
                    fill="#2563eb"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                )}
                {hoverIndex !== null && marginHistoryA[hoverIndex] !== undefined && (
                  <g>
                    <rect
                      x={scaleX(hoverIndex) - 60}
                      y={20}
                      width={120}
                      height={50}
                      fill="#111"
                      stroke="#333"
                      rx={6}
                    />
                    <text
                      x={scaleX(hoverIndex)}
                      y={36}
                      fill="white"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      {`Q${hoverIndex + 1}`}
                    </text>
                    <text
                      x={scaleX(hoverIndex)}
                      y={50}
                      fill="#2563eb"
                      fontSize="11"
                      textAnchor="middle"
                    >
                      {`Current: ${marginHistoryA[hoverIndex].toFixed(2)}`}
                    </text>
                    {marginHistoryB[hoverIndex] !== undefined && (
                      <text
                        x={scaleX(hoverIndex)}
                        y={64}
                        fill="#2563eb"
                        fontSize="11"
                        textAnchor="middle"
                      >
                        {`Alternative: ${marginHistoryB[hoverIndex].toFixed(2)}`}
                      </text>
                    )}
                  </g>
                )}
                {marginHistoryA.length > 0 && (
                  <circle
                    cx={scaleX(0)}
                    cy={scaleY(marginHistoryA[0])}
                    r={4}
                    fill="white"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                )}
                {showA && pointsA ? <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={pointsA} /> : null}
                {showB && pointsB ? <polyline fill="none" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 4" points={pointsB} /> : null}
                {showA && tippingMarginIndexA != null && marginHistoryA[tippingMarginIndexA] != null && (
                  <circle cx={scaleX(tippingMarginIndexA)} cy={scaleY(marginHistoryA[tippingMarginIndexA])} r={4} fill="#3b82f6" />
                )}
              </>
            );
          })()}
        </svg>
        {(() => {
          const totalSteps = Math.max(marginHistoryA.length, marginHistoryB.length);
          if (totalSteps <= 0) return null;
          const LEFT_PADDING = 55;
          const graphWidth = 600 - LEFT_PADDING - 10;
          const scaleX = (index: number) => {
            if (totalSteps <= 1) return LEFT_PADDING;
            return LEFT_PADDING + (index / (totalSteps - 1)) * graphWidth;
          };
          const approxMaxLabels = 6;
          const labelInterval = Math.max(1, Math.ceil(totalSteps / approxMaxLabels));
          const indices: number[] = [];
          for (let i = 0; i < totalSteps; i++) {
            if (i % labelInterval === 0) indices.push(i);
          }
          return (
            <div
              style={{
                position: "relative",
                height: "18px",
                marginTop: "4px",
                fontSize: "13px",
                color: "#9CA3AF",
              }}
            >
              {indices.map((i) => (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${(scaleX(i) / 600) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {`Q${i + 1}`}
                </span>
              ))}
            </div>
          );
        })()}
        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#6B7280",
            marginTop: "4px",
            letterSpacing: "0.04em",
          }}
        >
          Kvartal
        </div>
        {selectedQuarter != null && (
          <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "8px" }}>
            Q{selectedQuarter} — Current: {marginHistoryA[selectedQuarter - 1]?.toFixed(2) ?? "—"} | Alternative: {marginHistoryB[selectedQuarter - 1]?.toFixed(2) ?? "—"}
          </div>
        )}
      </div>

      {/* System Status panel – below graph */}
      <div
        style={{
          marginTop: "24px",
          marginBottom: "32px",
          padding: "16px 20px",
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "8px",
        }}
      >
        <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "8px" }}>System Status</div>
        {executiveSummary && (
          <>
            <div style={{ fontSize: "13px", lineHeight: 1.6, marginTop: "6px" }}>
              <span style={{ color: "#9CA3AF" }}>Current: </span>
              <span style={{ color: executiveSummary.structuralStatusA === "stable" ? "#22c55e" : "#f97316", fontWeight: 600 }}>
                {t.structuralStatus[executiveSummary.structuralStatusA ?? "stable"]}
              </span>
            </div>
            <div style={{ fontSize: "13px", lineHeight: 1.6, marginTop: "6px" }}>
              <span style={{ color: "#9CA3AF" }}>Alternative: </span>
              <span style={{ color: executiveSummary.structuralStatusB === "structural_collapse" ? "#ef4444" : executiveSummary.structuralStatusB === "structural_breakdown" ? "#f97316" : "#9CA3AF", fontWeight: 600 }}>
                {t.structuralStatus[executiveSummary.structuralStatusB ?? "stable"]}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.6, marginTop: "6px" }}>
              Lowest margin (Current): {executiveSummary.minimumMarginA.toFixed(2)}
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.6, marginTop: "6px" }}>
              Lowest margin (Alternative): {executiveSummary.minimumMarginB.toFixed(2)}
            </div>
            <div style={{ fontSize: "12px", color: "#9CA3AF", lineHeight: 1.6, marginTop: "6px" }}>
              Buffer compression: {executiveSummary.compression.toFixed(2)} p.p.
            </div>
          </>
        )}
        {!executiveSummary && (
          <div style={{ fontSize: "13px", color: "#9CA3AF" }}>—</div>
        )}
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #1f2937" }}>
          <div style={{ fontSize: "12px", color: "#9CA3AF" }}>Capital Constraint</div>
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
              ? "ACTIVE"
              : "NONE"}
          </div>
        </div>
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
            Frozen Snapshots — Current Strategy
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
            Frozen Snapshots — Alternative Strategy
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
            Compare Frozen Snapshots (Alternative − Current)
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
            <strong>Current Strategy:</strong> {snapA.engineState.margin.toFixed(3)}
            <br />
            <strong>Alternative Strategy:</strong> {snapB.engineState.margin.toFixed(3)}
            <br />
            <strong>Margin impact:</strong> {(snapB.engineState.margin - snapA.engineState.margin).toFixed(3)}
            <br />
            <strong>Tipping (ACTIVE):</strong>{" "}
            {tippingStepA != null ? `Current: Q${tippingStepA}` : "Current: never"} |{" "}
            {tippingStepB != null ? `Alternative: Q${tippingStepB}` : "Alternative: never"}
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
                <strong>Refinancing lifecycle (Current):</strong> {snapA.engineState.registry.RefinancingConstraint.lifecycle}
                <br />
                <strong>Refinancing lifecycle (Alternative):</strong> {snapB.engineState.registry.RefinancingConstraint.lifecycle}
                <br />
                <strong>Q (Current):</strong> {snapA.engineState.step}
                <br />
                <strong>Q (Alternative):</strong> {snapB.engineState.step}
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
                  {expertTippingStep != null ? `Q${expertTippingStep}` : "—"}
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
                    System stabilized at Q{steadyStateStep}. No structural change detected for {REQUIRED_STABLE_TICKS} consecutive ticks (after minimum {MIN_STEPS_BEFORE_STEADY} quarters).
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
    </div>
  );
}
