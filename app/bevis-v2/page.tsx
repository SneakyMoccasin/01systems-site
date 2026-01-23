"use client";

import { useState } from "react";
import Link from "next/link";
import { getSystemSnapshot } from "@/src/systemSnapshot/systemSnapshotStore";
import { getLanguage, setLanguage } from "@/src/language/languageStore";
import { t } from "@/src/language/translations";

export default function BevisV2Page() {
  const snapshot = getSystemSnapshot();
  const [lang, setLangState] = useState<"EN" | "SV">(getLanguage());
  const translations = t();

  const handleLanguageToggle = (newLang: "EN" | "SV") => {
    setLanguage(newLang);
    setLangState(newLang);
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

  const getObservedChanges = () => {
    if (!snapshot) return [];
    const changes = [];
    if (Math.abs(snapshot.compare.load) > 0.1) {
      changes.push(translations.bevis.loadDiffers);
    }
    if (Math.abs(snapshot.compare.cost) > 0.1) {
      changes.push(translations.bevis.recoveryDiffers);
    }
    if (snapshot.consequences.length > 0) {
      changes.push(translations.bevis.stateChanged);
    }
    return changes;
  };

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
              {(() => {
                const fullText = translations.bevis.observedOutcomeText;
                const lines = fullText.split('\n');
                const firstSentence = lines[0];
                const remainingText = lines.slice(1).join('\n');
                return (
                  <>
                    <p style={{
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#e6edf3",
                      lineHeight: "1.6",
                      margin: "0 0 16px 0"
                    }}>
                      {firstSentence}
                    </p>
                    {remainingText && (
                      <p style={{
                        fontSize: "13px",
                        color: "#9ca3af",
                        lineHeight: "1.6",
                        margin: 0,
                        whiteSpace: "pre-line"
                      }}>
                        {remainingText}
                      </p>
                    )}
                  </>
                );
              })()}
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

            {/* Section 8 — Observed Change */}
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
                {translations.bevis.observedChange}
              </h2>
              <ul style={{
                fontSize: "13px",
                color: "#9ca3af",
                lineHeight: "1.8",
                margin: 0,
                paddingLeft: "20px"
              }}>
                {getObservedChanges().map((change, idx) => (
                  <li key={idx}>{change}</li>
                ))}
              </ul>
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
      </div>
    </div>
  );
}
