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

    const snapshotExport = (worldState as any).snapshotExport ?? worldState;

    const itemToSave = {
      snapshot_id: snapshotExport.meta?.snapshot_id ?? new Date().toISOString(),
      scenario: "decision-flow",
      inputs: snapshotExport.input ?? {},
      world_state: snapshotExport,
      metadata: { outcomeSummary }
    };

    const history = loadSnapshotHistory();
    history.unshift(itemToSave);
    saveSnapshotHistory(history);
    setHistory(history);

    downloadSnapshot(itemToSave);
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

  const structuralStatus =
    (snapshot as any)?.goalStatus ??
    (snapshot as any)?.snapshotExport?.output?.decisionSummary?.systemState?.goalStatus;

  const trendDirection =
    (snapshot as any)?.decisionSummary?.interpretation?.trend ??
    (snapshot as any)?.snapshotExport?.output?.decisionSummary?.interpretation?.trend;

  const goalWorst =
    (snapshot as any)?.goalWorst ??
    (snapshot as any)?.output?.decisionSummary?.systemState?.goalWorst;

  const comparison =
    (snapshot as any)?.decisionSummary?.comparison ??
    (snapshot as any)?.output?.decisionSummary?.comparison ??
    (snapshot as any)?.compare;

  function mapStructuralStatus(status?: string) {
    switch (status) {
      case "STABIL":
        return "Inom definierade mål";
      case "ANSTRÄNGD":
        return "Marginell överskridelse";
      case "INSTABIL":
        return "Signifikant avvikelse";
      case "OHÅLLBAR":
        return "Saknar återhämtningsutrymme";
      default:
        return "Okänd";
    }
  }

  function mapTrendDirection(trend?: string) {
    switch (trend) {
      case "IMPROVING":
        return "Rör sig mot måluppfyllelse.";
      case "STABLE":
        return "Ingen signifikant förändring över tid.";
      case "DECLINING":
        return "Rör sig bort från måluppfyllelse.";
      default:
        return "Okänd trend";
    }
  }

  function getCombinationMessage(status?: string, trend?: string) {
    if (status === "OHÅLLBAR") return "Nuvarande konfiguration saknar långsiktig hållbarhet.";
    if (status === "STABIL" && trend === "DECLINING") return "Systemet är inom mål men rör sig mot gränsvärdet.";
    if (status === "ANSTRÄNGD" && trend === "IMPROVING") return "Avvikelsen minskar över tid.";
    if (status === "INSTABIL" && trend === "IMPROVING") return "Åtgärd ger effekt men måluppfyllelse är ännu inte återställd.";
    if (status === "INSTABIL" && trend === "DECLINING") return "Avvikelsen ökar och kräver prioriterad åtgärd.";
    if (status === "STABIL") return "Samtliga mål uppfylls. Operativ marginal finns.";
    if (status === "ANSTRÄNGD") return "Ett eller flera mål överskrids inom toleransband.";
    if (status === "INSTABIL") return "Avvikelsen kräver åtgärd för att återställa måluppfyllelse.";
    return "Okänd";
  }

  function mapGoalStatus(status?: string) {
    switch (status) {
      case "STABIL":
        return "STABIL";
      case "ANSTRÄNGD":
        return "ANSTRÄNGD";
      case "INSTABIL":
        return "INSTABIL";
      case "OHÅLLBAR":
        return "OHÅLLBAR";
      default:
        return "OKÄND";
    }
  }

  function formatDelta(d: number | undefined): string {
    if (d == null) return "—";
    return d >= 0 ? `+${d.toFixed(2)}` : d.toFixed(2);
  }

  function getSummaryWithDriver(): string {
    const statusLabel = mapStructuralStatus(structuralStatus);
    const loadD = comparison?.loadChange ?? (comparison as Record<string, number>)?.load;
    const costD = comparison?.costChange ?? (comparison as Record<string, number>)?.cost;
    const marginD = comparison?.marginChange ?? (comparison as Record<string, number>)?.margin;
    const loadStr = formatDelta(typeof loadD === "number" ? loadD : undefined);
    const costStr = formatDelta(typeof costD === "number" ? costD : undefined);
    const marginStr = formatDelta(typeof marginD === "number" ? marginD : undefined);

    if (structuralStatus === "STABIL") {
      return `Scenariot är inom definierade mål. Belastning: ${loadStr}, Kostnad: ${costStr}.`;
    }
    if (goalWorst?.metric === "cost") {
      return `Scenariot innebär ökad kostnad (${costStr}) som driver status till '${statusLabel}'. Belastning: ${loadStr}, Avstånd till målvärde: ${marginStr}.`;
    }
    if (goalWorst?.metric === "load") {
      return `Scenariot innebär ökad belastning (${loadStr}) som driver status till '${statusLabel}'. Kostnad: ${costStr}, Avstånd till målvärde: ${marginStr}.`;
    }
    return `Scenariot driver status till '${statusLabel}'. Belastning: ${loadStr}, Kostnad: ${costStr}, Avstånd till målvärde: ${marginStr}.`;
  }

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

  const summaryA =
    selectedA?.world_state?.output?.decisionSummary;

  const summaryB =
    selectedB?.world_state?.output?.decisionSummary;

  const goalStatusA =
    (selectedA?.world_state as any)?.goalStatus ??
    (selectedA?.world_state as any)?.output?.decisionSummary?.systemState?.goalStatus;

  const goalStatusB =
    (selectedB?.world_state as any)?.goalStatus ??
    (selectedB?.world_state as any)?.output?.decisionSummary?.systemState?.goalStatus;

  const marginDiff =
    summaryA != null && summaryB != null
      ? summaryB.comparison.marginChange - summaryA.comparison.marginChange
      : null;

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

            {/* Section 2 — Observed Outcome (decisionSummary, conclusion) */}
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

              {/* Section 1: Scenarioförändring */}
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", color: "#9ca3af", margin: "0 0 12px 0" }}>Scenarioförändring</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", fontSize: "13px" }}>
                  <div title="Procentuell differens mellan aktuell nivå och definierat mål.">
                    <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "4px" }}>Avstånd till målvärde</div>
                    <div style={{ color: "#e6edf3" }}>
                      {(snapshot as any)?.decisionSummary?.comparison?.marginChange != null
                        ? Number((snapshot as any).decisionSummary.comparison.marginChange).toFixed(2)
                        : "—"}
                    </div>
                  </div>
                  <div title="Stabil drift förutsätter operativ marginal. 100% kapacitetsutnyttjande saknar återhämtningsutrymme.">
                    <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "4px" }}>Belastning</div>
                    <div style={{ color: "#e6edf3" }}>
                      {(snapshot as any)?.decisionSummary?.comparison?.loadChange != null
                        ? Number((snapshot as any).decisionSummary.comparison.loadChange).toFixed(2)
                        : "—"}
                    </div>
                  </div>
                  <div title="Toleransbanden representerar kontrollerbar respektive strukturell budgetavvikelse.">
                    <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "4px" }}>Kostnad</div>
                    <div style={{ color: "#e6edf3" }}>
                      {(snapshot as any)?.decisionSummary?.comparison?.costChange != null
                        ? Number((snapshot as any).decisionSummary.comparison.costChange).toFixed(2)
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Strukturell bedömning — structural status + trend direction */}
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", color: "#9ca3af", margin: "0 0 12px 0" }}>Strukturell bedömning</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", fontSize: "13px" }}>
                  <div title="Procentuell differens mellan aktuell nivå och definierat mål.">
                    <div style={{ color: "#6b7280", fontSize: "11px", marginBottom: "4px" }}>Avstånd till målvärde</div>
                    <div style={{ color: "#e6edf3" }}>
                      {(snapshot as any)?.final?.metrics?.margin != null
                        ? Number((snapshot as any).final.metrics.margin).toFixed(2)
                        : (snapshot as any)?.output?.final?.metrics?.margin != null
                        ? Number((snapshot as any).output.final.metrics.margin).toFixed(2)
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px 0" }}>Strukturell status</p>
                    <p style={{ fontSize: "18px", fontWeight: 600, color: "#e6edf3", margin: 0 }}>
                      {mapStructuralStatus(structuralStatus)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", color: "#9ca3af", margin: "0 0 4px 0" }}>Tidsmässig utveckling</p>
                    <p style={{ fontSize: "18px", fontWeight: 600, color: "#e6edf3", margin: 0 }}>
                      {mapTrendDirection(trendDirection)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3: Sammanfattning — driver-aware summary when available */}
              <div>
                <h3 style={{ fontSize: "14px", color: "#9ca3af", margin: "0 0 12px 0" }}>Sammanfattning</h3>
                <div style={{ fontSize: "13px", color: "#e6edf3", lineHeight: 1.6 }}>
                  <p style={{ margin: 0 }}>
                    {structuralStatus != null || comparison != null
                      ? getSummaryWithDriver()
                      : (snapshot as any)?.conclusion ?? (snapshot as any)?.output?.conclusion ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Systembedömning — combination message from structural status + trend */}
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
                margin: "0 0 12px 0"
              }}>
                Strukturell bedömning
              </h2>
              <p style={{
                fontSize: "13px",
                color: "#e6edf3",
                lineHeight: "1.6",
                margin: 0
              }}>
                {getCombinationMessage(structuralStatus, trendDirection)}
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

              {summaryA != null && summaryB != null && marginDiff != null && (
                <div style={{ marginTop: "16px" }}>
                  <h3 style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#e6edf3",
                    margin: "0 0 12px 0"
                  }}>
                    Strategisk jämförelse (B − A)
                  </h3>
                  <div style={{ fontSize: "13px", color: "#e6edf3", lineHeight: "1.8" }}>
                    <p style={{ margin: "0 0 4px 0" }} title="Procentuell differens mellan aktuell nivå och definierat mål.">
                      Avstånd till målvärde Δ: {marginDiff.toFixed(2)}
                    </p>
                    <p style={{ margin: "0 0 4px 0" }}>
                      Strukturell status: {mapStructuralStatus(goalStatusA)} → {mapStructuralStatus(goalStatusB)}
                    </p>
                    <p style={{ margin: 0 }}>
                      Tidsmässig utveckling: {mapTrendDirection(summaryA.interpretation?.trend)} → {mapTrendDirection(summaryB.interpretation?.trend)}
                    </p>
                  </div>
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
