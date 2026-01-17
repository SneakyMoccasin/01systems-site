"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DecisionFlowEngine } from "@/src/decisionFlow/engine";
import { uiTextSV } from "./uiTextSV";
import AIInterpretationPanel from "./AIInterpretationPanel";
import AIInterpretationExplanation from "./AIInterpretationExplanation";

const ENABLE_AI_INTERPRETATION_PANEL = true;

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
};

function Bar({ label, value, max }: BarProps) {
  const widthPct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>{label}: {value}</div>
      <div style={{ background: "#1f2937", borderRadius: 4, height: 12 }}>
        <div
          style={{
            width: `${widthPct}%`,
            height: "100%",
            background: "#60a5fa",
            borderRadius: 4
          }}
        />
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

export default function DecisionFlowPage() {
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

  // Derive summary from existing data (UI-only, no engine changes)
  const loadRecovery = Math.abs(data.compare.load) < 0.01;
  const costRecovery = Math.abs(data.compare.cost) < 0.01;
  const hasRecovery = loadRecovery && costRecovery;

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

  return (
    <main style={{
      background: COLORS.pageBg,
      color: COLORS.pageText,
      minHeight: "100vh",
      padding: 32
    }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/"
          style={{
            color: "#9ca3af",
            textDecoration: "none",
            fontSize: 14
          }}
        >
          {uiTextSV.backToIntro}
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{uiTextSV.pageTitle}</h1>
          <button
            onClick={() => setShowHelper(!showHelper)}
            style={{
              fontSize: 12,
              background: "transparent",
              color: COLORS.pageText,
              border: "none",
              cursor: "pointer",
              opacity: 0.6,
              padding: 0,
              textDecoration: "underline",
              textDecorationStyle: "dotted"
            }}
          >
            {uiTextSV.whatAmISeeing}
          </button>
        </div>
        <button
          onClick={() => setIsPresentationMode(!isPresentationMode)}
          style={{
            padding: "6px 12px",
            fontSize: 12,
            background: "transparent",
            color: COLORS.pageText,
            border: "1px solid #2f333a",
            borderRadius: 4,
            cursor: "pointer",
            opacity: 0.8
          }}
        >
          {isPresentationMode ? uiTextSV.exitPresentationMode : uiTextSV.enterPresentationMode}
        </button>
      </div>

      {showHelper && (
        <div style={{
          marginBottom: 24,
          padding: 16,
          background: "#1a1a1a",
          border: "1px solid #2f333a",
          borderRadius: 8,
          maxWidth: 600
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
            color: COLORS.pageText
          }}>
            {uiTextSV.helperTitle}
          </h3>
          <div style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: COLORS.pageText,
            opacity: 0.9
          }}>
            <p style={{ marginBottom: 12 }}>
              {uiTextSV.helperParagraph1}
            </p>
            <p style={{ marginBottom: 12 }}>
              {uiTextSV.helperParagraph2}
            </p>
            <p>
              {uiTextSV.helperParagraph3}
            </p>
          </div>
        </div>
      )}

      {showUpdateIndicator && (
        <div style={{
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 16,
          color: COLORS.pageText,
          display: "flex",
          alignItems: "center",
          gap: 6
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: COLORS.pageText,
            opacity: 0.6
          }}></span>
          {uiTextSV.systemStateUpdated}
        </div>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2>{uiTextSV.simulationInputs}</h2>
        <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16, marginTop: 8 }}>
          {uiTextSV.simulationInputsExplanation}
        </p>
        <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16, fontStyle: "italic" }}>
          {uiTextSV.simulationInputsPurpose}
        </p>

        <div style={{ maxWidth: 500 }}>
          {/* Question 1: Current system state */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8, maxWidth: 480 }}>
              Beskriv hur systemet upplevs just nu. Inte hur det borde vara, utan hur det faktiskt är. Om ni är oense – välj det läge som flest i rummet kan enas om.
            </div>
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>{uiTextSV.currentSystemState}</h3>
            <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
              {uiTextSV.currentSystemStateDescription}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="situation"
                  value="calm"
                  checked={situation === "calm"}
                  onChange={e => setSituation(e.target.value as "calm" | "manageable" | "strained" | "heavy-pressure")}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.calmAndStable}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="situation"
                  value="manageable"
                  checked={situation === "manageable"}
                  onChange={e => setSituation(e.target.value as "calm" | "manageable" | "strained" | "heavy-pressure")}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.manageable}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="situation"
                  value="strained"
                  checked={situation === "strained"}
                  onChange={e => setSituation(e.target.value as "calm" | "manageable" | "strained" | "heavy-pressure")}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.strained}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="situation"
                  value="heavy-pressure"
                  checked={situation === "heavy-pressure"}
                  onChange={e => setSituation(e.target.value as "calm" | "manageable" | "strained" | "heavy-pressure")}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.underHeavyPressure}</span>
              </label>
            </div>
          </div>

          {/* Question 2: External change */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8, maxWidth: 480 }}>
              Detta är inte ett beslut. Det är något som påverkar systemet oavsett vad ni gör. Frågan är: vad trycker på systemet just nu?
            </div>
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>{uiTextSV.externalChange}</h3>
            <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
              {uiTextSV.externalChangeDescription}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="change"
                  value="increasing-pressure"
                  checked={change === "increasing-pressure"}
                  onChange={e => setChange(e.target.value as "increasing-pressure" | "loss-capacity" | "no-change")}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.increasingPressure}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="change"
                  value="loss-capacity"
                  checked={change === "loss-capacity"}
                  onChange={e => setChange(e.target.value as "increasing-pressure" | "loss-capacity" | "no-change")}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.lossOfCapacity}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="change"
                  value="no-change"
                  checked={change === "no-change"}
                  onChange={e => setChange(e.target.value as "increasing-pressure" | "loss-capacity" | "no-change")}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.noMajorChange}</span>
              </label>
            </div>
          </div>

          {/* Question 3: Response focus */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8, maxWidth: 480 }}>
              Här testar ni inte vad som är rätt, utan vad som händer när olika prioriteringar får styra systemets utveckling över tid.
            </div>
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>{uiTextSV.responseFocus}</h3>
            <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
              {uiTextSV.responseFocusDescription}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="decision"
                  value="conservative"
                  checked={decision === "conservative"}
                  onChange={e => setDecision(e.target.value as PolicyKey)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.protectPeopleAndStability}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="decision"
                  value="balanced"
                  checked={decision === "balanced"}
                  onChange={e => setDecision(e.target.value as PolicyKey)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.balanceShortTermAndLongTerm}</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="decision"
                  value="aggressive"
                  checked={decision === "aggressive"}
                  onChange={e => setDecision(e.target.value as PolicyKey)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 14 }}>{uiTextSV.pushHardToMeetDemands}</span>
              </label>
            </div>
          </div>

          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16, fontStyle: "italic" }}>
            {uiTextSV.pilotHelperText}
          </p>

          <button
            onClick={runSimulation}
            disabled={loading}
            style={{ 
              padding: "8px 16px",
              background: loading ? "#2f333a" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600
            }}
          >
            {loading ? uiTextSV.running : uiTextSV.runSimulation}
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>{uiTextSV.decisionPolicy}</h2>

        <select
          value={decision}
          onChange={e => setDecision(e.target.value as PolicyKey)}
          style={{ padding: 8, fontSize: 14 }}
        >
          <option value="conservative">{uiTextSV.policyConservative}</option>
          <option value="balanced">{uiTextSV.policyBalanced}</option>
          <option value="aggressive">{uiTextSV.policyAggressive}</option>
        </select>

        <p style={{ marginTop: 8, fontSize: 14, maxWidth: 400 }}>
          {POLICIES[decision].description}
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>{uiTextSV.decisionFlow}</h2>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          {uiTextSV.clickStepToFocus}
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4
          }}
        >
          <FlowBox
            title={uiTextSV.flowBoxBaseline}
            description={uiTextSV.flowBoxBaselineDesc}
            active={activeStep === "baseline"}
            onClick={() => setActiveStep("baseline")}
          />
          <Arrow />
          <FlowBox
            title={uiTextSV.flowBoxLoad}
            description={uiTextSV.flowBoxLoadDesc}
            active={activeStep === "load"}
            onClick={() => setActiveStep("load")}
          />
          <Arrow />
          <FlowBox
            title={uiTextSV.flowBoxDecision}
            description={uiTextSV.flowBoxDecisionDesc}
            active={activeStep === "decision"}
            onClick={() => setActiveStep("decision")}
          />
          <Arrow />
          <FlowBox
            title={uiTextSV.flowBoxTime}
            description={uiTextSV.flowBoxTimeDesc}
            active={activeStep === "time"}
            onClick={() => setActiveStep("time")}
          />
          <Arrow />
          <FlowBox
            title={uiTextSV.flowBoxConsequences}
            description={uiTextSV.flowBoxConsequencesDesc}
            active={activeStep === "consequences"}
            onClick={() => setActiveStep("consequences")}
          />
          <Arrow />
          <FlowBox
            title={uiTextSV.flowBoxCompare}
            description={uiTextSV.flowBoxCompareDesc}
            active={activeStep === "compare"}
            onClick={() => setActiveStep("compare")}
          />
        </div>
      </section>

      {activeStep && (
        <section
          style={{
            marginTop: 32,
            padding: 16,
            border: "2px dashed #ccc",
            borderRadius: 8,
            maxWidth: 600
          }}
        >
          <h3>{STEP_DETAILS[activeStep].title}</h3>
          <p style={{ marginTop: 8, fontSize: 14 }}>
            {STEP_DETAILS[activeStep].explanation}
          </p>
        </section>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2>{uiTextSV.visualResults}</h2>

        <div style={{ maxWidth: 420 }}>
          <h3 style={{ marginTop: 12 }}>{uiTextSV.load}</h3>
          <Bar label={uiTextSV.baseline} value={baselineLoadVal} max={maxLoad} />
          <Bar label={uiTextSV.final} value={finalLoadVal} max={maxLoad} />

          <h3 style={{ marginTop: 16 }}>{uiTextSV.cost}</h3>
          <Bar label={uiTextSV.baseline} value={baselineCostVal} max={maxCost} />
          <Bar label={uiTextSV.final} value={finalCostVal} max={maxCost} />
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>{uiTextSV.consequencesOverTime}</h2>

        <div style={{ maxWidth: 520 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 80px 1fr 80px",
              gap: 8,
              fontSize: 12,
              opacity: 0.7,
              borderBottom: "1px solid #334155",
              paddingBottom: 4,
              marginBottom: 4
            }}
          >
            <div>{uiTextSV.time}</div>
            <div>{uiTextSV.metric}</div>
            <div>{uiTextSV.deltaChange}</div>
            <div>{uiTextSV.value}</div>
          </div>

          {data.consequences.map((c: any, i: number) => (
            <TimelineRow
              key={i}
              time={c.time}
              metric={c.metric}
              delta={c.delta}
              value={c.value}
            />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32, padding: 20, background: "#1a1f2e", borderRadius: 8, border: "1px solid #2f333a" }}>
        <h2>{uiTextSV.observedConsequences}</h2>

        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>{uiTextSV.accumulatedImpact}</h3>
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              {uiTextSV.accumulatedImpactText}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>{uiTextSV.recovery}</h3>
            <p style={{ fontSize: 13 }}>
              {hasRecovery
                ? uiTextSV.recoveryReturns
                : uiTextSV.recoveryNotReturns}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>{uiTextSV.systemState}</h3>
            <p style={{ fontSize: 13 }}>{systemState}</p>
          </div>

          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 20, fontStyle: "italic" }}>
            {uiTextSV.observedConsequencesDisclaimer}
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 32, padding: 20, background: "#1a1f2e", borderRadius: 8, border: "1px solid #2f333a" }}>
        <h2>{uiTextSV.decisionNarrative}</h2>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 8, marginBottom: 24 }}>
          {uiTextSV.decisionNarrativeSubtitle}
        </p>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>{uiTextSV.alternativeResponse}</label>
          <select
            value={policyB}
            onChange={e => setPolicyB(e.target.value as PolicyKey)}
            style={{ padding: 8, fontSize: 14, width: "100%", maxWidth: 400, background: "#0e1117", color: COLORS.pageText, border: "1px solid #2f333a", borderRadius: 4 }}
          >
            <option value="conservative">{uiTextSV.policyConservative}</option>
            <option value="balanced">{uiTextSV.policyBalanced}</option>
            <option value="aggressive">{uiTextSV.policyAggressive}</option>
          </select>
        </div>

        <div style={{ padding: 20, background: "#0e1117", borderRadius: 8, border: "1px solid #2f333a", marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>
            {decision === "conservative" ? uiTextSV.policyConservative : decision === "balanced" ? uiTextSV.policyBalanced : uiTextSV.policyAggressive}
          </h3>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8, opacity: 0.9 }}>{uiTextSV.earlyResponse}</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              {decisionANarrative.phase1}
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8, opacity: 0.9 }}>{uiTextSV.accumulation}</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              {decisionANarrative.phase2}
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 14, marginBottom: 8, opacity: 0.9 }}>{uiTextSV.outcome}</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              {decisionANarrative.phase3}
            </p>
          </div>
        </div>

        <div style={{ padding: 20, background: "#0e1117", borderRadius: 8, border: "1px solid #2f333a", opacity: 0.8 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>
            {policyB === "conservative" ? uiTextSV.policyConservative : policyB === "balanced" ? uiTextSV.policyBalanced : uiTextSV.policyAggressive}
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
            {uiTextSV.ifDifferentResponse}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
            {(() => {
              const policyBDiff = policyB !== decision;
              if (!policyBDiff) {
                return uiTextSV.sameResponseNote;
              }
              if (policyB === "conservative" && decision !== "conservative") {
                return uiTextSV.policyBComparisonConservative;
              } else if (policyB === "aggressive" && decision !== "aggressive") {
                return uiTextSV.policyBComparisonAggressive;
              } else {
                return uiTextSV.policyBComparisonOther;
              }
            })()}
          </p>
        </div>

        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 24, fontStyle: "italic" }}>
          {uiTextSV.decisionNarrativeDisclaimer}
        </p>
      </section>

      <section style={{ marginBottom: 32, padding: 20, background: "#1a1f2e", borderRadius: 8, border: "1px solid #2f333a" }}>
        <h2>{uiTextSV.systemImplications}</h2>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 8, marginBottom: 16 }}>
          {uiTextSV.systemImplicationsSubtitle}
        </p>

        <div style={{ marginTop: 16 }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
              • {implications.pressure}
            </li>
            <li style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
              • {implications.commitment}
            </li>
            <li style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
              • {implications.recovery}
            </li>
          </ul>
        </div>

        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 20, fontStyle: "italic" }}>
          {uiTextSV.systemImplicationsDisclaimer}
        </p>
      </section>

      {/* Read-only AI explanation layer - the UI performs zero interpretation or transformation */}
      {ENABLE_AI_INTERPRETATION_PANEL && aiInterpretationData && (
        <>
          <section style={{ marginBottom: 32, padding: 20, background: "#1a1f2e", borderRadius: 8, border: "1px solid #2f333a" }}>
            <AIInterpretationExplanation data={aiInterpretationData} />
          </section>
          <section style={{ marginBottom: 32, padding: 20, background: "#1a1f2e", borderRadius: 8, border: "1px solid #2f333a" }}>
            <AIInterpretationPanel data={aiInterpretationData} />
          </section>
        </>
      )}

      {!isPresentationMode && (
        <>
          <h2>{uiTextSV.baselineData}</h2>
          <pre>{JSON.stringify(data.baseline, null, 2)}</pre>

          <h2>{uiTextSV.finalState}</h2>
          <pre>{JSON.stringify(data.final, null, 2)}</pre>

          <h2>{uiTextSV.compareVsBaseline}</h2>
          <pre>{JSON.stringify(data.compare, null, 2)}</pre>

          <h2>{uiTextSV.consequencesData}</h2>
          <pre>{JSON.stringify(data.consequences, null, 2)}</pre>
        </>
      )}
    </main>
  );
}


