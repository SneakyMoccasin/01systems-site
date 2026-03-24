"use client";

import { useState, useMemo } from "react";
import { BEVIS_CASES } from "@/config/bevisCases";
import { detectNoReturn, type SimulationRun, type TickState } from "@/engine/noReturnDetector";

const COLORS = {
  pageBg: "#0e1117",
  pageText: "#e6edf3",
  cardBg: "#1a1a1a",
  cardBorder: "#2f333a",
  load: "#ef4444",
  capacity: "#3b82f6",
  recovery: "#10b981",
  locked: "#f59e0b",
  open: "#10b981",
};

const CASE_NAMES: Record<string, { primary: string; secondary: string }> = {
  "01": {
    primary: "Gradvis instabilitet",
    secondary: "Det såg stabilt ut.",
  },
  "02": {
    primary: "Ackumulerad utmattning",
    secondary: "Det fungerade – tills det inte gjorde det.",
  },
  "03": {
    primary: "Komplexitetseskalering",
    secondary: "Mer resurser gjorde det värre.",
  },
};

function runSimulation(
  baselineParams: {
    initialLoad: number;
    initialCapacity: number;
    initialRecovery: number;
    loadGrowthRate: number;
    capacityGrowthRate: number;
    recoveryDecayRate: number;
  },
  intervention: {
    type: "capacity_boost" | "recovery_boost";
    magnitude: number;
    duration: number;
  } | null,
  interventionTick: number | null,
  maxTicks: number
): SimulationRun {
  const run: SimulationRun = [];

  let load = baselineParams.initialLoad;
  let capacity = baselineParams.initialCapacity;
  let recovery = baselineParams.initialRecovery;

  let interventionActive = false;
  let interventionRemaining = 0;

  run.push({
    time: 0,
    load,
    capacity,
    recovery,
  });

  for (let tick = 1; tick <= maxTicks; tick++) {
    if (intervention && interventionTick !== null && tick === interventionTick) {
      interventionActive = true;
      interventionRemaining = intervention.duration;
    }

    if (interventionActive && intervention) {
      if (intervention.type === "capacity_boost") {
        capacity += intervention.magnitude;
      } else if (intervention.type === "recovery_boost") {
        recovery += intervention.magnitude;
      }
      interventionRemaining--;
      if (interventionRemaining <= 0) {
        interventionActive = false;
      }
    }

    load += baselineParams.loadGrowthRate;
    capacity += baselineParams.capacityGrowthRate;
    recovery -= baselineParams.recoveryDecayRate;

    if (recovery < 0) recovery = 0;

    run.push({
      time: tick,
      load,
      capacity,
      recovery,
    });
  }

  return run;
}

type ScenarioPanelProps = {
  label: string;
  subtitle: string;
  run: SimulationRun;
  result: { isLocked: boolean; firstLockedTick: number | null };
};

function ScenarioPanel({ label, subtitle, run, result }: ScenarioPanelProps) {
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);
  const [showMarkerTooltip, setShowMarkerTooltip] = useState(false);
  const maxTime = Math.max(...run.map((r) => r.time));
  const maxValue = Math.max(
    ...run.flatMap((r) => [r.load, r.capacity, r.recovery])
  );

  const chartHeight = 200;
  const chartWidth = 400;

  return (
    <div
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 8,
        padding: 24,
        flex: 1,
        minWidth: 450,
      }}
    >
      <h2 style={{ marginBottom: 4, fontSize: 18, color: COLORS.pageText }}>
        {label}
      </h2>
      <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 24 }}>
        {subtitle}
      </p>

      <div
        style={{
          marginBottom: 24,
          display: "inline-block",
          padding: "8px 14px",
          background: result.isLocked ? "#1f2937" : "#0f172a",
          border: `1px solid ${result.isLocked ? COLORS.locked : COLORS.open}`,
          borderRadius: 4,
          position: "relative",
        }}
        onMouseEnter={() => setShowStatusTooltip(true)}
        onMouseLeave={() => setShowStatusTooltip(false)}
      >
        <div style={{ fontSize: 13, color: COLORS.pageText }}>
          {result.isLocked ? "Utfallet låst" : "Utfallet fortfarande öppet"}
        </div>
        {showStatusTooltip && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              marginBottom: 8,
              padding: "8px 12px",
              background: "#1a1a1a",
              color: COLORS.pageText,
              fontSize: 12,
              borderRadius: 4,
              border: `1px solid ${COLORS.cardBorder}`,
              whiteSpace: "nowrap",
              zIndex: 1000,
              pointerEvents: "none",
            }}
          >
            {result.isLocked
              ? "Efter denna punkt kan utfallet inte förändras inom systemets egna ramar."
              : "Systemet är fortfarande påverkbart givet nuvarande dynamik."}
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          width: chartWidth,
          height: chartHeight,
          marginBottom: 16,
        }}
      >
        <svg width={chartWidth} height={chartHeight}>

          {result.firstLockedTick !== null && (
            <line
              x1={(result.firstLockedTick / maxTime) * chartWidth}
              y1={0}
              x2={(result.firstLockedTick / maxTime) * chartWidth}
              y2={chartHeight}
              stroke={COLORS.locked}
              strokeWidth={2}
              strokeDasharray="4 4"
              opacity={0.8}
            />
          )}

          {["load", "capacity", "recovery"].map((metric, idx) => {
            const color =
              metric === "load"
                ? COLORS.load
                : metric === "capacity"
                ? COLORS.capacity
                : COLORS.recovery;

            const points = run
              .map((r) => {
                const x = (r.time / maxTime) * chartWidth;
                const value =
                  metric === "load"
                    ? r.load
                    : metric === "capacity"
                    ? r.capacity
                    : r.recovery;
                const y = chartHeight - (value / maxValue) * chartHeight;
                return `${x},${y}`;
              })
              .join(" ");

            return (
              <polyline
                key={metric}
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                opacity={1}
              />
            );
          })}
        </svg>
        {result.firstLockedTick !== null && (
          <>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: (result.firstLockedTick / maxTime) * chartWidth - 50,
                width: 100,
                height: chartHeight,
                cursor: "pointer",
                zIndex: 10,
              }}
              onMouseEnter={() => setShowMarkerTooltip(true)}
              onMouseLeave={() => setShowMarkerTooltip(false)}
            />
            {showMarkerTooltip && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: (result.firstLockedTick / maxTime) * chartWidth - 120,
                  marginTop: -8,
                  padding: "8px 12px",
                  background: "#1a1a1a",
                  color: COLORS.pageText,
                  fontSize: 12,
                  borderRadius: 4,
                  border: `1px solid ${COLORS.cardBorder}`,
                  whiteSpace: "nowrap",
                  zIndex: 1000,
                  pointerEvents: "none",
                }}
              >
                Tidpunkt då framtida åtgärder inte längre kan förändra utfallet.
              </div>
            )}
            <div
              style={{
                position: "absolute",
                top: chartHeight + 4,
                left: (result.firstLockedTick / maxTime) * chartWidth - 50,
                fontSize: 11,
                color: COLORS.locked,
                textAlign: "center",
                width: 100,
              }}
            >
              No-return-punkt
            </div>
          </>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#9ca3af" }}>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: COLORS.load,
                borderRadius: 2,
              }}
            />
            <span>Belastning</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: COLORS.capacity,
                borderRadius: 2,
              }}
            />
            <span>Kapacitet</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: COLORS.recovery,
                borderRadius: 2,
              }}
            />
            <span>Återhämtning</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BevisPage() {
  const [selectedCaseId, setSelectedCaseId] = useState("01");
  const [showScenarioC, setShowScenarioC] = useState(false);

  const selectedCase = useMemo(
    () => BEVIS_CASES.find((c) => c.id === selectedCaseId),
    [selectedCaseId]
  );

  const handleCaseChange = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowScenarioC(false);
  };

  if (!selectedCase) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: COLORS.pageBg,
          color: COLORS.pageText,
          padding: 40,
        }}
      >
        <div>Bevis Case not found</div>
      </div>
    );
  }

  const maxTicks = 60;

  const scenarioA = useMemo(
    () =>
      runSimulation(
        selectedCase.baselineParams,
        null,
        null,
        maxTicks
      ),
    [selectedCase.baselineParams, maxTicks]
  );

  const scenarioB = useMemo(
    () =>
      runSimulation(
        selectedCase.baselineParams,
        selectedCase.intervention,
        selectedCase.interventionTiming.late,
        maxTicks
      ),
    [selectedCase.baselineParams, selectedCase.intervention, selectedCase.interventionTiming.late, maxTicks]
  );

  const scenarioC = useMemo(
    () =>
      showScenarioC
        ? runSimulation(
            selectedCase.baselineParams,
            selectedCase.intervention,
            selectedCase.interventionTiming.early,
            maxTicks
          )
        : null,
    [
      showScenarioC,
      selectedCase.baselineParams,
      selectedCase.intervention,
      selectedCase.interventionTiming.early,
      maxTicks,
    ]
  );

  const resultA = useMemo(() => detectNoReturn(scenarioA), [scenarioA]);
  const resultB = useMemo(() => detectNoReturn(scenarioB), [scenarioB]);
  const resultC = useMemo(
    () => (scenarioC ? detectNoReturn(scenarioC) : null),
    [scenarioC]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.pageBg,
        color: COLORS.pageText,
        padding: 40,
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 32,
            borderBottom: `1px solid ${COLORS.cardBorder}`,
            paddingBottom: 8,
          }}
        >
          {BEVIS_CASES.map((bevisCase) => {
            const caseNames = CASE_NAMES[bevisCase.id];
            return (
              <button
                key={bevisCase.id}
                onClick={() => handleCaseChange(bevisCase.id)}
                style={{
                  padding: "6px 12px",
                  background:
                    selectedCaseId === bevisCase.id
                      ? COLORS.cardBg
                      : "transparent",
                  border:
                    selectedCaseId === bevisCase.id
                      ? `1px solid ${COLORS.cardBorder}`
                      : "1px solid transparent",
                  borderRadius: 4,
                  color:
                    selectedCaseId === bevisCase.id
                      ? COLORS.pageText
                      : "#9ca3af",
                  fontSize: 13,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (selectedCaseId !== bevisCase.id) {
                    e.currentTarget.style.color = COLORS.pageText;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCaseId !== bevisCase.id) {
                    e.currentTarget.style.color = "#9ca3af";
                  }
                }}
              >
                {caseNames?.primary || bevisCase.label}
              </button>
            );
          })}
        </div>

        <h1
          style={{
            fontSize: 32,
            marginBottom: 8,
            color: COLORS.pageText,
          }}
        >
          Bevisläge
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#9ca3af",
            marginBottom: 8,
          }}
        >
          Visar hur timing påverkar utfallet i ett system.
        </p>
        {selectedCase && CASE_NAMES[selectedCase.id] && (
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 40,
              fontStyle: "italic",
            }}
          >
            {CASE_NAMES[selectedCase.id].secondary}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: 24,
            marginBottom: 32,
            flexWrap: "wrap",
          }}
        >
          <ScenarioPanel
            label="Scenario A — Baseline"
            subtitle="Inga åtgärder"
            run={scenarioA}
            result={resultA}
          />
          <ScenarioPanel
            label="Scenario B — Reaktiv åtgärd"
            subtitle="Åtgärd satt in sent i förloppet"
            run={scenarioB}
            result={resultB}
          />
          {showScenarioC && scenarioC && resultC && (
            <ScenarioPanel
              label="Scenario C — Samma åtgärd, tidigare"
              subtitle="Endast tidpunkten skiljer"
              run={scenarioC}
              result={resultC}
            />
          )}
        </div>

        {!showScenarioC && (
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button
              onClick={() => setShowScenarioC(true)}
              style={{
                padding: "12px 24px",
                background: COLORS.cardBg,
                border: `1px solid ${COLORS.cardBorder}`,
                borderRadius: 6,
                color: COLORS.pageText,
                fontSize: 14,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#2f333a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = COLORS.cardBg;
              }}
            >
              Visa om ett annat utfall var möjligt
            </button>
          </div>
        )}

        {showScenarioC && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: COLORS.cardBg,
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: 6,
              textAlign: "center",
              fontSize: 14,
              color: "#9ca3af",
            }}
          >
            Samma åtgärd som i Scenario B. Endast tidpunkten skiljer.
          </div>
        )}
      </div>
    </div>
  );
}
