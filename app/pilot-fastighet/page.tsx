"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getSystemSnapshot } from "@/src/systemSnapshot/systemSnapshotStore";
import { RealEstateEngine } from "@/src/pilotFastighet/RealEstateEngine";
import { REAL_ESTATE_IMPACT_CONTRACT } from "@/src/pilotFastighet/impactContract";
import type { RiskLevel } from "@/src/pilotFastighet/impactContract";
import {
  findTippingIndex,
  buildExecutiveConclusion,
} from "@/src/pilotFastighet/compareHelpers";
import { PILOT_CASES } from "@/src/pilotFastighet/pilotCases";
import { calculateExecutiveSummary } from "@/src/pilotFastighet/analysis/calculateExecutiveSummary";
import { SnapshotCompare } from "@/src/pilotFastighet/components/SnapshotCompare";
import { UI_TEXT, type Language } from "@/src/pilotFastighet/uiText";

const STORAGE_KEY_A = "pulse_pilot_fastighet_history_A";
const STORAGE_KEY_B = "pulse_pilot_fastighet_history_B";
const SNAPSHOT_LABELS_KEY = "pulse.snapshotLabels.v1";
const EXEC_TIPPING_THRESHOLD = 0.9;
const EXEC_SUSTAIN_THRESHOLD = 0.8;
const EXEC_COLLAPSE_THRESHOLD = 0.6;

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
    scenarioId: "A" | "B";
    label: string;
    createdAt: number;
    riskState: Record<string, RiskLevel>;
    engineState: ReturnType<RealEstateEngine["getState"]>;
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
  const [uiTheme, setUiTheme] = useState<"dark" | "light">("dark");
  const [uiLanguage, setUiLanguage] = useState<Language>("sv");
  const [executiveSummary, setExecutiveSummary] =
    useState<ReturnType<typeof calculateExecutiveSummary> | null>(null);

  const engineARef = useRef<RealEstateEngine | null>(null);
  const engineBRef = useRef<RealEstateEngine | null>(null);

  if (!engineARef.current) engineARef.current = new RealEstateEngine(riskStateA);
  if (!engineBRef.current) engineBRef.current = new RealEstateEngine(riskStateB);

  const engineA = engineARef.current;
  const engineB = engineBRef.current;

  useEffect(() => {
    setHistoryA(loadHistory(STORAGE_KEY_A));
    setHistoryB(loadHistory(STORAGE_KEY_B));
  }, []);

  useEffect(() => {
    engineA.setRiskState(riskStateA);
  }, [riskStateA]);

  useEffect(() => {
    engineB.setRiskState(riskStateB);
  }, [riskStateB]);

  const [, setRenderTick] = useState(0);

  function resetAll() {
    engineA.reset();
    engineB.reset();
    setMarginHistoryA([]);
    setMarginHistoryB([]);
    setTippingMarginIndexA(null);
    setTippingMarginIndexB(null);
  }

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      engineA.stepForward();
      engineB.stepForward();
      const sA = engineA.getState();
      const sB = engineB.getState();
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

  const stateA = engineA.getState();
  const stateB = engineB.getState();

  const activeState = activeScenario === "A" ? stateA : stateB;
  const activeRiskState = activeScenario === "A" ? riskStateA : riskStateB;
  const setActiveRiskState = activeScenario === "A" ? setRiskStateA : setRiskStateB;

  function freezeScenarioA() {
    const snap: FrozenSnapshot = {
      snapshotId: new Date().toISOString(),
      scenarioId: "A",
      label: "Scenario A",
      createdAt: Date.now(),
      riskState: { ...riskStateA },
      engineState: JSON.parse(JSON.stringify(stateA)),
    };
    const next = [snap, ...historyA];
    setHistoryA(next);
    saveHistory(STORAGE_KEY_A, next);
  }

  function freezeScenarioB() {
    const snap: FrozenSnapshot = {
      snapshotId: new Date().toISOString(),
      scenarioId: "B",
      label: "Scenario B",
      createdAt: Date.now(),
      riskState: { ...riskStateB },
      engineState: JSON.parse(JSON.stringify(stateB)),
    };
    const next = [snap, ...historyB];
    setHistoryB(next);
    saveHistory(STORAGE_KEY_B, next);
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
  const severityA =
    snapA?.engineState?.registry?.RefinancingConstraint?.severityIndex ?? 0;
  const severityB =
    snapB?.engineState?.registry?.RefinancingConstraint?.severityIndex ?? 0;
  const stabilityA = 1 - severityA;
  const stabilityB = 1 - severityB;
  const deltaStability =
    snapA != null && snapB != null ? stabilityB - stabilityA : undefined;
  const lifecycleA =
    snapA?.engineState?.registry?.RefinancingConstraint?.lifecycle ?? undefined;
  const lifecycleB =
    snapB?.engineState?.registry?.RefinancingConstraint?.lifecycle ?? undefined;

  const executiveConclusion =
    deltaMargin !== undefined
      ? buildExecutiveConclusion({
          deltaMargin,
          deltaStability,
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
  const structuralStatusA = "Baseline reference";

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

  const mapStructuralStatusKey = (
    status: string
  ): keyof typeof UI_TEXT.sv.structuralStatus => {
    if (status === "Strukturell kollaps") return "structural_collapse";
    if (status === "Marginell överskridelse") return "marginal_exceedance";
    if (status === "Fungerande men dömd") return "functioning_but_doomed";
    return "stable";
  };

  const structuralStatusKey = executiveSummary
    ? mapStructuralStatusKey(executiveSummary.structuralStatus)
    : "stable";

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
              setRiskStateA(pilotCase.riskStateA);
              setRiskStateB(pilotCase.riskStateB);
              setIsDirty(true);
              setIsRunning(false);
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
          {PILOT_CASES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setActiveScenario("A");
          }}
          style={{
            padding: "8px 16px",
            background: activeScenario === "A" ? "#2f333a" : "#1a1a1a",
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
          onClick={() => {
            setActiveScenario("B");
          }}
          style={{
            padding: "8px 16px",
            background: activeScenario === "B" ? "#2f333a" : "#1a1a1a",
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
          Freeze Scenario A
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
          Freeze Scenario B
        </button>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => {
            resetAll();
            setIsDirty(false);
            setExecutiveSummary(null);
            setIsRunning(true);
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
            setIsRunning(false);
            if (marginHistoryA.length > 0 && marginHistoryB.length > 0) {
              const summary = calculateExecutiveSummary({
                marginSeriesA: marginHistoryA,
                marginSeriesB: marginHistoryB,
                tippingThreshold: EXEC_TIPPING_THRESHOLD,
                sustainThreshold: EXEC_SUSTAIN_THRESHOLD,
                collapseThreshold: EXEC_COLLAPSE_THRESHOLD,
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
            resetAll();
            setRiskStateA({ ...defaultRiskState });
            setRiskStateB({ ...defaultRiskState });
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

      <div style={{ marginBottom: "24px" }}>
        <strong>Margin A:</strong> {stateA.margin.toFixed(3)}
        <br />
        <strong>Margin B:</strong> {stateB.margin.toFixed(3)}
        <br />
        <strong>Δ (B−A):</strong> {(stateB.margin - stateA.margin).toFixed(3)}
        <br />
        Q{activeState.step}
        <br />
        <strong>Lifecycle:</strong>{" "}
        {activeState.registry.RefinancingConstraint.lifecycle}
        <br />
        <strong>Severity:</strong>{" "}
        {activeState.registry.RefinancingConstraint.severityIndex.toFixed(4)}
        <br />
        <strong>Margin (active):</strong> {activeState.margin.toFixed(3)}
      </div>

      <div
        style={{
          marginTop: "32px",
          marginBottom: "12px",
          padding: "12px 16px",
          border: `1px solid ${theme.graphBorder}`,
          borderRadius: "8px",
          background: theme.graphBg,
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
                borderTop: "2px solid #3b82f6",
              }}
            />
            {t.common.legend.scenarioA}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                width: "12px",
                borderTop: "2px solid #f97316",
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
                borderTop: "1px dashed #4b5563",
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
        <svg width={600} height={300} style={{ display: "block", background: "#0e1117", border: "1px solid #2f333a", borderRadius: "4px" }}>
          {(() => {
            const totalSteps = Math.max(marginHistoryA.length, marginHistoryB.length, 1);
            const scaleX = (i: number) => {
              if (totalSteps <= 1) return 0;
              return (i / (totalSteps - 1)) * 600;
            };
            let minY = 0;
            let maxY = 1.5;
            const marginHistoryActive = [...marginHistoryA, ...marginHistoryB];
            if (isAutoScale && marginHistoryActive.length > 0) {
              const dynamicMin = Math.min(...marginHistoryActive);
              const dynamicMax = Math.max(...marginHistoryActive);
              const padding = (dynamicMax - dynamicMin) * 0.1 || 0.1;
              minY = dynamicMin - padding;
              maxY = dynamicMax + padding;
            }
            const range = maxY - minY;
            const gridLevels = 4;
            const scaleY = (margin: number) =>
              200 * (1 - (margin - minY) / (maxY - minY));
            const textLabel = (value: number, y: number) => (
              <text x={8} y={y - 6} fontSize="11" fill="#9CA3AF">
                {value.toFixed(2)}
              </text>
            );
            const pointsA = marginHistoryA.map((m, i) => `${scaleX(i)},${scaleY(m)}`).join(" ");
            const pointsB = marginHistoryB.map((m, i) => `${scaleX(i)},${scaleY(m)}`).join(" ");
            const zeroBetween = minY <= 0 && maxY >= 0;
            return (
              <>
                {Array.from({ length: gridLevels }).map((_, i) => {
                  const value = minY + (range / (gridLevels - 1)) * i;
                  const y = scaleY(value);

                  return (
                    <line
                      key={`grid-${i}`}
                      x1={0}
                      x2={600}
                      y1={y}
                      y2={y}
                      stroke="#374151"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      opacity={0.7}
                    />
                  );
                })}
                <line
                  x1={0}
                  x2={600}
                  y1={scaleY(EXEC_SUSTAIN_THRESHOLD)}
                  y2={scaleY(EXEC_SUSTAIN_THRESHOLD)}
                  stroke="#9CA3AF"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  opacity={0.9}
                />
                {textLabel(maxY, scaleY(maxY))}
                {textLabel(EXEC_SUSTAIN_THRESHOLD, scaleY(EXEC_SUSTAIN_THRESHOLD))}
                {textLabel(minY, scaleY(minY))}
                {zeroBetween && (
                  <line x1={0} y1={scaleY(0)} x2={600} y2={scaleY(0)} stroke="#4b5563" strokeWidth={1} strokeDasharray="4 2" />
                )}
                {pointsA ? <polyline fill="none" stroke="#3b82f6" strokeWidth={1.5} points={pointsA} /> : null}
                {pointsB ? <polyline fill="none" stroke="#f97316" strokeWidth={1.5} points={pointsB} /> : null}
                {tippingMarginIndexA != null && marginHistoryA[tippingMarginIndexA] != null && (
                  <circle cx={scaleX(tippingMarginIndexA)} cy={scaleY(marginHistoryA[tippingMarginIndexA])} r={4} fill="#3b82f6" />
                )}
                {tippingMarginIndexB != null && marginHistoryB[tippingMarginIndexB] != null && (
                  <circle cx={scaleX(tippingMarginIndexB)} cy={scaleY(marginHistoryB[tippingMarginIndexB])} r={4} fill="#f97316" />
                )}
              </>
            );
          })()}
        </svg>
        {(() => {
          const totalSteps = Math.max(marginHistoryA.length, marginHistoryB.length);
          if (totalSteps <= 0) return null;
          const approxMaxLabels = 6;
          const labelInterval = Math.max(1, Math.ceil(totalSteps / approxMaxLabels));
          const indices: number[] = [];
          for (let i = 0; i < totalSteps; i++) {
            if (i % labelInterval === 0) indices.push(i);
          }
          return (
            <div
              style={{
                marginTop: "4px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "13px",
                color: "#9CA3AF",
              }}
            >
              {indices.map((i) => (
                <span key={i}>{`Q${i + 1}`}</span>
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
      </div>

      {!isRunning && executiveSummary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "24px",
            marginTop: "32px",
            alignItems: "stretch",
          }}
        >
          <div>
            <div
              style={{
                background: theme.panelBg,
                border: `1px solid ${theme.panelBorder}`,
                borderRadius: "6px",
                padding: "20px",
                marginBottom: 0,
                boxShadow: "none",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "28px",
                  marginBottom: "20px",
                }}
              >
                {/* Block 1 – Systemstatus */}
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      color: theme.subtext,
                      marginBottom: "6px",
                    }}
                  >
                    {t.sections.systemStatus}
                  </div>

                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 600,
                      color:
                        executiveSummary.structuralStatus === "Strukturell kollaps"
                          ? "#B91C1C"
                          : executiveSummary.structuralStatus ===
                            "Marginell överskridelse"
                          ? "#B45309"
                          : executiveSummary.structuralStatus ===
                            "Fungerande men dömd"
                          ? "#92400E"
                          : "#F3F4F6",
                    }}
                  >
                    {t.structuralStatus[structuralStatusKey]}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: theme.subtext,
                      marginTop: "6px",
                    }}
                  >
                    {t.common.compressionLabel}: {executiveSummary.compression.toFixed(2)} p.p.
                  </div>
                </div>

                {/* Block 2 – Effekt av beslut */}
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      color: theme.subtext,
                      marginBottom: "6px",
                    }}
                  >
                    {t.sections.effectOfDecision}
                  </div>

                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 600,
                      color:
                        executiveSummary.deltaMargin < 0
                          ? "#B91C1C"
                          : executiveSummary.deltaMargin > 0
                          ? "#065F46"
                          : "#F3F4F6",
                    }}
                  >
                    {executiveSummary.deltaMargin.toFixed(2)} %
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: theme.subtext,
                      marginTop: "6px",
                    }}
                  >
                    {t.common.avgMarginChangeLabel}
                  </div>
                </div>

                {/* Block 3 – Tipping-risk */}
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      color: theme.subtext,
                      marginBottom: "6px",
                    }}
                  >
                    {t.sections.tippingRisk}
                  </div>

                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 600,
                      color:
                        executiveSummary.tippingRiskLevel === "Oåterkallelig"
                          ? "#B91C1C"
                          : executiveSummary.tippingRiskLevel === "Hög"
                          ? "#B45309"
                          : executiveSummary.tippingRiskLevel === "Måttlig"
                          ? "#92400E"
                          : "#10B981",
                    }}
                  >
                    {executiveSummary.tippingRiskLevel}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: "#9CA3AF",
                      marginTop: "6px",
                    }}
                  >
                    {executiveSummary.tippingStep
                      ? <>{t.common.tippingWithin} {`Q${executiveSummary.tippingStep}`}</>
                      : t.common.noTipping}
                  </div>
                </div>

                {/* Block 4 – Kapacitet under tryck */}
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      color: "#9CA3AF",
                      marginBottom: "6px",
                    }}
                  >
                    {t.sections.capacityUnderPressure}
                  </div>

                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 600,
                      color: theme.text,
                    }}
                  >
                    {executiveSummary.compression.toFixed(2)} p.p.
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: theme.subtext,
                      marginTop: "6px",
                    }}
                  >
                    {t.common.bufferLossLabel}
                  </div>
                </div>
              </div>

              {/* Interpretation */}
              <div
                style={{
                  borderTop: `1px solid ${theme.panelBorder}`,
                  paddingTop: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: theme.subtext,
                    marginBottom: "8px",
                  }}
                >
                  {t.sections.strategicInterpretation}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: theme.text,
                    maxWidth: "80ch",
                  }}
                >
                  {(() => {
                    const deltaSentence = t.common.deltaSentence(executiveSummary.deltaMargin);
                    const interpretation =
                      structuralStatusKey === "structural_collapse"
                        ? t.common.interpretation.structural_collapse(deltaSentence)
                        : structuralStatusKey === "marginal_exceedance"
                        ? t.common.interpretation.marginal_exceedance(deltaSentence)
                        : structuralStatusKey === "functioning_but_doomed"
                        ? t.common.interpretation.functioning_but_doomed(deltaSentence)
                        : t.common.interpretation.stable(deltaSentence);
                    return interpretation;
                  })()}
                </div>
              </div>

              <div
                style={{
                  marginTop: "28px",
                  paddingTop: "20px",
                  borderTop: `1px solid ${theme.panelBorder}`,
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    letterSpacing: "0.08em",
                    color: theme.subtext,
                    marginBottom: "8px",
                  }}
                >
                  {t.sections.scenarioNarrative}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: theme.text,
                  }}
                >
                  {(() => {
                    const deltaStr = executiveSummary.deltaMargin.toFixed(2);
                    const statusStr = t.structuralStatus[structuralStatusKey];
                    const tippingQ = executiveSummary.tippingStep
                      ? `Q${executiveSummary.tippingStep}`
                      : "";
                    return executiveSummary.tippingStep
                      ? t.common.narrative.withTipping(deltaStr, statusStr, tippingQ)
                      : t.common.narrative.noTipping(deltaStr, statusStr);
                  })()}
                </div>
              </div>
            </div>
          </div>
          <SnapshotCompare
            baselineA={baselineA}
            finalA={finalA}
            baselineB={baselineB}
            finalB={finalB}
            structuralStatusA={structuralStatusA}
            structuralStatusB={t.structuralStatus[structuralStatusKey]}
            deltaMargin={executiveSummary.deltaMargin}
            tippingStep={executiveSummary.tippingStep}
            tippingLabel={t.common.tippingPrefix}
            noTippingText={t.common.noTipping}
          />
        </div>
      )}

      <div style={{ marginTop: "40px" }}>
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
                    borderBottom: "1px solid #2f333a",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
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
                    borderBottom: "1px solid #2f333a",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
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
            Compare Frozen Snapshots (B − A)
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
            <strong>Margin A:</strong> {snapA.engineState.margin.toFixed(3)}
            <br />
            <strong>Margin B:</strong> {snapB.engineState.margin.toFixed(3)}
            <br />
            <strong>Δ Margin (B−A):</strong> {(snapB.engineState.margin - snapA.engineState.margin).toFixed(3)}
            <br />
            <strong>Tipping (ACTIVE):</strong>{" "}
            {tippingStepA != null ? `A step ${tippingStepA}` : "A: never"} |{" "}
            {tippingStepB != null ? `B step ${tippingStepB}` : "B: never"}
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
                <strong>Refinancing lifecycle A:</strong> {snapA.engineState.registry.RefinancingConstraint.lifecycle}
                <br />
                <strong>Refinancing lifecycle B:</strong> {snapB.engineState.registry.RefinancingConstraint.lifecycle}
                <br />
                <strong>Severity A:</strong> {snapA.engineState.registry.RefinancingConstraint.severityIndex.toFixed(4)}
                <br />
                <strong>Severity B:</strong> {snapB.engineState.registry.RefinancingConstraint.severityIndex.toFixed(4)}
                <br />
                <strong>Step A:</strong> {snapA.engineState.step}
                <br />
                <strong>Step B:</strong> {snapB.engineState.step}
              </>
            )}
          </div>
          {/* Self-check cases: (1) A tips at step 3, B at step 1 → conclusion B triggers earlier, tag Risk ↑.
              (2) B never tips → "B avoids ACTIVE while A triggers it" or "No ACTIVE tipping" if A also never.
              (3) Verify tags: Margin ↑/↓, Stability ↑/↓, Risk ↑ from lifecycle/tipping. */}
        </div>
      )}
      </div>
    </div>
  );
}
