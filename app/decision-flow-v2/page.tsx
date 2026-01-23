"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setSystemSnapshot } from "@/src/systemSnapshot/systemSnapshotStore";
import { getLanguage, setLanguage } from "@/src/language/languageStore";
import { t } from "@/src/language/translations";

export default function DecisionFlowV2Page() {
  const router = useRouter();
  const [lang, setLangState] = useState<"EN" | "SV">(getLanguage());
  const [systemLoadState, setSystemLoadState] = useState<string>("");
  const [externalPressureTrend, setExternalPressureTrend] = useState<string>("");
  const [primaryResponseStrategy, setPrimaryResponseStrategy] = useState<string>("");

  const translations = t();

  const handleLanguageToggle = (newLang: "EN" | "SV") => {
    setLanguage(newLang);
    setLangState(newLang);
  };

  const handleRunSimulation = async () => {
    const policyMap: Record<string, "balanced" | "aggressive" | "conservative"> = {
      "protect": "conservative",
      "balance": "balanced",
      "push": "aggressive"
    };

    const policy = policyMap[primaryResponseStrategy] || "balanced";

    const res = await fetch("/api/decision-flow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy,
        steps: 3
      })
    });

    const result = await res.json();
    setSystemSnapshot(result);
    router.push("/bevis-v2");
  };

  const allInputsSelected = systemLoadState && externalPressureTrend && primaryResponseStrategy;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e1117",
      color: "#e6edf3",
      padding: "32px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Top bar with language toggle */}
      <div style={{
        marginBottom: "32px",
        paddingBottom: "16px",
        borderBottom: "1px solid #2f333a",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center"
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
      </div>

      {/* Header */}
      <div style={{
        marginBottom: "48px"
      }}>
        <h1 style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "#e6edf3",
          margin: "0 0 8px 0"
        }}>
          {translations.decisionFlow.title}
        </h1>
        <p style={{
          fontSize: "14px",
          color: "#9ca3af",
          margin: 0
        }}>
          {translations.decisionFlow.subtitle}
        </p>
      </div>

      {/* Section 1 — Current System State */}
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
          {translations.decisionFlow.currentSystemState}
        </h2>
        <p style={{
          fontSize: "13px",
          color: "#9ca3af",
          lineHeight: "1.6",
          margin: "0 0 16px 0",
          whiteSpace: "pre-line"
        }}>
          {translations.decisionFlow.currentSystemStateDescription}
        </p>
        <label style={{
          display: "block",
          fontSize: "13px",
          color: "#9ca3af",
          marginBottom: "8px"
        }}>
          {translations.decisionFlow.systemLoadState}
        </label>
        <select
          value={systemLoadState}
          onChange={(e) => setSystemLoadState(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#0e1117",
            border: "1px solid #2f333a",
            borderRadius: "6px",
            color: "#e6edf3",
            fontSize: "14px",
            cursor: "pointer"
          }}
        >
          <option value="">{translations.decisionFlow.selectPlaceholder}</option>
          <option value="stable">{translations.decisionFlow.loadStateStable}</option>
          <option value="managing">{translations.decisionFlow.loadStateManaging}</option>
          <option value="pressure">{translations.decisionFlow.loadStatePressure}</option>
          <option value="nearCapacity">{translations.decisionFlow.loadStateNearCapacity}</option>
        </select>
      </div>

      {/* Section 2 — External Pressure */}
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
          {translations.decisionFlow.externalPressure}
        </h2>
        <p style={{
          fontSize: "13px",
          color: "#9ca3af",
          lineHeight: "1.6",
          margin: "0 0 16px 0",
          whiteSpace: "pre-line"
        }}>
          {translations.decisionFlow.externalPressureDescription}
        </p>
        <label style={{
          display: "block",
          fontSize: "13px",
          color: "#9ca3af",
          marginBottom: "8px"
        }}>
          {translations.decisionFlow.externalPressureTrend}
        </label>
        <select
          value={externalPressureTrend}
          onChange={(e) => setExternalPressureTrend(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#0e1117",
            border: "1px solid #2f333a",
            borderRadius: "6px",
            color: "#e6edf3",
            fontSize: "14px",
            cursor: "pointer"
          }}
        >
          <option value="">{translations.decisionFlow.selectPlaceholder}</option>
          <option value="increasing">{translations.decisionFlow.pressureIncreasing}</option>
          <option value="fluctuating">{translations.decisionFlow.pressureFluctuating}</option>
          <option value="stable">{translations.decisionFlow.pressureStable}</option>
          <option value="decreasing">{translations.decisionFlow.pressureDecreasing}</option>
        </select>
      </div>

      {/* Section 3 — Selected Response */}
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
          {translations.decisionFlow.responseStrategy}
        </h2>
        <p style={{
          fontSize: "13px",
          color: "#9ca3af",
          lineHeight: "1.6",
          margin: "0 0 16px 0",
          whiteSpace: "pre-line"
        }}>
          {translations.decisionFlow.responseStrategyDescription}
        </p>
        <label style={{
          display: "block",
          fontSize: "13px",
          color: "#9ca3af",
          marginBottom: "8px"
        }}>
          {translations.decisionFlow.primaryResponseStrategy}
        </label>
        <select
          value={primaryResponseStrategy}
          onChange={(e) => setPrimaryResponseStrategy(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#0e1117",
            border: "1px solid #2f333a",
            borderRadius: "6px",
            color: "#e6edf3",
            fontSize: "14px",
            cursor: "pointer"
          }}
        >
          <option value="">{translations.decisionFlow.selectPlaceholder}</option>
          <option value="protect">{translations.decisionFlow.responseProtect}</option>
          <option value="balance">{translations.decisionFlow.responseBalance}</option>
          <option value="push">{translations.decisionFlow.responsePush}</option>
        </select>
      </div>

      {/* Section 4 — Commit */}
      <div style={{
        padding: "24px",
        background: "#1a1a1a",
        border: "1px solid #2f333a",
        borderRadius: "8px"
      }}>
        <button
          onClick={handleRunSimulation}
          disabled={!allInputsSelected}
          style={{
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: 500,
            color: allInputsSelected ? "#e6edf3" : "#6b7280",
            background: allInputsSelected ? "#2563eb" : "#2f333a",
            border: allInputsSelected ? "1px solid #2563eb" : "1px solid #2f333a",
            borderRadius: "6px",
            cursor: allInputsSelected ? "pointer" : "not-allowed",
            opacity: allInputsSelected ? 1 : 0.5
          }}
        >
          {translations.decisionFlow.runSimulation}
        </button>
        <p style={{
          fontSize: "12px",
          color: "#6b7280",
          margin: "8px 0 0 0"
        }}>
          {translations.decisionFlow.helperText}
        </p>
      </div>
    </div>
  );
}
