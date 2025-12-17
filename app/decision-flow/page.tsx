"use client";

import { useState } from "react";
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
  const [policy, setPolicy] = useState<PolicyKey>("balanced");
  const [baselineLoad, setBaselineLoad] = useState(1);
  const [baselineCost, setBaselineCost] = useState(10);
  const [changeLoad, setChangeLoad] = useState(0);
  const [changeCost, setChangeCost] = useState(0);
  const [steps, setSteps] = useState(3);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const engine = new DecisionFlowEngine({
    time: 0,
    metrics: {
      load: 1,
      cost: 10
    }
  });

  // Load / Change (external pressure)
  engine.applyLoad(state => {
    state.metrics.load += 3;
    state.metrics.cost += 2;
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
  }

  const data = result ?? defaultResult;

  const baselineLoadVal = data.baseline.metrics.load;
  const finalLoadVal = data.final.metrics.load;
  const baselineCostVal = data.baseline.metrics.cost;
  const finalCostVal = data.final.metrics.cost;

  const maxLoad = Math.max(baselineLoadVal, finalLoadVal) || 1;
  const maxCost = Math.max(baselineCostVal, finalCostVal) || 1;

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

      <h1>Decision Flow Sandbox</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>Simulation Inputs</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, maxWidth: 400 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Baseline Load
            <input 
              type="number" 
              value={baselineLoad} 
              onChange={e => setBaselineLoad(Number(e.target.value))}
              style={{ padding: 8, fontSize: 14, background: "#1a1f2e", color: COLORS.pageText, border: "1px solid #2f333a", borderRadius: 4 }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Baseline Cost
            <input 
              type="number" 
              value={baselineCost} 
              onChange={e => setBaselineCost(Number(e.target.value))}
              style={{ padding: 8, fontSize: 14, background: "#1a1f2e", color: COLORS.pageText, border: "1px solid #2f333a", borderRadius: 4 }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            External Load Change
            <input 
              type="number" 
              value={changeLoad} 
              onChange={e => setChangeLoad(Number(e.target.value))}
              style={{ padding: 8, fontSize: 14, background: "#1a1f2e", color: COLORS.pageText, border: "1px solid #2f333a", borderRadius: 4 }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            External Cost Change
            <input 
              type="number" 
              value={changeCost} 
              onChange={e => setChangeCost(Number(e.target.value))}
              style={{ padding: 8, fontSize: 14, background: "#1a1f2e", color: COLORS.pageText, border: "1px solid #2f333a", borderRadius: 4 }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Steps
            <input 
              type="number" 
              value={steps} 
              min={1} 
              onChange={e => setSteps(Number(e.target.value))}
              style={{ padding: 8, fontSize: 14, background: "#1a1f2e", color: COLORS.pageText, border: "1px solid #2f333a", borderRadius: 4 }}
            />
          </label>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading}
          style={{ 
            marginTop: 16, 
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
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Decision Policy</h2>

        <select
          value={policy}
          onChange={e => setPolicy(e.target.value as PolicyKey)}
          style={{ padding: 8, fontSize: 14 }}
        >
          {Object.entries(POLICIES).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </select>

        <p style={{ marginTop: 8, fontSize: 14, maxWidth: 400 }}>
          {POLICIES[policy].description}
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

      <h2>Baseline</h2>
      <pre>{JSON.stringify(data.baseline, null, 2)}</pre>

      <h2>Final State</h2>
      <pre>{JSON.stringify(data.final, null, 2)}</pre>

      <h2>Compare vs Baseline</h2>
      <pre>{JSON.stringify(data.compare, null, 2)}</pre>

      <h2>Consequences Over Time</h2>
      <pre>{JSON.stringify(data.consequences, null, 2)}</pre>
    </main>
  );
}

