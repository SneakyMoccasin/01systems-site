"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DecisionFlowEngine } from "@/src/decisionFlow/engine";

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
    title: "Baseline",
    explanation:
      "This represents the system in its initial state. No decisions have been applied. It is the reference point used to compare outcomes."
  },
  load: {
    title: "Load / Change",
    explanation:
      "External pressure or changed conditions applied to the system. This is not a decision, but context the system must handle."
  },
  decision: {
    title: "Decision",
    explanation:
      "An intentional action applied to the system. This is the variable being tested."
  },
  time: {
    title: "Simulation Over Time",
    explanation:
      "The system is allowed to evolve as time progresses. Effects may accumulate or emerge."
  },
  consequences: {
    title: "Consequences",
    explanation:
      "Observed effects, trade-offs, and emergent outcomes caused by the decision under the given conditions."
  },
  compare: {
    title: "Compare vs Baseline",
    explanation:
      "A comparison between the final outcome and doing nothing at all. This is where insight is created."
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
    label: "Balanced",
    description: "Moderate trade-off between load reduction and cost.",
    apply: state => {
      state.metrics.load -= 1;
      state.metrics.cost += 1;
    }
  },
  aggressive: {
    label: "Aggressive",
    description: "Strong load reduction at higher cost.",
    apply: state => {
      state.metrics.load -= 2;
      state.metrics.cost += 3;
    }
  },
  conservative: {
    label: "Conservative",
    description: "Minimal intervention, low cost impact.",
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
  
  let systemState = "Stable";
  if (loadAboveBaselineRatio > 0.5) {
    systemState = "Unstable";
  } else if (loadAboveBaselineRatio > 0) {
    systemState = "Under pressure";
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
    
    let systemStateText = "Stable";
    if (loadAboveBaselineRatio > 0.5) {
      systemStateText = "Unstable";
    } else if (loadAboveBaselineRatio > 0) {
      systemStateText = "Under pressure";
    }

    // Phase 1: Early response
    const earlyLoadIncrease = earlyLoadChanges.some((c: any) => c.delta > 0);
    const earlyLoadStable = earlyLoadChanges.length === 0 || earlyLoadChanges.every((c: any) => Math.abs(c.delta) < 0.5);
    const earlyCostRise = earlyCostChanges.some((c: any) => c.delta > 0);
    
    let phase1 = "";
    if (earlyLoadIncrease) {
      phase1 = "Pressure rises quickly.";
    } else if (earlyLoadStable) {
      phase1 = "The system absorbs the initial change.";
    } else {
      phase1 = "The system responds to the initial change.";
    }
    if (earlyCostRise) {
      phase1 += " Early trade-offs emerge.";
    }

    // Phase 2: Accumulation
    let phase2 = "";
    if (loadAboveBaselineRatio > 0.5) {
      phase2 = "Sustained pressure narrows future options. The system's flexibility decreases as constraints become more entrenched.";
    } else if (loadAboveBaselineRatio > 0 && loadAboveBaselineRatio <= 0.5) {
      phase2 = "The system oscillates between stability and strain. Some flexibility remains, but repeated imbalances create lock-in effects.";
    } else {
      phase2 = "The system maintains relative stability with minimal constraint formation.";
    }
    if (resultData.compare.cost !== 0) {
      const costIncrease = resultData.compare.cost > 0;
      if (costIncrease) {
        phase2 += " Resources are committed, reducing available margin for future adjustments.";
      } else {
        phase2 += " Resource allocation shifts, affecting the system's resilience.";
      }
    }

    // Phase 3: Outcome
    let phase3 = "";
    if (hasRecovery) {
      phase3 = `The system reaches a new equilibrium that aligns with baseline conditions. The system state is ${systemStateText.toLowerCase()}.`;
    } else {
      const costIncrease = resultData.compare.cost > 0;
      const loadIncrease = resultData.compare.load > 0;
      
      if (costIncrease && loadIncrease) {
        phase3 = `The system stabilizes at a new equilibrium with higher sustained cost and pressure. Flexibility and margin are reduced. The system state is ${systemStateText.toLowerCase()}.`;
      } else if (costIncrease) {
        phase3 = `The system reaches a new equilibrium with higher sustained cost. Recovery is incomplete, and available margin is diminished. The system state is ${systemStateText.toLowerCase()}.`;
      } else if (loadIncrease) {
        phase3 = `The system stabilizes with sustained pressure above baseline. Recovery is delayed, and operational flexibility is constrained. The system state is ${systemStateText.toLowerCase()}.`;
      } else {
        phase3 = `The system reaches a new equilibrium that differs from baseline. Recovery is incomplete. The system state is ${systemStateText.toLowerCase()}.`;
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
      pressure = "Elevated pressure signals increased sensitivity and fragility to additional disruptions.";
    } else {
      pressure = "Intermittent pressure signals that the system retains some adaptive capacity, though sensitivity remains present.";
    }
    
    // Commitment signal: reduced flexibility / margin
    let commitment = "";
    if (costIncrease) {
      commitment = "Sustained commitments signal reduced flexibility and diminished margin for future adjustments.";
    } else {
      commitment = "Resource commitments remain closer to baseline, signaling preserved flexibility.";
    }
    
    // Recovery signal: dependency on external change
    let recovery = "";
    if (!hasRecovery) {
      recovery = "Recovery signals depend on changes outside the current response pattern, indicating structural dependency on external conditions.";
    } else {
      recovery = "The system signals the ability to realign with baseline conditions under current response patterns.";
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
          ← Back to Intro
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Decision Flow Sandbox</h1>
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
            What am I seeing?
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
          {isPresentationMode ? "Exit presentation mode" : "Enter presentation mode"}
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
            About this view
          </h3>
          <div style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: COLORS.pageText,
            opacity: 0.9
          }}>
            <p style={{ marginBottom: 12 }}>
              This simulation shows how different response choices play out over time under a given set of conditions. Each time you run it, the system recalculates the trajectory based on your inputs.
            </p>
            <p style={{ marginBottom: 12 }}>
              The decision narrative explains how a chosen response unfolds step by step. System implications describe broader signals the system emits if current conditions persist, regardless of response.
            </p>
            <p>
              This tool illustrates patterns and consequences. It does not provide recommendations, predictions, or exact forecasts.
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
          System state updated
        </div>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2>Simulation Inputs</h2>

        <div style={{ maxWidth: 500 }}>
          {/* Question 1: Current system state */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>Current system state</h3>
            <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
              How strained is the system right now?
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
                <span style={{ fontSize: 14 }}>Calm and stable</span>
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
                <span style={{ fontSize: 14 }}>Manageable</span>
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
                <span style={{ fontSize: 14 }}>Strained</span>
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
                <span style={{ fontSize: 14 }}>Under heavy pressure</span>
              </label>
            </div>
          </div>

          {/* Question 2: External change */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>External change</h3>
            <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
              What is increasing pressure on the system?
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
                <span style={{ fontSize: 14 }}>Increasing pressure</span>
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
                <span style={{ fontSize: 14 }}>Loss of capacity</span>
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
                <span style={{ fontSize: 14 }}>No major change</span>
              </label>
            </div>
          </div>

          {/* Question 3: Response focus */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>Response focus</h3>
            <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
              What is the primary focus of the response?
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
                <span style={{ fontSize: 14 }}>Protect people and stability</span>
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
                <span style={{ fontSize: 14 }}>Balance short-term pressure and long-term health</span>
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
                <span style={{ fontSize: 14 }}>Push hard to meet current demands</span>
              </label>
            </div>
          </div>

          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16, fontStyle: "italic" }}>
            This pilot uses indexed values to illustrate how decisions affect a system over time.
            The focus is on patterns, trade-offs, and consequences — not exact numbers.
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
            {loading ? "Running…" : "Run Simulation"}
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Decision Policy</h2>

        <select
          value={decision}
          onChange={e => setDecision(e.target.value as PolicyKey)}
          style={{ padding: 8, fontSize: 14 }}
        >
          <option value="conservative">Protect people and stability</option>
          <option value="balanced">Balance short-term pressure and long-term health</option>
          <option value="aggressive">Push hard to meet current demands</option>
        </select>

        <p style={{ marginTop: 8, fontSize: 14, maxWidth: 400 }}>
          {POLICIES[decision].description}
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2>Decision Flow</h2>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          Click a step to focus on it
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
            title="Baseline"
            description="Initial system state. No decisions applied. Reference point."
            active={activeStep === "baseline"}
            onClick={() => setActiveStep("baseline")}
          />
          <Arrow />
          <FlowBox
            title="Load / Change"
            description="External pressure or changed conditions. Not a decision."
            active={activeStep === "load"}
            onClick={() => setActiveStep("load")}
          />
          <Arrow />
          <FlowBox
            title="Decision"
            description="Intentional action applied to the system."
            active={activeStep === "decision"}
            onClick={() => setActiveStep("decision")}
          />
          <Arrow />
          <FlowBox
            title="Simulation Over Time"
            description="System evolves as time progresses."
            active={activeStep === "time"}
            onClick={() => setActiveStep("time")}
          />
          <Arrow />
          <FlowBox
            title="Consequences"
            description="Observed effects, trade-offs, and emergent outcomes."
            active={activeStep === "consequences"}
            onClick={() => setActiveStep("consequences")}
          />
          <Arrow />
          <FlowBox
            title="Compare vs Baseline"
            description="Differences between outcome and doing nothing."
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
        <h2>Visual Results</h2>

        <div style={{ maxWidth: 420 }}>
          <h3 style={{ marginTop: 12 }}>Load</h3>
          <Bar label="Baseline" value={baselineLoadVal} max={maxLoad} />
          <Bar label="Final" value={finalLoadVal} max={maxLoad} />

          <h3 style={{ marginTop: 16 }}>Cost</h3>
          <Bar label="Baseline" value={baselineCostVal} max={maxCost} />
          <Bar label="Final" value={finalCostVal} max={maxCost} />
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>Consequences Over Time</h2>

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
            <div>Time</div>
            <div>Metric</div>
            <div>Δ Change</div>
            <div>Value</div>
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
        <h2>Observed consequences</h2>

        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Accumulated impact</h3>
            <p style={{ fontSize: 13, opacity: 0.8 }}>
              Small differences early can result in significant long-term effects.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Recovery</h3>
            <p style={{ fontSize: 13 }}>
              {hasRecovery
                ? "The system returns to baseline within the selected time horizon."
                : "The system does not recover within the selected time horizon."}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>System state</h3>
            <p style={{ fontSize: 13 }}>{systemState}</p>
          </div>

          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 20, fontStyle: "italic" }}>
            This simulation shows consequences — not recommendations.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 32, padding: 20, background: "#1a1f2e", borderRadius: 8, border: "1px solid #2f333a" }}>
        <h2>Decision narrative</h2>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 8, marginBottom: 24 }}>
          How different choices shape the system over time under the same conditions.
        </p>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>Alternative response</label>
          <select
            value={policyB}
            onChange={e => setPolicyB(e.target.value as PolicyKey)}
            style={{ padding: 8, fontSize: 14, width: "100%", maxWidth: 400, background: "#0e1117", color: COLORS.pageText, border: "1px solid #2f333a", borderRadius: 4 }}
          >
            <option value="conservative">Protect people and stability</option>
            <option value="balanced">Balance short-term pressure and long-term health</option>
            <option value="aggressive">Push hard to meet current demands</option>
          </select>
        </div>

        <div style={{ padding: 20, background: "#0e1117", borderRadius: 8, border: "1px solid #2f333a", marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>
            {decision === "conservative" ? "Protect people and stability" : decision === "balanced" ? "Balance short-term pressure and long-term health" : "Push hard to meet current demands"}
          </h3>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8, opacity: 0.9 }}>Early response</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              {decisionANarrative.phase1}
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8, opacity: 0.9 }}>Accumulation</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              {decisionANarrative.phase2}
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 14, marginBottom: 8, opacity: 0.9 }}>Outcome</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              {decisionANarrative.phase3}
            </p>
          </div>
        </div>

        <div style={{ padding: 20, background: "#0e1117", borderRadius: 8, border: "1px solid #2f333a", opacity: 0.8 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>
            {policyB === "conservative" ? "Protect people and stability" : policyB === "balanced" ? "Balance short-term pressure and long-term health" : "Push hard to meet current demands"}
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
            If a different response is applied under the same conditions:
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
            {(() => {
              const policyBDiff = policyB !== decision;
              if (!policyBDiff) {
                return "Under the same conditions, choosing the same response leads to a similar trajectory. Meaningful divergence would require different timing, scale, or focus in the response.";
              }
              if (policyB === "conservative" && decision !== "conservative") {
                return "Pressure reduction occurs earlier, but the path to recovery extends. The system prioritizes stability and preserves flexibility, though immediate capacity gains are deferred.";
              } else if (policyB === "aggressive" && decision !== "aggressive") {
                return "The system responds more quickly to immediate demands, accelerating initial relief. However, sustained pressure accumulates over time, and long-term flexibility is reduced. Short-term disruption is lower, but operational margin narrows.";
              } else {
                return "The trajectory diverges in timing and trade-off patterns. The system balances immediate response with longer-term considerations differently, affecting when constraints form and how flexibility is preserved or reduced.";
              }
            })()}
          </p>
        </div>

        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 24, fontStyle: "italic" }}>
          This narrative shows how decisions unfold over time.
          It does not recommend actions or optimize outcomes.
        </p>
      </section>

      <section style={{ marginBottom: 32, padding: 20, background: "#1a1f2e", borderRadius: 8, border: "1px solid #2f333a" }}>
        <h2>System implications (if conditions persist)</h2>
        <p style={{ fontSize: 13, opacity: 0.8, marginTop: 8, marginBottom: 16 }}>
          Signals the system emits under sustained pressure, regardless of response strategy.
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
          These implications describe system-level signals under the current conditions. They are not tied to a specific decision and do not constitute recommendations.
        </p>
      </section>

      {!isPresentationMode && (
        <>
          <h2>Baseline</h2>
          <pre>{JSON.stringify(data.baseline, null, 2)}</pre>

          <h2>Final State</h2>
          <pre>{JSON.stringify(data.final, null, 2)}</pre>

          <h2>Compare vs Baseline</h2>
          <pre>{JSON.stringify(data.compare, null, 2)}</pre>

          <h2>Consequences Over Time</h2>
          <pre>{JSON.stringify(data.consequences, null, 2)}</pre>
        </>
      )}
    </main>
  );
}

