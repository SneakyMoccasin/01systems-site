import React, { useEffect, useState } from "react";
import { EVENT_TRANSLATIONS } from "@/src/pilotFastighet/uiText";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";

type Language = "sv" | "en";

type Event = {
  quarter: number;
  type: string;
};

type Props = {
  language: Language;
  tippingQuarter: number | null;
  events: Event[];
  simulationCompleted: boolean;
  currentMargin: number;
  alternativeMargin: number;
  marginImpact: number;
  caseName: string;
  cascadeEventsA?: CascadeEvent[];
  cascadeEventsB?: CascadeEvent[];
  primaryDriver?: string | null;
  systemPressure?: string | null;
  estimatedTimeToBreach?: number | null;
  decisionFlowEvents?: { time: string; text: string }[];
  marginTrend?: "declining" | "stable" | "improving";
  cascadeDelay?: number;
  caseType?: "transport" | "real-estate" | null;
  selectedActions?: string[];
};

const AIInterpretationPanel: React.FC<Props> = ({
  language,
  tippingQuarter,
  events,
  simulationCompleted,
  currentMargin,
  alternativeMargin,
  marginImpact,
  caseName,
  cascadeEventsA,
  cascadeEventsB,
  primaryDriver,
  systemPressure,
  estimatedTimeToBreach,
  decisionFlowEvents,
  marginTrend,
  cascadeDelay,
  caseType = null,
  selectedActions = [],
}) => {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];

  useEffect(() => {
    if (!simulationCompleted) return;

    setLoading(true);

    const translatedEvents = events.map((e) => ({
      quarter: e.quarter,
      type: EVENT_TRANSLATIONS[e.type as keyof typeof EVENT_TRANSLATIONS]?.[uiLanguage] ?? e.type,
    }));

    fetch("/api/ai-interpretation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: uiLanguage,
        caseName,
        tippingQuarter,
        events: translatedEvents,
        currentMargin,
        alternativeMargin,
        marginImpact,
        cascadeEvents: [...(cascadeEventsA ?? []), ...(cascadeEventsB ?? [])],
        primaryDriver,
        systemPressure,
        estimatedTimeToBreach,
        decisionFlowEvents,
        interpretationMode: "detailed",
        marginTrend,
        cascadeDelay,
        caseType,
        selectedActions,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAiText(data.text);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [simulationCompleted, uiLanguage ?? "en"]);

  useEffect(() => {
    if (!simulationCompleted) {
      setAiText(null);
    }
  }, [simulationCompleted]);

  const helperText = t.systemInterpretationHelper;
  const sectionTitleMap: Record<string, string> = {
    sammanfattning: t.aiSummary,
    summary: t.aiSummary,
    "strukturell analys": t.aiStructuralAnalysis,
    "structural analysis": t.aiStructuralAnalysis,
    kaskaddynamik: t.aiCascadeDynamics,
    "cascade dynamics": t.aiCascadeDynamics,
    framtidsblick: t.aiOutlook,
    outlook: t.aiOutlook,
  };

  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1f2937",
        borderRadius: "6px",
        padding: "12px",
        marginTop: "16px",
      }}
    >
      <div style={{ marginBottom: "8px" }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#e5e7eb",
          }}
        >
          {t.aiInterpretation}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#9CA3AF",
            marginTop: "4px",
          }}
        >
          {helperText}
        </div>
      </div>

      {loading && (
        <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
          {t.aiAnalysing}
        </div>
      )}

      {!loading && aiText && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            rowGap: "6px",
            columnGap: "10px",
            fontSize: "13px",
            lineHeight: "1.4",
          }}
        >
          {(() => {
            const lines = aiText.split("\n").map((s) => s.trim()).filter(Boolean);
            const sections: { title: string; content: string }[] = [];
            const sectionHeader = /^([A-Za-z\s]+):\s*$/;
            for (let i = 0; i < lines.length; i++) {
              const m = lines[i].match(sectionHeader);
              if (m) {
                const title = m[1].trim();
                const contentLines: string[] = [];
                let j = i + 1;
                while (j < lines.length && !lines[j].match(sectionHeader)) {
                  contentLines.push(lines[j]);
                  j++;
                }
                sections.push({ title, content: contentLines.join(" ").trim() });
              }
            }
            if (sections.length === 0) {
              return aiText.split("\n").map((line, index) => (
                <div key={index} style={{ color: "#E5E7EB", gridColumn: "1 / -1" }}>
                  {line}
                </div>
              ));
            }
            return sections.map((sec, index) => (
              <React.Fragment key={index}>
                <div
                  style={{
                    fontWeight: 600,
                    color: "#9CA3AF",
                    marginTop: index > 0 ? "10px" : 0,
                  }}
                >
                  {sectionTitleMap[sec.title.toLowerCase()] ?? sec.title}
                </div>
                <div style={{ color: "#E5E7EB" }}>{sec.content}</div>
              </React.Fragment>
            ));
          })()}
        </div>
      )}
    </div>
  );
};

export default AIInterpretationPanel;

