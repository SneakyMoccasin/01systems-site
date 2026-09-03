import React, { useEffect, useMemo, useRef, useState } from "react";
import { EVENT_TRANSLATIONS } from "@/src/pilotFastighet/uiText";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import type { CascadeEvent } from "@/src/pilotFastighet/riskPropagation";
import { surfaceOrgDemoText, tightenExecOutlookStripBodyForDisplay } from "@/src/pilotFastighet/executiveDemoTransformation";
import {
  profileCount,
  profileMeasure,
  profileValue,
} from "@/src/lib/runtimeProfile";
import { logPulseCaughtRejection } from "@/src/pilotFastighet/pulseTraceUnhandledRejection";
import type {
  ScenarioExecutionProvenance,
  ScenarioSchedules,
} from "@/src/pilotFastighet/analysis/reactScheduledAnalysisBoundary";
import type { ScheduledFairComparisonFacts } from "@/src/pilotFastighet/analysis/manualScheduledExecution";

type Language = "sv" | "en";

/** Timeline row for interpretation payload (not a DOM Event — avoids shadowing global Event). */
type QuarterEvent = {
  quarter: number;
  type: string;
};

function parseInterpretationSections(aiText: string): { title: string; content: string }[] {
  const lines = aiText.split("\n").map((s) => s.trim()).filter(Boolean);
  const sections: { title: string; content: string }[] = [];
  const sectionHeader = /^([A-Za-zÅÄÖåäö0-9][A-Za-zÅÄÖåäö0-9\s\-/]+):\s*$/;
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
  return sections;
}

/** Robust split for Swedish/English exec real-estate strip headings returned by `/api/ai-interpretation`. */
function parseExecRealEstateStripSections(
  aiText: string,
  lang: Language
): { title: string; content: string }[] {
  const text = aiText.replace(/\*\*/g, "").replace(/\r\n/g, "\n");
  const markers =
    lang === "sv"
      ? ([
          { title: "Sammanfattning", rx: /\bSammanfattning\s*:/gi },
          { title: "Strukturella drivkrafter", rx: /\bStrukturella\s+drivkrafter\s*:/gi },
          { title: "Hur beroenden sprider sig", rx: /\bHur\s+beroenden\s+sprider\s+sig\s*:/gi },
          { title: "Tryckets utveckling", rx: /\bTryckets\s+utveckling\s*:/gi },
        ] as const)
      : ([
          { title: "Overview", rx: /\bOverview\s*:/gi },
          { title: "Structural drivers", rx: /\bStructural\s+drivers\s*:/gi },
          {
            title: "Dependency propagation",
            rx: /\bDependency\s+propagation\s*:/gi,
          },
          {
            title: "How pressure evolves",
            rx: /\bHow\s+pressure\s+evolves\s*:/gi,
          },
        ] as const);

  const hits: { idx: number; end: number; title: string }[] = [];

  for (const { title, rx } of markers) {
    rx.lastIndex = 0;
    const match = rx.exec(text);
    if (match?.index !== undefined) {
      hits.push({ idx: match.index, end: match.index + match[0].length, title });
    }
  }

  hits.sort((a, b) => a.idx - b.idx);

  const out: { title: string; content: string }[] = [];
  for (let i = 0; i < hits.length; i++) {
    const startBody = hits[i].end;
    const endSlice = i + 1 < hits.length ? hits[i + 1].idx : text.length;
    const raw = text.slice(startBody, endSlice).trim();
    if (!raw && i > 0) continue;
    out.push({ title: hits[i].title, content: raw });
  }

  return out;
}

/** Preferred on-screen ordering for exec strip regardless of LLM emission order */
function reorderExecStripSections(
  sections: { title: string; content: string }[],
  lang: Language
): { title: string; content: string }[] {
  const orderSv = [
    "sammanfattning",
    "strukturella drivkrafter",
    "hur beroenden sprider sig",
    "tryckets utveckling",
  ];
  const orderEn = ["overview", "structural drivers", "dependency propagation", "how pressure evolves"];
  const order = lang === "sv" ? orderSv : orderEn;
  const norm = (s: string) => s.trim().toLowerCase();

  return [...sections].sort((a, b) => {
    const ia = order.indexOf(norm(a.title));
    const ib = order.indexOf(norm(b.title));
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

type Props = {
  language: Language;
  executiveDemoMode?: boolean;
  tippingQuarter: number | null;
  events: QuarterEvent[];
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
  primaryDriverChanged?: boolean;
  constraintActivationChanged?: boolean;
  propagationRootChanged?: boolean;
  dominantScenarioDifferenceChannel?: string | null;
  /** Below-graph horizontal synthesis layout (executive demo real-estate only). */
  executiveInterpretationStrip?: boolean;
  executionContext?:
    | { mode: "configured-start" }
    | {
        mode: "actions-over-time";
        plannedSchedules: ScenarioSchedules;
        executedProvenance: ScenarioExecutionProvenance;
        horizon: number;
        naturalCompletion: boolean;
        fairComparisonFacts: ScheduledFairComparisonFacts;
      };
};

const AIInterpretationPanel: React.FC<Props> = ({
  language,
  executiveDemoMode = false,
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
  primaryDriverChanged,
  constraintActivationChanged,
  propagationRootChanged,
  dominantScenarioDifferenceChannel = null,
  executiveInterpretationStrip = false,
  executionContext = { mode: "configured-start" },
}) => {
  profileCount("AIInterpretationPanel.render");

  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchGenerationRef = useRef(0);
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];

  useEffect(() => {
    if (!simulationCompleted) return;

    const ac = new AbortController();
    const generation = ++fetchGenerationRef.current;
    setLoading(true);

    const translatedEvents = events.map((e) => ({
      quarter: e.quarter,
      type: EVENT_TRANSLATIONS[e.type as keyof typeof EVENT_TRANSLATIONS]?.[uiLanguage] ?? e.type,
    }));

    const requestBody = {
      language: uiLanguage,
      interpretationMode:
        caseType === "transport"
          ? "transport"
          : caseType === "real-estate"
            ? "real-estate"
            : "generic",
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
      marginTrend,
      cascadeDelay,
      caseType,
      selectedActions,
      primaryDriverChanged,
      constraintActivationChanged,
      propagationRootChanged,
      dominantScenarioDifferenceChannel,
      executiveDemoMode,
      ...(executionContext.mode === "actions-over-time" ? { executionContext } : {}),
    };
    profileCount("AIInterpretationPanel.fetch.calls");

    let serializedBody: string;
    try {
      serializedBody = profileMeasure(
        "AIInterpretationPanel.fetch.serialize.ms",
        () => JSON.stringify(requestBody)
      );
    } catch {
      if (fetchGenerationRef.current === generation) {
        setLoading(false);
      }
      return () => ac.abort();
    }
    profileValue(
      "AIInterpretationPanel.fetch.payload.bytes",
      serializedBody.length,
      "bytes"
    );

    void (async () => {
      try {
        const res = await fetch("/api/ai-interpretation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: serializedBody,
          signal: ac.signal,
        });
        let data: { text?: unknown } = {};
        try {
          data = (await res.json()) as { text?: unknown };
        } catch (parseErr) {
          logPulseCaughtRejection("AIInterpretationPanel.res.json", parseErr);
          data = {};
        }
        if (fetchGenerationRef.current !== generation) return;
        const text = data?.text;
        setAiText(typeof text === "string" ? text : null);
      } catch (err: unknown) {
        logPulseCaughtRejection("AIInterpretationPanel.fetch", err);
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (fetchGenerationRef.current !== generation) return;
        setAiText(null);
      } finally {
        if (fetchGenerationRef.current === generation) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [
    simulationCompleted,
    uiLanguage ?? "en",
    caseType,
    caseName,
    tippingQuarter,
    currentMargin,
    alternativeMargin,
    marginImpact,
    systemPressure,
    estimatedTimeToBreach,
    marginTrend,
    cascadeDelay,
    events.map((e) => `${e.quarter}:${e.type}`).join("|"),
    primaryDriverChanged ?? false,
    constraintActivationChanged ?? false,
    propagationRootChanged ?? false,
    dominantScenarioDifferenceChannel ?? null,
    selectedActions?.join(",") ?? "",
    cascadeEventsA?.length ?? 0,
    cascadeEventsB?.length ?? 0,
    executiveDemoMode,
    primaryDriver ?? null,
    JSON.stringify(executionContext),
  ]);

  useEffect(() => {
    if (!simulationCompleted) {
      setAiText(null);
    }
  }, [simulationCompleted]);

  const helperText =
    executiveDemoMode
      ? uiLanguage === "sv"
        ? "Kort tolkning av hur flexibiliteten utvecklas"
        : "A plain-language read of how flexibility evolves"
      : caseType === "real-estate" && uiLanguage === "sv"
      ? "Vad detta betyder för portföljen"
      : t.systemInterpretationHelper;
  const sectionTitleMap: Record<string, string> = {
    sammanfattning:
      executiveInterpretationStrip
        ? uiLanguage === "sv"
          ? "Sammanfattning"
          : "Overview"
        : t.aiSummary,
    summary: t.aiSummary,
    overview:
      executiveDemoMode && caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Överblick"
          : "Overview"
        : t.aiSummary,
    "strukturell analys":
      executiveDemoMode && caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Strukturell tolkning"
          : "Structural read"
        : caseType === "real-estate"
          ? uiLanguage === "sv"
            ? "Affärsanalys"
            : "Business analysis"
          : t.aiStructuralAnalysis,
    "structural analysis":
      executiveDemoMode && caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Strukturell tolkning"
          : "Structural read"
        : caseType === "real-estate"
          ? uiLanguage === "sv"
            ? "Affärsanalys"
            : "Business analysis"
          : t.aiStructuralAnalysis,
    "structural drivers":
      executiveInterpretationStrip
        ? uiLanguage === "sv"
          ? "Strukturella drivkrafter"
          : "Structural drivers"
        : executiveDemoMode && caseType === "real-estate"
          ? uiLanguage === "sv"
            ? "Strukturella drivkrafter"
            : "Structural drivers"
          : caseType === "real-estate"
            ? uiLanguage === "sv"
              ? "Affärsanalys"
              : "Business analysis"
            : t.aiStructuralAnalysis,
    "strukturella drivkrafter":
      executiveInterpretationStrip
        ? uiLanguage === "sv"
          ? "Strukturella drivkrafter"
          : "Structural drivers"
        : executiveDemoMode && caseType === "real-estate"
          ? uiLanguage === "sv"
            ? "Strukturella drivkrafter"
            : "Structural drivers"
          : caseType === "real-estate"
            ? uiLanguage === "sv"
              ? "Affärsanalys"
              : "Business analysis"
            : t.aiStructuralAnalysis,
    affärsanalys:
      executiveDemoMode && caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Strukturell tolkning"
          : "Structural read"
        : uiLanguage === "sv"
          ? "Affärsanalys"
          : "Business analysis",
    kaskaddynamik:
      caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Påverkan i portföljen"
          : "Portfolio impact"
        : t.aiCascadeDynamics,
    "cascade dynamics":
      caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Påverkan i portföljen"
          : "Portfolio impact"
        : t.aiCascadeDynamics,
    "dependency propagation":
      executiveDemoMode && caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Hur beroenden sprider sig"
          : "Dependency propagation"
        : caseType === "real-estate"
          ? uiLanguage === "sv"
            ? "Påverkan i portföljen"
            : "Portfolio impact"
          : t.aiCascadeDynamics,
    "how cascade effects spread":
      caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Påverkan i portföljen"
          : "Portfolio impact"
        : t.aiCascadeDynamics,
    "hur beroenden sprider sig":
      executiveDemoMode && caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Hur beroenden sprider sig"
          : "Dependency propagation"
        : caseType === "real-estate"
          ? uiLanguage === "sv"
            ? "Påverkan i portföljen"
            : "Portfolio impact"
          : t.aiCascadeDynamics,
    "hur kaskadeffekter sprider sig":
      caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Påverkan i portföljen"
          : "Portfolio impact"
        : t.aiCascadeDynamics,
    framtidsblick: t.aiOutlook,
    outlook: t.aiOutlook,
    "forward outlook":
      executiveDemoMode && caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Tryckets utveckling"
          : "Pressure evolution"
        : t.aiOutlook,
    "how pressure evolves":
      executiveDemoMode && caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Tryckets utveckling"
          : "Pressure evolution"
        : t.aiOutlook,
    "tryckets utveckling":
      executiveDemoMode && caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Tryckets utveckling"
          : "Pressure evolution"
        : t.aiOutlook,
  };

  const surfaceLine = (s: string) =>
    executiveDemoMode ? surfaceOrgDemoText(s, uiLanguage) : s;

  const parsedSections = useMemo(
    () => (aiText ? parseInterpretationSections(aiText) : []),
    [aiText]
  );

  const execStripParsedSections = useMemo(() => {
    if (!executiveInterpretationStrip || !aiText) return [];
    const byMarkers = parseExecRealEstateStripSections(aiText, uiLanguage);
    const byLines = parsedSections;
    const raw =
      byMarkers.length >= 2 ? byMarkers : byLines.length > 0 ? byLines : byMarkers;
    return reorderExecStripSections(raw, uiLanguage).slice(0, 4);
  }, [
    aiText,
    executiveInterpretationStrip,
    uiLanguage,
    parsedSections,
  ]);

  const stripAccentColors = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24"] as const;

  const stripIdleHint =
    uiLanguage === "sv"
      ? "Kör simulering för att generera syntes."
      : "Run simulation to generate synthesis.";
  const stripEmptyHint =
    uiLanguage === "sv"
      ? "Ingen syntes tillgänglig ännu."
      : "No synthesis available yet.";
  const stripHeadline =
    uiLanguage === "sv" ? "AI-tolkning" : "AI interpretation";
  const stripSub =
    uiLanguage === "sv"
      ? "Exekutiv syntes av strukturläget"
      : "Executive synthesis — structural posture";

  const fallbackOverviewTitle =
    uiLanguage === "sv" ? "Överblick" : "Overview";

  if (executiveInterpretationStrip) {
    const stripCards =
      execStripParsedSections.length > 0
        ? execStripParsedSections
        : aiText?.trim()
          ? [{ title: fallbackOverviewTitle, content: aiText.replace(/\s+/g, " ").trim() }]
          : [];

    return (
      <div
        style={{
          marginTop: "0px",
          padding: "8px 16px 8px 15px",
          borderRadius: "8px",
          background: "var(--ce-surface-primary)",
          border: "1px solid var(--ce-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom:
              loading || stripCards.length > 0 || !simulationCompleted ? "6px" : "0",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--ce-text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {stripHeadline}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--ce-text-secondary)",
                marginTop: "3px",
                fontWeight: 500,
                lineHeight: 1.42,
              }}
            >
              {stripSub}
            </div>
          </div>
        </div>

        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.07fr)",
              gap: "16px",
              minWidth: 0,
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: "88px",
                  borderRadius: "11px",
                  background: "var(--ce-surface-subtle)",
                  border: "1px solid var(--ce-border)",
                  borderLeftWidth: "3px",
                  borderLeftColor: stripAccentColors[i % stripAccentColors.length],
                }}
              />
            ))}
          </div>
        )}

        {!loading && !simulationCompleted && (
          <div style={{ fontSize: "12px", color: "var(--ce-text-secondary)", lineHeight: 1.45 }}>
            {stripIdleHint}
          </div>
        )}

        {!loading && simulationCompleted && !aiText && (
          <div style={{ fontSize: "12px", color: "var(--ce-text-secondary)" }}>{stripEmptyHint}</div>
        )}

        {!loading && aiText && stripCards.length > 0 && (
          <div
            style={{
              width: "100%",
              overflow: "visible",
              paddingBottom: "1px",
              paddingRight: "4px",
              marginRight: "0px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.07fr)",
                gap: "16px",
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
              }}
            >
              {stripCards.map((sec, index) => (
                <div
                  key={`${sec.title}-${index}`}
                  style={{
                    padding:
                      index === 3 ? "11px 17px 11px 14px" : "11px 16px 11px 14px",
                    borderRadius: "8px",
                    background: "var(--ce-surface-subtle)",
                    border: "1px solid var(--ce-border)",
                    borderLeft: `3px solid ${stripAccentColors[index % stripAccentColors.length]}`,
                    minHeight: "90px",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: "9.25px",
                      fontWeight: 700,
                      letterSpacing: "0.095em",
                      textTransform: "uppercase",
                      color: "var(--ce-text-muted)",
                      marginBottom: "7px",
                    }}
                  >
                    {(() => {
                      const label =
                        sectionTitleMap[sec.title.toLowerCase()] ?? sec.title;
                      return surfaceLine(label);
                    })()}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.56,
                      color: "var(--ce-text-primary)",
                      fontWeight: 400,
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                    }}
                  >
                    {(() => {
                      const label =
                        sectionTitleMap[sec.title.toLowerCase()] ?? sec.title;
                      const mapped = surfaceLine(label);
                      const body = surfaceLine(sec.content);
                      return tightenExecOutlookStripBodyForDisplay(
                        body,
                        uiLanguage,
                        mapped
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--ce-surface-subtle, #0F172A)",
        border: "1px solid var(--ce-border, #1F2937)",
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
            color: "var(--ce-text-primary, #e5e7eb)",
          }}
        >
          {t.aiInterpretation}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--ce-text-secondary, #9CA3AF)",
            marginTop: "4px",
          }}
        >
          {helperText}
        </div>
      </div>

      {loading && (
        <div style={{ fontSize: "12px", color: "var(--ce-text-secondary, #9CA3AF)" }}>
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
          {parsedSections.length === 0
            ? aiText.split("\n").map((line, index) => (
                <div key={index} style={{ color: "var(--ce-text-primary, #E5E7EB)", gridColumn: "1 / -1" }}>
                  {surfaceLine(line)}
                </div>
              ))
            : parsedSections.map((sec, index) => (
                <React.Fragment key={`${sec.title}-${index}`}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--ce-text-secondary, #9CA3AF)",
                      marginTop: index > 0 ? "10px" : 0,
                    }}
                  >
                    {surfaceLine(
                      sectionTitleMap[sec.title.toLowerCase()] ?? sec.title
                    )}
                  </div>
                  <div style={{ color: "var(--ce-text-primary, #E5E7EB)" }}>{surfaceLine(sec.content)}</div>
                </React.Fragment>
              ))}
        </div>
      )}
    </div>
  );
};

export default AIInterpretationPanel;
