"use client";

import { useState } from "react";
import Link from "next/link";
import { getSystemSnapshot } from "@/src/systemSnapshot/systemSnapshotStore";
import { getLanguage, setLanguage } from "@/src/language/languageStore";
import { t } from "@/src/language/translations";

export default function ExpertPage() {
  const snapshot = getSystemSnapshot();
  const [lang, setLangState] = useState<"EN" | "SV">(getLanguage());
  const translations = t();

  const handleLanguageToggle = (newLang: "EN" | "SV") => {
    setLanguage(newLang);
    setLangState(newLang);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#e6edf3",
      display: "flex",
      flexDirection: "column",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Navigation */}
      <div style={{
        width: "100%",
        padding: "16px 32px",
        background: "#0a0a0a",
        borderBottom: "1px solid #1f1f1f",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "12px"
      }}>
        <div style={{
          display: "flex",
          gap: "24px"
        }}>
          <Link href="/bevis-v2" style={{ color: "#9ca3af", textDecoration: "none" }}>
            {translations.expert.backToBevis}
          </Link>
          <Link href="/decision-flow-v2" style={{ color: "#9ca3af", textDecoration: "none" }}>
            {translations.expert.backToDecisionFlow}
          </Link>
        </div>
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
      </div>

      {/* Full-width top panel: System Overview */}
      <div style={{
        width: "100%",
        padding: "24px 32px",
        background: "#111111",
        borderBottom: "1px solid #1f1f1f"
      }}>
        <h1 style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#9ca3af",
          margin: "0 0 8px 0",
          letterSpacing: "0.5px"
        }}>
          {translations.expert.systemOverview}
        </h1>
        <p style={{
          fontSize: "12px",
          color: "#6b7280",
          margin: "0 0 20px 0"
        }}>
          {translations.expert.systemOverviewDescription}
        </p>
        <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#9ca3af", marginBottom: "12px" }}>
          Snapshot: {snapshot ? translations.expert.snapshotAvailable : translations.expert.snapshotNotAvailable}
        </div>
        <div style={{ fontSize: "11px", color: "#6b7280" }}>
          baseline · final · compare · consequences
        </div>
      </div>

      {/* Middle section: two columns */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "1px",
        background: "#1f1f1f",
        padding: "1px"
      }}>
        {/* Left column: Core Dynamics */}
        <div style={{
          background: "#111111",
          padding: "24px 32px"
        }}>
          <h2 style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "#6b7280",
            margin: "0 0 8px 0",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            {translations.expert.coreDynamics}
          </h2>
          <p style={{
            fontSize: "11px",
            color: "#6b7280",
            margin: "0 0 20px 0"
          }}>
            {translations.expert.coreDynamicsDescription}
          </p>
          {snapshot ? (
            <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#9ca3af", lineHeight: "1.6" }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ color: "#6b7280", marginBottom: "4px", fontSize: "11px" }}>baseline</div>
                <div style={{ 
                  color: "#e6edf3", 
                  whiteSpace: "pre-wrap",
                  maxHeight: "200px",
                  overflowY: "auto",
                  padding: "8px",
                  background: "#0a0a0a",
                  borderRadius: "4px"
                }}>
                  {snapshot.baseline ? JSON.stringify(snapshot.baseline, null, 2) : translations.expert.noDataAvailable}
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ color: "#6b7280", marginBottom: "4px", fontSize: "11px" }}>final</div>
                <div style={{ 
                  color: "#e6edf3", 
                  whiteSpace: "pre-wrap",
                  maxHeight: "200px",
                  overflowY: "auto",
                  padding: "8px",
                  background: "#0a0a0a",
                  borderRadius: "4px"
                }}>
                  {snapshot.final ? JSON.stringify(snapshot.final, null, 2) : translations.expert.noDataAvailable}
                </div>
              </div>
              <div>
                <div style={{ color: "#6b7280", marginBottom: "4px", fontSize: "11px" }}>compare</div>
                <div style={{ 
                  color: "#e6edf3", 
                  whiteSpace: "pre-wrap",
                  maxHeight: "200px",
                  overflowY: "auto",
                  padding: "8px",
                  background: "#0a0a0a",
                  borderRadius: "4px"
                }}>
                  {snapshot.compare ? JSON.stringify(snapshot.compare, null, 2) : translations.expert.noDataAvailable}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              {translations.expert.noDataAvailable}
            </div>
          )}
        </div>

        {/* Right column: Assumptions & Constraints */}
        <div style={{
          background: "#111111",
          padding: "24px 32px"
        }}>
          <h2 style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "#6b7280",
            margin: "0 0 8px 0",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            {translations.expert.assumptionsConstraints}
          </h2>
          <p style={{
            fontSize: "11px",
            color: "#6b7280",
            margin: "0 0 20px 0"
          }}>
            {translations.expert.assumptionsConstraintsDescription}
          </p>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "12px" }}>
            {translations.expert.assumptionsText}
          </div>
          <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: "1.6" }}>
            <div style={{ marginBottom: "8px" }}>• Metrics: load, cost</div>
            <div style={{ marginBottom: "8px" }}>• Time steps: discrete</div>
            <div style={{ marginBottom: "8px" }}>• Baseline preserved for comparison</div>
            <div style={{ marginBottom: "8px" }}>• Consequences logged per tick</div>
          </div>
        </div>
      </div>

      {/* Full-width panel: Event & Phase Log */}
      <div style={{
        width: "100%",
        padding: "24px 32px",
        background: "#111111",
        borderTop: "1px solid #1f1f1f"
      }}>
        <h2 style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "#6b7280",
          margin: "0 0 8px 0",
          textTransform: "uppercase",
          letterSpacing: "1px"
        }}>
          {translations.expert.eventPhaseLog}
        </h2>
        <p style={{
          fontSize: "11px",
          color: "#6b7280",
          margin: "0 0 20px 0"
        }}>
          {translations.expert.eventPhaseLogDescription}
        </p>
        {snapshot ? (
          <div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>
              {translations.expert.rawEventLog}
            </div>
            <div style={{ 
              fontSize: "11px", 
              fontFamily: "monospace", 
              color: "#9ca3af", 
              whiteSpace: "pre-wrap",
              maxHeight: "300px",
              overflowY: "auto",
              padding: "8px",
              background: "#0a0a0a",
              borderRadius: "4px"
            }}>
              {snapshot.consequences ? JSON.stringify(snapshot.consequences, null, 2) : translations.expert.noDataAvailable}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            {translations.expert.noDataAvailable}
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div style={{
        width: "100%",
        padding: "16px 32px",
        background: "#0a0a0a",
        borderTop: "1px solid #1f1f1f",
        display: "flex",
        gap: "24px",
        fontSize: "12px"
      }}>
        <Link href="/bevis-v2" style={{ color: "#9ca3af", textDecoration: "none" }}>
          {translations.expert.backToBevis}
        </Link>
        <Link href="/decision-flow-v2" style={{ color: "#9ca3af", textDecoration: "none" }}>
          {translations.expert.backToDecisionFlow}
        </Link>
      </div>

      {/* Bottom footer */}
      <div style={{
        width: "100%",
        padding: "16px 32px",
        background: "#0a0a0a",
        borderTop: "1px solid #1f1f1f",
        fontSize: "10px",
        color: "#4b5563",
        opacity: 0.7,
        textAlign: "center"
      }}>
        {translations.expert.footer}
      </div>
    </div>
  );
}
