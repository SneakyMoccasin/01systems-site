import React, { useState } from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";
import { logPulseCaughtRejection } from "@/src/pilotFastighet/pulseTraceUnhandledRejection";

type Language = "sv" | "en";

type Props = {
  language: Language;
  cascadeEventsA?: CascadeEvent[];
  cascadeEventsB?: CascadeEvent[];
  primaryDriver?: string | null;
  systemPressure?: string | null;
  estimatedTimeToBreach?: number | null;
  marginTrend?: "declining" | "stable" | "improving";
  decisionFlowEvents?: { time: string; text: string }[];
  cascadeDelay?: number;
};

const PromptDock: React.FC<Props> = ({
  language,
  cascadeEventsA,
  cascadeEventsB,
  primaryDriver,
  systemPressure,
  estimatedTimeToBreach,
  marginTrend,
  decisionFlowEvents,
  cascadeDelay,
}) => {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = () => {
    const q = question.trim();
    if (!q) return;

    setLoading(true);
    setAnswer(null);

    fetch("/api/ai-interpretation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: q,
        language,
        cascadeEvents: [...(cascadeEventsA ?? []), ...(cascadeEventsB ?? [])],
        primaryDriver: primaryDriver ?? null,
        systemPressure: systemPressure ?? null,
        estimatedTimeToBreach: estimatedTimeToBreach ?? null,
        marginTrend: marginTrend ?? null,
        decisionFlowEvents: decisionFlowEvents ?? [],
        cascadeDelay: cascadeDelay ?? 1,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAnswer(data.text ?? t.noResponse);
        setLoading(false);
      })
      .catch((err) => {
        logPulseCaughtRejection("PromptDock.fetch", err);
        setAnswer(t.unableToAnswer);
        setLoading(false);
      });
  };

  return (
    <div
      style={{
        marginTop: "16px",
        background: "#0f172a",
        border: "1px solid #1f2937",
        borderRadius: "6px",
        padding: "12px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "#e5e7eb",
          marginBottom: "8px",
        }}
      >
        {t.executiveQuestion}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder={t.askPlaceholder}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: "6px",
            color: "#e5e7eb",
            fontSize: "13px",
          }}
        />
        <button
          type="button"
          onClick={handleAsk}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#374151",
            border: "1px solid #4b5563",
            borderRadius: "6px",
            color: "#e5e7eb",
            fontSize: "13px",
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {t.ask}
        </button>
      </div>

      {loading && (
        <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "8px" }}>
          {t.answering}
        </div>
      )}

      {!loading && answer && (
        <div
          style={{
            background: "#111827",
            color: "#e5e7eb",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          {answer}
        </div>
      )}
    </div>
  );
};

export default PromptDock;
