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

const STORAGE_KEY_A = "pulse_pilot_fastighet_history_A";
const STORAGE_KEY_B = "pulse_pilot_fastighet_history_B";
const SNAPSHOT_LABELS_KEY = "pulse.snapshotLabels.v1";

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

  // ==================================================
  // 6️⃣ UI
  // ==================================================

  return (
    <div style={{ padding: "32px", background: "#0e1117", color: "#e6edf3" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "16px" }}>
        Real Estate Portfolio – Decision Impact Analysis
      </h1>

      <div style={{ marginBottom: "16px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: "13px", marginRight: "6px", color: "#9ca3af" }}>Pilot case</label>
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
            setMarginHistoryA([]);
            setTippingMarginIndexA(null);
            setIsDirty(true);
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
            setMarginHistoryB([]);
            setTippingMarginIndexB(null);
            setIsDirty(true);
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
          onClick={() => setIsRunning(false)}
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
        <strong>Step:</strong> {activeState.step}
        <br />
        <strong>Lifecycle:</strong>{" "}
        {activeState.registry.RefinancingConstraint.lifecycle}
        <br />
        <strong>Severity:</strong>{" "}
        {activeState.registry.RefinancingConstraint.severityIndex.toFixed(4)}
        <br />
        <strong>Margin (active):</strong> {activeState.margin.toFixed(3)}
      </div>

      <div style={{ marginBottom: "24px" }}>
        <svg width={600} height={200} style={{ display: "block", background: "#0e1117", border: "1px solid #2f333a", borderRadius: "4px" }}>
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
            const scaleY = (margin: number) =>
              200 * (1 - (margin - minY) / (maxY - minY));
            const pointsA = marginHistoryA.map((m, i) => `${scaleX(i)},${scaleY(m)}`).join(" ");
            const pointsB = marginHistoryB.map((m, i) => `${scaleX(i)},${scaleY(m)}`).join(" ");
            const zeroBetween = minY <= 0 && maxY >= 0;
            return (
              <>
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
      </div>

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
            marginTop: "24px",
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
  );
}
