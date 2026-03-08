"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DecisionFlowEngine } from "@/src/decisionFlow/engine";
import { setSystemSnapshot } from "@/src/systemSnapshot/systemSnapshotStore";
import { uiTextSV } from "./uiTextSV";
import AIInterpretationPanel from "./AIInterpretationPanel";
import AIInterpretationExplanation from "./AIInterpretationExplanation";
import UnifiedHeader from "./components/UnifiedHeader";
import DecisionControls from "./components/DecisionControls";
import DecisionNarrative from "./components/DecisionNarrative";
import SystemTimeline from "./components/SystemTimeline";
import BevisMeetingCard from "./components/BevisMeetingCard";
import BevisLeadershipNarrative from "./components/BevisLeadershipNarrative";
import BevisIntroModal from "./components/BevisIntroModal";

const ENABLE_AI_INTERPRETATION_PANEL = true;
const ENABLE_PREMIUM_CLASSIFICATION = false;

const COLORS = {
  pageBg: "#0e1117",        // fixed dark background
  pageText: "#e6edf3",     // light text on dark bg

  boxBg: "#f5f7fa",        // light box background
  boxBorder: "#2f333a",
  boxText: "#0b1220",      // DARK text inside boxes (critical)

  boxActiveBg: "#e7f0ff",
  boxActiveBorder: "#2563eb",

  arrow: "#9ca3af"
};

type FlowBoxProps = {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
};

function FlowBox({ title, description, active, onClick }: FlowBoxProps) {
  return (
    <div
      onClick={onClick}
      style={{
        border: active
          ? `2px solid ${COLORS.boxActiveBorder}`
          : `2px solid ${COLORS.boxBorder}`,
        borderRadius: 8,
        padding: 16,
        width: 220,
        background: active ? COLORS.boxActiveBg : COLORS.boxBg,
        color: COLORS.boxText,           // FORCE DARK TEXT
        cursor: "pointer",
        boxShadow: active
          ? "0 0 0 2px rgba(37,99,235,0.2)"
          : "none"
      }}
    >
      <strong>{title}</strong>
      <p style={{ marginTop: 8, fontSize: 14 }}>
        {description}
      </p>
    </div>
  );
}

function Arrow() {
  return (
    <div
      style={{
        margin: "12px 0",
        fontSize: 24,
        textAlign: "center",
        color: COLORS.arrow
      }}
    >
      ↓
    </div>
  );
}

const STEP_DETAILS: Record<
  string,
  { title: string; explanation: string }
> = {
  baseline: {
    title: uiTextSV.flowBoxBaseline,
    explanation:
      "Detta representerar systemet i dess initiala tillstånd. Inga beslut har tillämpats. Det är referenspunkten som används för att jämföra utfall."
  },
  load: {
    title: uiTextSV.flowBoxLoad,
    explanation:
      "Externt tryck eller förändrade förhållanden tillämpade på systemet. Detta är inte ett beslut, utan kontext som systemet måste hantera."
  },
  decision: {
    title: uiTextSV.flowBoxDecision,
    explanation:
      "En avsiktlig åtgärd tillämpad på systemet. Detta är variabeln som testas."
  },
  time: {
    title: uiTextSV.flowBoxTime,
    explanation:
      "Systemet tillåts utvecklas när tiden går. Effekter kan ackumuleras eller uppstå."
  },
  consequences: {
    title: uiTextSV.flowBoxConsequences,
    explanation:
      "Observerade effekter, avvägningar och uppkommande utfall orsakade av beslutet under de givna förhållandena."
  },
  compare: {
    title: uiTextSV.flowBoxCompare,
    explanation:
      "En jämförelse mellan det slutliga utfallet och att inte göra något alls. Det är här insikten skapas."
  }
};

type PolicyKey = "balanced" | "aggressive" | "conservative";

const POLICIES: Record<
  PolicyKey,
  {
    label: string;
    description: string;
    apply: (state: any) => void;
  }
> = {
  balanced: {
    label: uiTextSV.policyBalanced,
    description: uiTextSV.policyDescriptionGeneric,
    apply: state => {
      state.metrics.load -= 1;
      state.metrics.cost += 1;
    }
  },
  aggressive: {
    label: uiTextSV.policyAggressive,
    description: uiTextSV.policyDescriptionGeneric,
    apply: state => {
      state.metrics.load -= 2;
      state.metrics.cost += 3;
    }
  },
  conservative: {
    label: uiTextSV.policyConservative,
    description: uiTextSV.policyDescriptionGeneric,
    apply: state => {
      state.metrics.load -= 0.5;
      state.metrics.cost += 0.5;
    }
  }
};

type BarProps = {
  label: string;
  value: number;
  max: number;
  scenarioName?: string;
  metricName?: string;
  time?: number;
};

function Bar({ label, value, max, scenarioName, metricName, time }: BarProps) {
  const widthPct = Math.max(0, Math.min(100, (value / max) * 100));
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipText = scenarioName && metricName && time !== undefined
    ? `${scenarioName}\n${metricName}\n${value.toFixed(1)}\nt = ${time}`
    : null;

  return (
    <div style={{ marginBottom: 12, position: "relative" }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>{label}: {value}</div>
      <div 
        style={{ background: "#1f2937", borderRadius: 4, height: 12, position: "relative" }}
        onMouseEnter={() => tooltipText && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          style={{
            width: `${widthPct}%`,
            height: "100%",
            background: "#60a5fa",
            borderRadius: 4,
            cursor: tooltipText ? "pointer" : "default"
          }}
        />
        {showTooltip && tooltipText && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginBottom: 4,
              padding: "6px 8px",
              background: "#1a1a1a",
              color: "#e6edf3",
              fontSize: 11,
              borderRadius: 4,
              whiteSpace: "pre-line",
              border: "1px solid #2f333a",
              zIndex: 1000,
              pointerEvents: "none"
            }}
          >
            {tooltipText}
          </div>
        )}
      </div>
    </div>
  );
}

type TimelineRowProps = {
  time: number;
  metric: string;
  delta: number;
  value: number;
};

function TimelineRow({ time, metric, delta, value }: TimelineRowProps) {
  const isPositive = delta >= 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60px 80px 1fr 80px",
        gap: 8,
        padding: "6px 0",
        fontSize: 13,
        borderBottom: "1px solid #1f2937"
      }}
    >
      <div>t={time}</div>
      <div>{metric}</div>
      <div style={{ color: isPositive ? "#fca5a5" : "#86efac" }}>
        {isPositive ? "+" : ""}{delta}
      </div>
      <div>{value}</div>
    </div>
  );
}

type ScenarioTimeSeries = {
  name: string;
  data: Array<{
    time: number;
    load: number;
    cost: number;
  }>;
  collapseTime: number | null;
};

function runScenarioWithTimeSeries(
  baselineLoad: number,
  baselineCost: number,
  changeLoad: number,
  changeCost: number,
  policy: PolicyKey,
  maxSteps: number
): ScenarioTimeSeries {
  const engine = new DecisionFlowEngine({
    time: 0,
    metrics: {
      load: baselineLoad,
      cost: baselineCost
    }
  });

  engine.applyLoad(state => {
    state.metrics.load += changeLoad;
    state.metrics.cost += changeCost;
  });

  engine.applyDecision(POLICIES[policy].apply);

  const timeSeries: Array<{ time: number; load: number; cost: number }> = [];
  let collapseTime: number | null = null;

  // Record initial state
  const initialState = engine.snapshot();
  timeSeries.push({
    time: initialState.time,
    load: initialState.metrics.load,
    cost: initialState.metrics.cost
  });

  // Run simulation step by step
  for (let i = 0; i < maxSteps; i++) {
    engine.tick();
    const state = engine.snapshot();
    
    timeSeries.push({
      time: state.time,
      load: state.metrics.load,
      cost: state.metrics.cost
    });

    // Detect collapse: metrics hit 0 or go negative, or load exceeds 10x baseline
    if (collapseTime === null) {
      const loadCollapsed = state.metrics.load <= 0 || state.metrics.load > baselineLoad * 10;
      const costCollapsed = state.metrics.cost <= 0 || state.metrics.cost > baselineCost * 10;
      
      if (loadCollapsed || costCollapsed) {
        collapseTime = state.time;
      }
    }
  }

  return {
    name: policy,
    data: timeSeries,
    collapseTime
  };
}

type TimelineComparisonProps = {
  scenarios: ScenarioTimeSeries[];
  metric: "load" | "cost";
};

function TimelineComparison({ scenarios, metric }: TimelineComparisonProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ scenarioIdx: number; pointIdx: number } | null>(null);
  if (scenarios.length === 0) return null;

  // Find maximum time across all scenarios
  const maxTime = Math.max(...scenarios.map(s => Math.max(...s.data.map(d => d.time))));
  
  // Find maximum value for consistent Y-axis scaling
  const maxValue = Math.max(...scenarios.map(s => Math.max(...s.data.map(d => d[metric]))));
  const minValue = Math.min(0, ...scenarios.map(s => Math.min(...s.data.map(d => d[metric]))));
  const valueRange = maxValue - minValue || 1;

  // Create time points for the shared axis
  const timePoints = Array.from({ length: maxTime + 1 }, (_, i) => i);

  // Get value at each time point for each scenario (interpolate if needed)
  const getValueAtTime = (scenario: ScenarioTimeSeries, time: number): number | null => {
    const point = scenario.data.find(d => d.time === time);
    if (point) return point[metric];
    
    // Find surrounding points for interpolation
    const before = scenario.data.filter(d => d.time < time).sort((a, b) => b.time - a.time)[0];
    const after = scenario.data.filter(d => d.time > time).sort((a, b) => a.time - b.time)[0];
    
    if (!before && !after) return null;
    if (!before) return after[metric];
    if (!after) return before[metric];
    
    // Linear interpolation
    const ratio = (time - before.time) / (after.time - before.time);
    return before[metric] + (after[metric] - before[metric]) * ratio;
  };

  const colors = {
    baseline: "#9ca3af",
    balanced: "#60a5fa",
    aggressive: "#f87171",
    conservative: "#34d399"
  };

  const getColor = (name: string) => {
    if (name === "baseline") return colors.baseline;
    if (name === "balanced") return colors.balanced;
    if (name === "aggressive") return colors.aggressive;
    if (name === "conservative") return colors.conservative;
    return "#9ca3af";
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ 
        position: "relative",
        height: 200, 
        borderBottom: "2px solid #334155",
        borderLeft: "2px solid #334155",
        paddingBottom: 8,
        paddingLeft: 8,
        marginBottom: 8
      }}>
        {/* Y-axis labels */}
        <div style={{
          position: "absolute",
          left: -40,
          top: 0,
          bottom: 8,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontSize: 10,
          opacity: 0.6,
          width: 35
        }}>
          <span>{maxValue.toFixed(1)}</span>
          <span>{((maxValue + minValue) / 2).toFixed(1)}</span>
          <span>{minValue.toFixed(1)}</span>
        </div>

        {/* Chart area */}
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {scenarios.map((scenario, scenarioIdx) => {
            const points = timePoints
              .map(time => {
                const value = getValueAtTime(scenario, time);
                if (value === null) return null;
                const x = (time / maxTime) * 100;
                const y = 100 - ((value - minValue) / valueRange) * 100;
                return { x, y, time, value };
              })
              .filter((p): p is { x: number; y: number; time: number; value: number } => p !== null);

            if (points.length === 0) return null;

            const color = getColor(scenario.name);
            const pathData = points.map((p, i) => 
              `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`
            ).join(' ');

            const metricName = metric === "load" ? "Belastning" : "Kostnad";
            const scenarioLabel = scenario.name === "baseline" ? "Baseline" : POLICIES[scenario.name as PolicyKey].label;

            return (
              <div key={scenarioIdx} style={{ position: "absolute", inset: 0 }}>
                {/* Line path */}
                <svg
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none"
                  }}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.5"
                    opacity={0.8}
                  />
                </svg>
                
                {/* Interactive points */}
                {points.map((p, i) => {
                  const isHovered = hoveredPoint?.scenarioIdx === scenarioIdx && hoveredPoint?.pointIdx === i;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        transform: "translate(-50%, -50%)",
                        width: 8,
                        height: 8,
                        cursor: "pointer",
                        pointerEvents: "auto",
                        zIndex: 2
                      }}
                      onMouseEnter={() => setHoveredPoint({ scenarioIdx, pointIdx: i })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          background: color,
                          opacity: scenario.collapseTime === p.time ? 1 : 0.6
                        }}
                      />
                      {isHovered && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "100%",
                            left: "50%",
                            transform: "translateX(-50%)",
                            marginBottom: 4,
                            padding: "6px 8px",
                            background: "#1a1a1a",
                            color: "#e6edf3",
                            fontSize: 11,
                            borderRadius: 4,
                            whiteSpace: "pre-line",
                            border: "1px solid #2f333a",
                            zIndex: 1000,
                            pointerEvents: "none"
                          }}
                        >
                          {`${scenarioLabel}\n${metricName}\n${p.value.toFixed(1)}\nt = ${p.time}`}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Collapse marker */}
                {scenario.collapseTime !== null && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${(scenario.collapseTime / maxTime) * 100}%`,
                      bottom: -16,
                      transform: "translateX(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      pointerEvents: "none"
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        background: "#ef4444",
                        borderRadius: "50%",
                        border: "2px solid #0e1117",
                        marginBottom: 2
                      }}
                    />
                    <div
                      style={{
                        width: 1,
                        height: 8,
                        background: "#ef4444",
                        opacity: 0.5
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Time axis labels */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        fontSize: 11, 
        opacity: 0.7,
        marginTop: 4,
        paddingLeft: 8
      }}>
        <span>t=0</span>
        <span>t={maxTime}</span>
      </div>
      
      {/* Legend */}
      <div style={{ 
        display: "flex", 
        gap: 16, 
        marginTop: 12, 
        fontSize: 12,
        flexWrap: "wrap"
      }}>
        {scenarios.map((scenario, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 12,
              height: 12,
              background: getColor(scenario.name),
              borderRadius: 2
            }} />
            <span>{scenario.name === "baseline" ? "Baseline" : POLICIES[scenario.name as PolicyKey].label}</span>
            {scenario.collapseTime !== null && (
              <span style={{ opacity: 0.7, fontSize: 10 }}>
                (t={scenario.collapseTime})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DecisionFlowPage() {
  const [viewMode, setViewMode] = useState<"decision" | "bevis">("decision");
  const [bevisCaseId, setBevisCaseId] = useState("1");
  const [bevisTimelineData, setBevisTimelineData] = useState<{
    planA: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>;
    planB: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>;
    breakpoint?: number;
  } | null>(null);
  
  // Decision Flow demo state
  const [inflow, setInflow] = useState(1.0);
  const [decisionTimelineData, setDecisionTimelineData] = useState<Array<{
    time: number;
    belastning: number;
    kapacitet: number;
    aterhamtning: number;
  }> | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [systemUpdatedAt, setSystemUpdatedAt] = useState<number | null>(null);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  
  // Simplified UI state (three questions)
  const [situation, setSituation] = useState<"calm" | "manageable" | "strained" | "heavy-pressure">("manageable");
  const [change, setChange] = useState<"increasing-pressure" | "loss-capacity" | "no-change">("increasing-pressure");
  const [decision, setDecision] = useState<PolicyKey>("balanced");
  
  // Internal numeric values (mapped from UI choices, not exposed)
  const getBaselineValues = () => {
    if (situation === "calm") return { load: 0.5, cost: 5 };
    if (situation === "strained" || situation === "heavy-pressure") return { load: 2, cost: 20 };
    return { load: 1, cost: 10 }; // manageable
  };
  
  const getChangeValues = () => {
    if (change === "increasing-pressure") return { load: 3, cost: 2 };
    if (change === "loss-capacity") return { load: -1, cost: 3 };
    return { load: 0, cost: 0 }; // no-change
  };
  
  const baselineLoad = getBaselineValues().load;
  const baselineCost = getBaselineValues().cost;
  const changeLoad = getChangeValues().load;
  const changeCost = getChangeValues().cost;
  const steps = 3; // Fixed internally
  
  const policy = decision; // Map decision to policy
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Comparison state (read-only, no API calls)
  const [policyB, setPolicyB] = useState<PolicyKey>("aggressive");

  const engine = new DecisionFlowEngine({
    time: 0,
    metrics: {
      load: baselineLoad,
      cost: baselineCost
    }
  });

  // Load / Change (external pressure)
  engine.applyLoad(state => {
    state.metrics.load += changeLoad;
    state.metrics.cost += changeCost;
  });

  // Decision (policy-based)
  engine.applyDecision(POLICIES[policy].apply);

  // Simulate time
  engine.run(3);

  const defaultResult = {
    baseline: engine.baselineSnapshot(),
    final: engine.snapshot(),
    compare: engine.compareToBaseline(),
    consequences: engine.consequencesLog()
  };

  async function runSimulation() {
    setLoading(true);

    const res = await fetch("/api/decision-flow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseline: {
          load: baselineLoad,
          cost: baselineCost
        },
        externalChange: {
          load: changeLoad,
          cost: changeCost
        },
        policy,
        steps
      })
    });

    const data = await res.json();
    setResult(data);
    setSystemSnapshot(data);
    setLoading(false);
    setSystemUpdatedAt(Date.now());
  }


  const data = result ?? defaultResult;

  const baselineLoadVal = data.baseline.metrics.load;
  const finalLoadVal = data.final.metrics.load;
  const baselineCostVal = data.baseline.metrics.cost;
  const finalCostVal = data.final.metrics.cost;

  const maxLoad = Math.max(baselineLoadVal, finalLoadVal) || 1;
  const maxCost = Math.max(baselineCostVal, finalCostVal) || 1;

  // Generate scenarios for comparison timeline
  // Use extended steps to capture collapse if it occurs
  const extendedSteps = 20;
  
  // Baseline scenario: applies load but no decision
  const baselineEngine = new DecisionFlowEngine({
    time: 0,
    metrics: {
      load: baselineLoad,
      cost: baselineCost
    }
  });
  
  baselineEngine.applyLoad(state => {
    state.metrics.load += changeLoad;
    state.metrics.cost += changeCost;
  });
  // No decision applied for baseline
  
  const baselineTimeSeries: Array<{ time: number; load: number; cost: number }> = [];
  let baselineCollapseTime: number | null = null;
  
  const baselineInitial = baselineEngine.snapshot();
  baselineTimeSeries.push({
    time: baselineInitial.time,
    load: baselineInitial.metrics.load,
    cost: baselineInitial.metrics.cost
  });
  
  for (let i = 0; i < extendedSteps; i++) {
    baselineEngine.tick();
    const state = baselineEngine.snapshot();
    
    baselineTimeSeries.push({
      time: state.time,
      load: state.metrics.load,
      cost: state.metrics.cost
    });
    
    if (baselineCollapseTime === null) {
      const loadCollapsed = state.metrics.load <= 0 || state.metrics.load > baselineLoad * 10;
      const costCollapsed = state.metrics.cost <= 0 || state.metrics.cost > baselineCost * 10;
      
      if (loadCollapsed || costCollapsed) {
        baselineCollapseTime = state.time;
      }
    }
  }
  
  const baselineScenario: ScenarioTimeSeries = {
    name: "baseline",
    data: baselineTimeSeries,
    collapseTime: baselineCollapseTime
  };

  const decisionScenario = runScenarioWithTimeSeries(
    baselineLoad,
    baselineCost,
    changeLoad,
    changeCost,
    decision,
    extendedSteps
  );

  const policyBScenario = runScenarioWithTimeSeries(
    baselineLoad,
    baselineCost,
    changeLoad,
    changeCost,
    policyB,
    extendedSteps
  );

  const allScenarios = [baselineScenario, decisionScenario, policyBScenario];

  // STEP 3 — Minimal neutral status (Pulse Core only)
  // Based strictly on existing simulated "now" (data.final.time) and detected collapse time.
  const simulatedNowTime = data.final.time;
  const selectedScenarioCollapseTime = decisionScenario.collapseTime;

  const selectedScenarioStatus =
    selectedScenarioCollapseTime !== null && selectedScenarioCollapseTime <= simulatedNowTime
      ? "Kollaps inträffad"
      : selectedScenarioCollapseTime !== null && selectedScenarioCollapseTime > simulatedNowTime
        ? "Fungerar nu, kollaps inträffar senare"
        : "Stabilt förlopp";

  const selectedScenarioStatusSentence =
    selectedScenarioCollapseTime !== null && selectedScenarioCollapseTime <= simulatedNowTime
      ? `Kollaps markeras vid t=${selectedScenarioCollapseTime} och ligger inom den simulerade perioden.`
      : selectedScenarioCollapseTime !== null && selectedScenarioCollapseTime > simulatedNowTime
        ? `Systemet är intakt vid t=${simulatedNowTime}, och kollaps markeras vid t=${selectedScenarioCollapseTime}.`
        : `Ingen kollaps markeras inom den simulerade tidsramen (t=0 till t=${simulatedNowTime}).`;

  const baselineAtFinalTime = baselineScenario.data.find(d => d.time === simulatedNowTime);
  const selectedAtFinalTime = decisionScenario.data.find(d => d.time === simulatedNowTime);

  const loadDeltaVsBaseline =
    baselineAtFinalTime && selectedAtFinalTime
      ? selectedAtFinalTime.load - baselineAtFinalTime.load
      : 0;

  const costDeltaVsBaseline =
    baselineAtFinalTime && selectedAtFinalTime
      ? selectedAtFinalTime.cost - baselineAtFinalTime.cost
      : 0;

  // Derive summary from existing data (UI-only, no engine changes)
  const loadRecovery = Math.abs(data.compare.load) < 0.01;
  const costRecovery = Math.abs(data.compare.cost) < 0.01;
  const hasRecovery = loadRecovery && costRecovery;

  // STEP 4 — Pulse Premium classification (behind feature flag)
  // Truth Rule 1.1: render only when all conditions are clearly satisfied using existing signals.
  const shouldRenderPremiumClassification =
    ENABLE_PREMIUM_CLASSIFICATION &&
    selectedScenarioStatus === "Fungerar nu, kollaps inträffar senare" &&
    selectedScenarioCollapseTime !== null &&
    hasRecovery === false;

  // System state: check how long load stays above baseline
  const loadConsequences = data.consequences.filter((c: any) => c.metric === "load" && c.delta > 0);
  const loadAboveBaselineCount = loadConsequences.length;
  const totalSteps = data.final.time;
  const loadAboveBaselineRatio = totalSteps > 0 ? loadAboveBaselineCount / totalSteps : 0;
  
  let systemState = uiTextSV.systemStateStable;
  if (loadAboveBaselineRatio > 0.5) {
    systemState = uiTextSV.systemStateUnstable;
  } else if (loadAboveBaselineRatio > 0) {
    systemState = uiTextSV.systemStateUnderPressure;
  }

  // Narrative generation from existing data
  const generateNarrative = (resultData: any) => {
    const resultTotalSteps = resultData.final.time;
    const earlySteps = resultData.consequences.filter((c: any) => c.time <= 2);
    const midSteps = resultData.consequences.filter((c: any) => c.time > 2 && c.time <= Math.floor(resultTotalSteps * 0.7));
    const earlyLoadChanges = earlySteps.filter((c: any) => c.metric === "load");
    const earlyCostChanges = earlySteps.filter((c: any) => c.metric === "cost");
    
    const loadRecovery = Math.abs(resultData.compare.load) < 0.01;
    const costRecovery = Math.abs(resultData.compare.cost) < 0.01;
    const hasRecovery = loadRecovery && costRecovery;
    
    const loadAboveBaseline = resultData.consequences.filter((c: any) => c.metric === "load" && c.delta > 0);
    const loadAboveBaselineRatio = resultTotalSteps > 0 ? loadAboveBaseline.length / resultTotalSteps : 0;
    
    let systemStateText = uiTextSV.systemStateStable;
    if (loadAboveBaselineRatio > 0.5) {
      systemStateText = uiTextSV.systemStateUnstable;
    } else if (loadAboveBaselineRatio > 0) {
      systemStateText = uiTextSV.systemStateUnderPressure;
    }

    // Phase 1: Early response
    const earlyLoadIncrease = earlyLoadChanges.some((c: any) => c.delta > 0);
    const earlyLoadStable = earlyLoadChanges.length === 0 || earlyLoadChanges.every((c: any) => Math.abs(c.delta) < 0.5);
    const earlyCostRise = earlyCostChanges.some((c: any) => c.delta > 0);
    
    let phase1 = "";
    if (earlyLoadIncrease) {
      phase1 = uiTextSV.narrativePhase1PressureRises;
    } else if (earlyLoadStable) {
      phase1 = uiTextSV.narrativePhase1SystemAbsorbs;
    } else {
      phase1 = uiTextSV.narrativePhase1SystemResponds;
    }
    if (earlyCostRise) {
      phase1 += uiTextSV.narrativePhase1EarlyTradeoffs;
    }

    // Phase 2: Accumulation
    let phase2 = "";
    if (loadAboveBaselineRatio > 0.5) {
      phase2 = uiTextSV.narrativePhase2SustainedPressure;
    } else if (loadAboveBaselineRatio > 0 && loadAboveBaselineRatio <= 0.5) {
      phase2 = uiTextSV.narrativePhase2Oscillates;
    } else {
      phase2 = uiTextSV.narrativePhase2Stable;
    }
    if (resultData.compare.cost !== 0) {
      const costIncrease = resultData.compare.cost > 0;
      if (costIncrease) {
        phase2 += uiTextSV.narrativePhase2ResourcesCommitted;
      } else {
        phase2 += uiTextSV.narrativePhase2ResourceAllocation;
      }
    }

    // Phase 3: Outcome
    let phase3 = "";
    if (hasRecovery) {
      phase3 = `${uiTextSV.narrativePhase3Recovery} ${systemStateText.toLowerCase()}.`;
    } else {
      const costIncrease = resultData.compare.cost > 0;
      const loadIncrease = resultData.compare.load > 0;
      
      if (costIncrease && loadIncrease) {
        phase3 = `${uiTextSV.narrativePhase3CostAndLoad} ${systemStateText.toLowerCase()}.`;
      } else if (costIncrease) {
        phase3 = `${uiTextSV.narrativePhase3CostOnly} ${systemStateText.toLowerCase()}.`;
      } else if (loadIncrease) {
        phase3 = `${uiTextSV.narrativePhase3LoadOnly} ${systemStateText.toLowerCase()}.`;
      } else {
        phase3 = `${uiTextSV.narrativePhase3Other} ${systemStateText.toLowerCase()}.`;
      }
    }
    return { phase1, phase2, phase3 };
  };

  // System implications generation from existing data
  const generateImplications = (resultData: any) => {
    const resultTotalSteps = resultData.final.time;
    const loadAboveBaseline = resultData.consequences.filter((c: any) => c.metric === "load" && c.delta > 0);
    const loadAboveBaselineRatio = resultTotalSteps > 0 ? loadAboveBaseline.length / resultTotalSteps : 0;
    
    const loadRecovery = Math.abs(resultData.compare.load) < 0.01;
    const costRecovery = Math.abs(resultData.compare.cost) < 0.01;
    const hasRecovery = loadRecovery && costRecovery;
    
    const costIncrease = resultData.compare.cost > 0;
    
    // Pressure signal: sensitivity and fragility
    let pressure = "";
    if (loadAboveBaselineRatio > 0.5) {
      pressure = uiTextSV.implicationsPressureElevated;
    } else {
      pressure = uiTextSV.implicationsPressureIntermittent;
    }
    
    // Commitment signal: reduced flexibility / margin
    let commitment = "";
    if (costIncrease) {
      commitment = uiTextSV.implicationsCommitmentReduced;
    } else {
      commitment = uiTextSV.implicationsCommitmentPreserved;
    }
    
    // Recovery signal: dependency on external change
    let recovery = "";
    if (!hasRecovery) {
      recovery = uiTextSV.implicationsRecoveryDependent;
    } else {
      recovery = uiTextSV.implicationsRecoveryAbility;
    }
    
    return { pressure, commitment, recovery };
  };

  const decisionANarrative = generateNarrative(data);
  const implications = generateImplications(data);

  // Auto-hide update indicator after 1800ms
  useEffect(() => {
    if (systemUpdatedAt !== null) {
      setShowUpdateIndicator(true);
      const timer = setTimeout(() => {
        setShowUpdateIndicator(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [systemUpdatedAt]);

  interface AIInterpretation {
    metadata: {
      contractVersion: string;
      timestamp: string;
      inputSource: string;
      totalTimeSteps: number;
      inputValidation: {
        format: "CSV" | "JSON";
        valid: boolean;
        errors: string[];
      };
    };
    systemPhaseAnalysis: {
      phases: Array<{
        time: number;
        phase: "stable" | "fragile" | "unstable";
        indicators: {
          loadCapacityRatio: number;
          stress: number;
          recovery: number;
          capacityTrend: "increasing" | "decreasing" | "stable";
        };
      }>;
      phaseDistribution: {
        stable: number;
        fragile: number;
        unstable: number;
      };
    };
    phaseTransitions: Array<{
      fromTime: number;
      toTime: number;
      fromPhase: "stable" | "fragile" | "unstable";
      toPhase: "stable" | "fragile" | "unstable";
      transitionType: string;
      triggeringConditions: string[];
    }>;
    loadCapacityAnalysis: {
      loadCapacityRatios: Array<{
        time: number;
        ratio: number;
        overCapacity: boolean;
      }>;
      overCapacityPeriods: Array<{
        startTime: number;
        endTime: number | null;
        duration: number;
        maxRatio: number;
      }>;
      trend: {
        direction: "increasing" | "decreasing" | "stable" | "oscillating";
        finalRatio: number;
        initialRatio: number;
      };
    };
    stressAnalysis: {
      stressPatterns: Array<{
        time: number;
        stress: number;
        pattern: "accumulating" | "dissipating" | "sustained";
      }>;
      accumulationPeriods: Array<{
        startTime: number;
        endTime: number | null;
        initialStress: number;
        peakStress: number;
        rate: number;
      }>;
      sustainedHighStress: Array<{
        startTime: number;
        endTime: number | null;
        threshold: number;
        averageStress: number;
      }>;
    };
    recoveryAnalysis: {
      recoveryPatterns: Array<{
        time: number;
        recovery: number;
        pattern: "degrading" | "stable" | "improving";
        rate: number;
      }>;
      degradationPeriods: Array<{
        startTime: number;
        endTime: number | null;
        initialRecovery: number;
        finalRecovery: number;
        rate: number;
      }>;
      lowRecoveryPeriods: Array<{
        startTime: number;
        endTime: number | null;
        threshold: number;
        minRecovery: number;
      }>;
    };
    capacityAnalysis: {
      capacityPatterns: Array<{
        time: number;
        capacity: number;
        pattern: "eroding" | "stable" | "rebuilding";
        rate: number;
        percentageOfInitial: number;
      }>;
      erosionPeriods: Array<{
        startTime: number;
        endTime: number | null;
        initialCapacity: number;
        finalCapacity: number;
        rate: number;
      }>;
      rebuildingPeriods: Array<{
        startTime: number;
        endTime: number | null;
        initialCapacity: number;
        finalCapacity: number;
        rate: number;
      }>;
    };
    feedbackLoopAnalysis: {
      detectedLoops: Array<{
        startTime: number;
        endTime: number | null;
        loopType: "reinforcing" | "balancing";
        components: string[];
        severity: "low" | "medium" | "high";
      }>;
    };
    riskSignals: Array<{
      time: number;
      signalType: string;
      severity: "low" | "medium" | "high" | "critical";
      indicators: {
        loadCapacityRatio: number | null;
        stress: number | null;
        recovery: number | null;
        capacityChange: number | null;
      };
      threshold: number;
      exceedance: number;
    }>;
    trajectoryAnalysis: {
      classification: "stabilizing" | "deteriorating" | "oscillating" | "stable";
      indicators: {
        finalPhase: "stable" | "fragile" | "unstable";
        phaseChangeCount: number;
        netLoadChange: number;
        netCapacityChange: number;
        netRecoveryChange: number;
        netStressChange: number;
      };
      trends: {
        load: "increasing" | "decreasing" | "stable";
        capacity: "increasing" | "decreasing" | "stable";
        recovery: "increasing" | "decreasing" | "stable";
        stress: "increasing" | "decreasing" | "stable";
      };
    };
    criticalPoints: Array<{
      time: number;
      pointType: "recoveryThreshold" | "capacityThreshold" | "stressThreshold" | "phaseTransition";
      threshold: number;
      value: number;
      direction: "approaching" | "crossing" | "receding";
    }>;
    summary: {
      overallSystemState: "stable" | "fragile" | "unstable";
      keyFindings: string[];
      riskLevel: "low" | "medium" | "high" | "critical";
      phaseTransitionCount: number;
      longestUnstablePeriod: number | null;
    };
  }

  const [aiInterpretationData, setAIInterpretationData] = useState<AIInterpretation | null>(null);

  useEffect(() => {
    if (!ENABLE_AI_INTERPRETATION_PANEL) {
      return;
    }

    async function fetchAIInterpretation() {
      try {
        const res = await fetch("/api/ai-interpretation");
        if (res.status === 204) {
          setAIInterpretationData(null);
          return;
        }
        if (!res.ok) {
          setAIInterpretationData(null);
          return;
        }
        const data: AIInterpretation = await res.json();
        setAIInterpretationData(data);
      } catch (error) {
        setAIInterpretationData(null);
      }
    }

    fetchAIInterpretation();
  }, []);

  const handlePrimaryAction = () => {
    if (viewMode === "decision") {
      // TODO: Trigger simulation
      console.log("Simulera clicked");
    }
    // Bevis mode is read-only, no action needed
  };

  const handleModeChange = (mode: "decision" | "bevis") => {
    setViewMode(mode);
    // Reset to case 1 when entering Bevis mode
    if (mode === "bevis") {
      setBevisCaseId("1");
    }
  };

  const handleBevisCaseChange = (caseId: string) => {
    setBevisCaseId(caseId);
  };

  const handleBevisTimelineDataChange = (
    planAData: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>,
    planBData: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>,
    breakpoint?: number
  ) => {
    setBevisTimelineData({ planA: planAData, planB: planBData, breakpoint });
  };

  // Generate Decision Flow timeline data based on inflow
  // Demo-only: deterministic, stable data (no collapse)
  const generateDecisionTimeline = (inflowValue: number): Array<{
    time: number;
    belastning: number;
    kapacitet: number;
    aterhamtning: number;
  }> => {
    const data = [];
    const numTicks = 20;
    const baseLoad = 35;
    const baseCapacity = 50;
    const baseRecovery = 45;
    
    for (let i = 0; i <= numTicks; i++) {
      // Belastning scales with inflow, with slight variation
      const belastning = baseLoad + (i * 1.5 * inflowValue) + Math.sin(i * 0.2) * 2;
      
      // Kapacitet remains constant (system-defined limit)
      const kapacitet = baseCapacity;
      
      // Återhämtning decreases slightly over time, affected by inflow
      const aterhamtning = baseRecovery - (i * 0.3 * inflowValue) + Math.cos(i * 0.15) * 2;
      
      data.push({
        time: i,
        belastning: Math.max(0, belastning),
        kapacitet: kapacitet,
        aterhamtning: Math.max(0, aterhamtning)
      });
    }
    
    return data;
  };

  // Generate timeline on load and when inflow changes
  useEffect(() => {
    const timeline = generateDecisionTimeline(inflow);
    setDecisionTimelineData(timeline);
  }, [inflow]);

  return (
    <div style={{
      background: COLORS.pageBg,
      color: COLORS.pageText,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column"
    }}>
      {viewMode === "bevis" && <BevisIntroModal />}
      
      <UnifiedHeader
        mode={viewMode}
        onModeChange={handleModeChange}
        onPrimaryAction={handlePrimaryAction}
      />

      <main style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "320px 1fr 320px",
        gap: 24,
        padding: 24,
        overflow: "hidden"
      }}>
        {/* Left Panel */}
        <div style={{ overflowY: "auto", overflowX: "hidden" }}>
          {viewMode === "decision" ? (
            <DecisionControls 
              inflow={inflow}
              onInflowChange={setInflow}
            />
          ) : (
            <BevisMeetingCard
              selectedCaseId={bevisCaseId}
              onCaseChange={handleBevisCaseChange}
              onTimelineDataChange={handleBevisTimelineDataChange}
            />
          )}
        </div>

        {/* Center Panel */}
        <div style={{ overflowY: "auto", overflowX: "hidden", position: "relative" }}>
          <SystemTimeline
            mode={viewMode}
            planAData={bevisTimelineData?.planA}
            planBData={bevisTimelineData?.planB}
            breakpoint={bevisTimelineData?.breakpoint}
            decisionTimelineData={decisionTimelineData || undefined}
          />
        </div>

        {/* Right Panel */}
        <div style={{ overflowY: "auto", overflowX: "hidden" }}>
          {viewMode === "decision" ? (
            <DecisionNarrative inflow={inflow} />
          ) : (
            <BevisLeadershipNarrative selectedCaseId={bevisCaseId} />
          )}
        </div>
      </main>
    </div>
  );
}
