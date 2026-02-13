"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSystemSnapshot, setSystemSnapshot } from "@/src/systemSnapshot/systemSnapshotStore";
import { getLanguage, setLanguage } from "@/src/language/languageStore";
import { t } from "@/src/language/translations";
import { createSnapshot, downloadSnapshot } from "@/src/exportSnapshot/exportSnapshot";

const STORAGE_KEY = "pulse_snapshot_history";

function loadSnapshotHistory() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveSnapshotHistory(history: any[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export default function BevisV2Page() {
  const snapshot = getSystemSnapshot();
  const [lang, setLangState] = useState<"EN" | "SV">(getLanguage());
  const [history, setHistory] = useState<any[]>([]);
  const [selectedA, setSelectedA] = useState<any | null>(null);
  const [selectedB, setSelectedB] = useState<any | null>(null);
  const translations = t();

  useEffect(() => {
    setHistory(loadSnapshotHistory());
  }, []);

  const handleLanguageToggle = (newLang: "EN" | "SV") => {
    setLanguage(newLang);
    setLangState(newLang);
  };

  const handleExportSnapshot = () => {
    const worldState = getSystemSnapshot();

    if (!worldState) return;

    const snapshotExport = createSnapshot(
      worldState,
      { source: "decision-flow" },
      "decision-flow",
      { outcomeSummary }
    );

    const history = loadSnapshotHistory();
    history.unshift(snapshotExport);
    saveSnapshotHistory(history);
    setHistory(history);

    downloadSnapshot(snapshotExport);
  };

  const handleLoadSnapshot = (item: any) => {
    setSystemSnapshot(item.world_state);
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = history.filter(h => h.snapshot_id !== id);
    saveSnapshotHistory(updated);
    setHistory(updated);
  };

  const getLoadStatus = () => {
    if (!snapshot) return "—";
    const delta = snapshot.compare.load;
    if (delta > 0.5) return translations.bevis.increased;
    if (delta < -0.5) return translations.bevis.decreased;
    return translations.bevis.stable;
  };

  const getCapacityMarginStatus = () => {
    if (!snapshot) return "—";
    const finalLoad = snapshot.final.metrics.load;
    const baselineLoad = snapshot.baseline.metrics.load;
    if (finalLoad > baselineLoad * 1.2) return translations.bevis.reduced;
    if (finalLoad < baselineLoad * 0.8) return translations.bevis.expanded;
    return translations.bevis.maintained;
  };

  const getRecoveryStatus = () => {
    if (!snapshot) return "—";
    const delta = snapshot.compare.cost;
    if (delta > 0.5) return translations.bevis.strained;
    if (delta < -0.5) return translations.bevis.enhanced;
    return translations.bevis.preserved;
  };

  const compare = snapshot?.compare;

  let loadDirection: "increase" | "decrease" | "stable" = "stable";
  let costDirection: "increase" | "decrease" | "stable" = "stable";

  if (compare) {
    if (compare.load > 0.1) loadDirection = "increase";
    else if (compare.load < -0.1) loadDirection = "decrease";

    if (compare.cost > 0.1) costDirection = "increase";
    else if (compare.cost < -0.1) costDirection = "decrease";
  }

  const labels = lang === "SV"
    ? {
        load: "Belastningsförändring",
        cost: "Kostnadsförändring",
        interpretation: "Strukturell tolkning"
      }
    : {
        load: "Load Shift",
        cost: "Cost Shift",
        interpretation: "Structural Interpretation"
      };

  const loadText = (() => {
    if (loadDirection === "increase") {
      return lang === "SV"
        ? "Ökade jämfört med utgångsläget"
        : "Increased relative to baseline";
    }
    if (loadDirection === "decrease") {
      return lang === "SV"
        ? "Minskade jämfört med utgångsläget"
        : "Decreased relative to baseline";
    }
    return lang === "SV"
      ? "Ingen signifikant avvikelse"
      : "No significant deviation";
  })();

  const costText = (() => {
    if (costDirection === "increase") {
      return lang === "SV"
        ? "Ökade över perioden"
        : "Increased over period";
    }
    if (costDirection === "decrease") {
      return lang === "SV"
        ? "Minskade över perioden"
        : "Decreased over period";
    }
    return lang === "SV"
      ? "Ingen signifikant avvikelse"
      : "No significant deviation";
  })();

  const interpretationText = (() => {
    if (loadDirection === "decrease" && costDirection === "increase") {
      return lang === "SV"
        ? "Operativ stabilisering uppnådd genom ökad resursinsats."
        : "Operational stabilization achieved through increased resource allocation.";
    }

    if (loadDirection === "increase" && costDirection === "increase") {
      return lang === "SV"
        ? "Systemet rörde sig mot en mer belastad och kostnadsintensiv struktur."
        : "System moved toward a more load-intensive and cost-intensive structure.";
    }

    if (loadDirection === "increase" && costDirection !== "increase") {
      return lang === "SV"
        ? "Belastningen ökade utan proportionell kostnadsökning."
        : "Load increased without proportional cost escalation.";
    }

    return lang === "SV"
      ? "Strukturen förblev i huvudsak stabil."
      : "Structural dynamics remained broadly stable.";
  })();

  const outcomeSummary = {
    lang,
    thresholds: { compareDelta: 0.1 },
    directions: { load: loadDirection, cost: costDirection },
    text: {
      load: loadText,
      cost: costText,
      interpretation: interpretationText,
    },
    labels,
  };

  let compareDeltaLoad: number | null = null;
  let compareDeltaCost: number | null = null;

  if (selectedA && selectedB) {
    compareDeltaLoad =
      selectedB.world_state.compare.load -
      selectedA.world_state.compare.load;

    compareDeltaCost =
      selectedB.world_state.compare.cost -
      selectedA.world_state.compare.cost;
  }

  let comparisonInterpretation: string | null = null;

  if (compareDeltaLoad !== null && compareDeltaCost !== null) {
    if (compareDeltaLoad < 0 && compareDeltaCost > 0) {
      comparisonInterpretation =
        "Scenario B reduces load but at higher cost compared to Scenario A.";
    } else if (compareDeltaLoad > 0 && compareDeltaCost > 0) {
      comparisonInterpretation =
        "Scenario B increases both load and cost relative to Scenario A.";
    } else if (compareDeltaLoad > 0 && compareDeltaCost <= 0) {
      comparisonInterpretation =
        "Scenario B increases load without proportional cost increase.";
    } else {
      comparisonInterpretation =
        "Structural difference between scenarios is limited.";
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e1117",
      color: "#e6edf3",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Top bar */}
      <div style={{
        width: "100%",
        padding: "20px 32px",
        background: "#1a1a1a",
        borderBottom: "1px solid #2f333a",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h1 style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "#e6edf3",
            margin: "0 0 4px 0"
          }}>
            {translations.bevis.title}
          </h1>
          <p style={{
            fontSize: "12px",
            color: "#9ca3af",
            margin: 0
          }}>
            {translations.bevis.subtitle}
          </p>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "24px"
        }}>
          <div style={{
            display: "flex",
            gap: "8px",
            fontSize: "12px",
            color: "#9ca3af"
          }}>
            <button
              onClick={() => handleLanguageToggle("EN")}
              style={{
                background: "transparent",
                border: "none",
                color: lang === "EN" ? "#e6edf3" : "#6b7280",
                cursor: "pointer",
                fontWeight: lang === "EN" ? 600 : 400,
                padding: "4px 8px"
              }}
            >
              EN
            </button>
            <span style={{ color: "#6b7280" }}>|</span>
            <button
              onClick={() => handleLanguageToggle("SV")}
              style={{
                background: "transparent",
                border: "none",
                color: lang === "SV" ? "#e6edf3" : "#6b7280",
                cursor: "pointer",
                fontWeight: lang === "SV" ? 600 : 400,
                padding: "4px 8px"
              }}
            >
              SV
            </button>
          </div>
          <div style={{
            display: "flex",
            gap: "16px",
            fontSize: "12px"
          }}>
            <Link href="/decision-flow-v2" style={{ color: "#9ca3af", textDecoration: "none" }}>
              {translations.bevis.backToDecisionFlow}
            </Link>
            <Link href="/expert" style={{ color: "#9ca3af", textDecoration: "none" }}>
              {translations.bevis.expertAnalysis}
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "32px"
      }}>
        {snapshot ? (
          <>
            {/* Section 1 — System Journey */}
            <div style={{
              marginBottom: "48px",
              padding: "24px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "8px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px"
              }}>
                <div style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  padding: "6px 12px",
                  background: "#0e1117",
                  borderRadius: "4px"
                }}>
                  {translations.bevis.systemJourney.baseline}
                </div>
                <div style={{ width: "40px", height: "2px", background: "#2f333a" }}></div>
                <div style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  padding: "6px 12px",
                  background: "#0e1117",
                  borderRadius: "4px"
                }}>
                  {translations.bevis.systemJourney.pressure}
                </div>
                <div style={{ width: "40px", height: "2px", background: "#2f333a" }}></div>
                <div style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  padding: "6px 12px",
                  background: "#0e1117",
                  borderRadius: "4px"
                }}>
                  {translations.bevis.systemJourney.response}
                </div>
                <div style={{ width: "40px", height: "2px", background: "#2f333a" }}></div>
                <div style={{
                  fontSize: "12px",
                  color: "#2563eb",
                  padding: "6px 12px",
                  background: "#0e1117",
                  borderRadius: "4px",
                  border: "1px solid #2563eb"
                }}>
                  {translations.bevis.systemJourney.outcome}
                </div>
              </div>
              <p style={{
                fontSize: "12px",
                color: "#9ca3af",
                margin: 0
              }}>
                {translations.bevis.systemJourney.description}
              </p>
            </div>

            {/* Section 2 — Observed Outcome (Outcome Summary) */}
            <div style={{
              marginBottom: "48px",
              padding: "32px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "8px"
            }}>
              <h2 style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#e6edf3",
                margin: "0 0 16px 0"
              }}>
                {translations.bevis.observedOutcome}
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "24px",
                fontSize: "13px"
              }}>
                <div>
                  <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "4px" }}>
                    {labels.load}
                  </div>
                  <div style={{ color: "#e6edf3" }}>
                    {loadText}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "4px" }}>
                    {labels.cost}
                  </div>
                  <div style={{ color: "#e6edf3" }}>
                    {costText}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "4px" }}>
                    {labels.interpretation}
                  </div>
                  <div style={{ color: "#e6edf3" }}>
                    {interpretationText}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3 — System Status */}
            <div style={{
              marginBottom: "32px",
              padding: "24px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "8px"
            }}>
              <h2 style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#e6edf3",
                margin: "0 0 16px 0"
              }}>
                {translations.bevis.systemStatus}
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px"
              }}>
                <div>
                  <div style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    {translations.bevis.load}
                  </div>
                  <div style={{
                    fontSize: "13px",
                    color: "#e6edf3"
                  }}>
                    {getLoadStatus()}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    {translations.bevis.capacityMargin}
                  </div>
                  <div style={{
                    fontSize: "13px",
                    color: "#e6edf3"
                  }}>
                    {getCapacityMarginStatus()}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    marginBottom: "4px"
                  }}>
                    {translations.bevis.recovery}
                  </div>
                  <div style={{
                    fontSize: "13px",
                    color: "#e6edf3"
                  }}>
                    {getRecoveryStatus()}
                  </div>
                </div>
              </div>
              <p style={{
                fontSize: "13px",
                color: "#9ca3af",
                lineHeight: "1.6",
                margin: "16px 0 0 0",
                whiteSpace: "pre-line"
              }}>
                {translations.bevis.systemStatusDescription}
              </p>
            </div>

            {/* Section 4 — Initial System State */}
            <div style={{
              marginBottom: "32px",
              padding: "24px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "8px"
            }}>
              <div style={{
                fontSize: "11px",
                color: "#6b7280",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {translations.bevis.stateAtDecision}
              </div>
              <h2 style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#e6edf3",
                margin: "0 0 12px 0"
              }}>
                {translations.bevis.initialSystemState}
              </h2>
              <p style={{
                fontSize: "13px",
                color: "#9ca3af",
                lineHeight: "1.6",
                margin: 0
              }}>
                {translations.bevis.initialSystemStateText}
              </p>
            </div>

            {/* Section 5 — Applied Pressure Over Time */}
            <div style={{
              marginBottom: "32px",
              padding: "24px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "8px"
            }}>
              <div style={{
                fontSize: "11px",
                color: "#6b7280",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {translations.bevis.externalFactor}
              </div>
              <h2 style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#e6edf3",
                margin: "0 0 12px 0"
              }}>
                {translations.bevis.appliedPressureOverTime}
              </h2>
              <p style={{
                fontSize: "13px",
                color: "#9ca3af",
                lineHeight: "1.6",
                margin: 0
              }}>
                {translations.bevis.appliedPressureText}
              </p>
            </div>

            {/* Section 6 — Selected Response */}
            <div style={{
              marginBottom: "32px",
              padding: "24px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "8px"
            }}>
              <div style={{
                fontSize: "11px",
                color: "#6b7280",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {translations.bevis.decisionApplied}
              </div>
              <h2 style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#e6edf3",
                margin: "0 0 12px 0"
              }}>
                {translations.bevis.selectedResponse}
              </h2>
              <p style={{
                fontSize: "13px",
                color: "#9ca3af",
                lineHeight: "1.6",
                margin: 0
              }}>
                {translations.bevis.selectedResponseText}
              </p>
            </div>

            {/* Section 7 — System Response */}
            <div style={{
              marginBottom: "32px",
              padding: "24px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "8px"
            }}>
              <div style={{
                fontSize: "11px",
                color: "#6b7280",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {translations.bevis.systemDynamics}
              </div>
              <h2 style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#e6edf3",
                margin: "0 0 12px 0"
              }}>
                {translations.bevis.systemResponse}
              </h2>
              <p style={{
                fontSize: "13px",
                color: "#9ca3af",
                lineHeight: "1.6",
                margin: 0
              }}>
                {translations.bevis.systemResponseText}
              </p>
            </div>

            <div style={{
              marginBottom: "32px",
              padding: "24px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "8px"
            }}>
              <h2 style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#e6edf3",
                margin: "0 0 16px 0"
              }}>
                Decision History
              </h2>

              {history.length === 0 && (
                <p style={{ color: "#6b7280", fontSize: "13px" }}>
                  No saved snapshots.
                </p>
              )}

              {history.map(item => (
                <div
                  key={item.snapshot_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #2f333a"
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                    {new Date(item.snapshot_id).toLocaleString()}
                  </div>

                  <div style={{ fontSize: "12px", color: "#e6edf3" }}>
                    Load: {item.metadata?.outcomeSummary?.directions?.load}
                    {" | "}
                    Cost: {item.metadata?.outcomeSummary?.directions?.cost}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleLoadSnapshot(item)}>
                      View
                    </button>
                    <button onClick={() => handleDeleteSnapshot(item.snapshot_id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginBottom: "32px",
              padding: "24px",
              background: "#1a1a1a",
              border: "1px solid #2f333a",
              borderRadius: "8px"
            }}>
              <h2 style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#e6edf3",
                margin: "0 0 16px 0"
              }}>
                Compare Snapshots
              </h2>

              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <select
                  value={selectedA?.snapshot_id ?? ""}
                  onChange={(e) =>
                    setSelectedA(history.find(h => h.snapshot_id === e.target.value) || null)
                  }
                  style={{ flex: 1 }}
                >
                  <option value="">Select Snapshot A</option>
                  {history.map(item => (
                    <option key={item.snapshot_id} value={item.snapshot_id}>
                      {new Date(item.snapshot_id).toLocaleString()}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedB?.snapshot_id ?? ""}
                  onChange={(e) =>
                    setSelectedB(history.find(h => h.snapshot_id === e.target.value) || null)
                  }
                  style={{ flex: 1 }}
                >
                  <option value="">Select Snapshot B</option>
                  {history.map(item => (
                    <option key={item.snapshot_id} value={item.snapshot_id}>
                      {new Date(item.snapshot_id).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {compareDeltaLoad !== null && compareDeltaCost !== null && (
                <div style={{ fontSize: "13px", color: "#9ca3af", lineHeight: "1.6" }}>
                  <p>Load Δ: {compareDeltaLoad.toFixed(3)}</p>
                  <p>Cost Δ: {compareDeltaCost.toFixed(3)}</p>
                  <p style={{ marginTop: "12px", color: "#e6edf3" }}>
                    {comparisonInterpretation}
                  </p>
                </div>
              )}
            </div>

          </>
        ) : (
          <div style={{
            padding: "48px 24px",
            textAlign: "center"
          }}>
            <p style={{
              fontSize: "13px",
              color: "#6b7280",
              margin: 0
            }}>
              {translations.bevis.noSimulation}
            </p>
          </div>
        )}

        {/* Section 9 — Disclaimer */}
        {snapshot && (
          <div style={{
            marginTop: "48px",
            padding: "24px",
            background: "#1a1a1a",
            border: "1px solid #2f333a",
            borderRadius: "8px"
          }}>
            <p style={{
              fontSize: "12px",
              color: "#6b7280",
              lineHeight: "1.6",
              margin: 0,
              fontStyle: "italic"
            }}>
              {translations.bevis.disclaimer}
            </p>
          </div>
        )}

        {/* Bottom navigation */}
        <div style={{
          marginTop: "48px",
          paddingTop: "32px",
          borderTop: "1px solid #2f333a",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px"
        }}>
          <Link href="/decision-flow-v2" style={{ color: "#9ca3af", textDecoration: "none" }}>
            {translations.bevis.backToDecisionFlow}
          </Link>
          <Link href="/expert" style={{ color: "#9ca3af", textDecoration: "none" }}>
            {translations.bevis.viewExpertAnalysis}
          </Link>
        </div>

        {snapshot && (
          <button
            type="button"
            onClick={handleExportSnapshot}
            style={{
              marginTop: "24px",
              padding: "8px 16px",
              fontSize: "13px",
              color: "#9ca3af",
              background: "transparent",
              border: "1px solid #2f333a",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Export Snapshot
          </button>
        )}
      </div>
    </div>
  );
}
