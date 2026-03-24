import { NextResponse } from "next/server";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import { EVENT_TRANSLATIONS } from "@/src/pilotFastighet/uiText";

type InterpretationLanguage = "sv" | "en";

type InterpretationPromptInput = {
  language: InterpretationLanguage;
  eventsText: string;
  cascadeText: string;
  primaryDriverText: string;
  systemPressureText: string;
  breachText: string;
  marginTrendText: string;
  cascadeDelaySteps: number;
  decisionFlowText: string;
  tippingQuarter: number | null;
  currentMargin: number;
  alternativeMargin: number;
  marginImpact: number;
};

function buildInterpretationPrompt(input: InterpretationPromptInput): string {
  const templates =
    input.language === "sv"
      ? {
          intro: "Du analyserar en deterministisk systemsimulering.",
          data: "Data:",
          events: "Händelser",
          cascade: "Kaskad",
          primaryDriver: "Primär drivare",
          systemPressure: "Systemtryck",
          breach: "Uppskattad tid till strukturellt brott",
          marginTrend: "Margintrend",
          cascadeDelay: "Kaskadfördröjning",
          decisionFlow: "Beslutsflöde",
          tipping: "Tippingpunkt",
          currentMargin: "Nuvarande marginal",
          alternativeMargin: "Alternativ marginal",
          difference: "Skillnad",
          noData: "Inga",
          noFlow: "—",
          noTipping: "Ingen",
          structureHeader:
            "Strukturera svaret i fyra delar (behåll rubrikerna):",
          summaryHeader: "Sammanfattning:",
          summaryBody: "Beskriv kort vad som händer i systemet.",
          structuralHeader: "Strukturell analys:",
          structuralBody: "Identifiera primär drivare och marginaltrend.",
          cascadeHeader: "Kaskaddynamik:",
          cascadeBody:
            "Förklara hur risk sprids i systemet. Om ingen kaskad finns, säg det tydligt.",
          outlookHeader: "Framåtblick:",
          outlookBody:
            "Beskriv om systemet närmar sig ett strukturellt brott och vad det innebär.",
          footer:
            "Använd tydligt språk anpassat för svenska beslutsfattare.",
        }
      : {
          intro:
            "You are an analyst explaining simulation results to executives. Use clear, non-technical language.",
          data: "Data:",
          events: "Events",
          cascade: "System cascade",
          primaryDriver: "Primary driver",
          systemPressure: "System pressure",
          breach: "Estimated time to structural breach",
          marginTrend: "Margin trend (alternative strategy)",
          cascadeDelay: "Cascade delay",
          decisionFlow: "Decision flow",
          tipping: "Tipping point",
          currentMargin: "Current margin",
          alternativeMargin: "Alternative margin",
          difference: "Difference",
          noData: "None",
          noFlow: "—",
          noTipping: "None",
          structureHeader:
            "Write your analysis in exactly this structure (keep the headings):",
          summaryHeader: "Executive Summary:",
          summaryBody:
            "[2–3 sentences: what is happening in the system, suitable for executives.]",
          structuralHeader: "Structural Analysis:",
          structuralBody:
            "[Explain the primary driver and margin trend in plain language.]",
          cascadeHeader: "Cascade Dynamics:",
          cascadeBody:
            '[If cascade events exist: explain how risks propagated. If none: write "No cascade identified."]',
          outlookHeader: "Forward Outlook:",
          outlookBody:
            "[Is the system approaching structural breach? What does the estimated time imply for decisions?]",
          footer: "Be concise and avoid technical jargon.",
        };

  return `${templates.intro}

IMPORTANT LANGUAGE RULE:

When language === "sv":

- Always write all driver names in Swedish
- Never output internal parameter names like:
  maintenanceIntensity
  tenantStability
  interestRateExposure
  refinancingRisk
  leverageLevel
  capitalCommitmentRigidity

Use ONLY these provided labels:

${input.cascadeText}
${input.primaryDriverText}
${input.systemPressureText}
${input.marginTrendText}
${input.eventsText}

Do NOT generate English fallback labels.

When language === "en":

use English labels normally.

${templates.data}
${templates.events}: ${input.eventsText}
${templates.cascade}: ${input.cascadeText || templates.noData}
${templates.primaryDriver}: ${input.primaryDriverText}
${templates.systemPressure}: ${input.systemPressureText}
${templates.breach}: ${input.breachText}
${templates.marginTrend}: ${input.marginTrendText}
${templates.cascadeDelay}: ${input.cascadeDelaySteps} timestep(s) after decision
${templates.decisionFlow}: ${input.decisionFlowText || templates.noFlow}
${templates.tipping}: ${input.tippingQuarter ?? templates.noTipping}
${templates.currentMargin}: ${input.currentMargin} | ${templates.alternativeMargin}: ${input.alternativeMargin} | ${templates.difference}: ${input.marginImpact}

${templates.structureHeader}

${templates.summaryHeader}
${templates.summaryBody}

${templates.structuralHeader}
${templates.structuralBody}

${templates.cascadeHeader}
${templates.cascadeBody}

${templates.outlookHeader}
${templates.outlookBody}

${templates.footer}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      language,
      tippingQuarter,
      events,
      currentMargin,
      alternativeMargin,
      marginImpact,
      cascadeEvents,
      primaryDriver,
      systemPressure,
      estimatedTimeToBreach,
      decisionFlowEvents,
      marginTrend,
      cascadeDelay,
      question: executiveQuestion,
    } = body;
    const uiLanguage: InterpretationLanguage = language === "sv" ? "sv" : "en";
    const t = pulseLanguage[uiLanguage] as any;
    const driverLabels = t.driverLabels ?? {};
    const riskLabels = t.riskLabels ?? {};
    const unknownText = uiLanguage === "sv" ? "okänd" : "Unknown";
    const notEstimatedText = uiLanguage === "sv" ? "Ej uppskattad" : "Not estimated";
    const noCascadeText = uiLanguage === "sv" ? "Inga" : "None";
    const noDecisionFlowText = uiLanguage === "sv" ? "Inget" : "None";
    const translateRisk = (key: string) =>
      driverLabels[key] ??
      riskLabels[key] ??
      EVENT_TRANSLATIONS[key as keyof typeof EVENT_TRANSLATIONS]?.[uiLanguage] ??
      key;
    const translateSystemPressure = (value: string) => {
      if (uiLanguage !== "sv") return value;
      switch (value) {
        case "LOW":
          return "låg";
        case "MODERATE":
          return "medel";
        case "HIGH":
          return "hög";
        case "SYSTEMIC":
          return "systemisk";
        default:
          return value;
      }
    };
    const translateMarginTrend = (value: string) => {
      switch (value) {
        case "declining":
          return t.marginTrendDeclining ?? (uiLanguage === "sv" ? "nedåtgående" : "declining");
        case "stable":
          return t.marginTrendStable ?? (uiLanguage === "sv" ? "stabil" : "stable");
        case "improving":
          return t.marginTrendImproving ?? (uiLanguage === "sv" ? "uppåtgående" : "improving");
        default:
          return value;
      }
    };
    const translateLevel = (level: string) => {
      if (uiLanguage !== "sv") return level;
      switch (level) {
        case "LOW":
          return "LÅG";
        case "MODERATE":
          return "MEDEL";
        case "HIGH":
          return "HÖG";
        case "SEVERE":
          return "SVÅR";
        case "SYSTEMIC":
          return "SYSTEMISK";
        default:
          return level;
      }
    };
    const translatedEventsText = (events ?? [])
      .map((e: any) => {
        const translatedType =
          EVENT_TRANSLATIONS[e.type as keyof typeof EVENT_TRANSLATIONS]?.[uiLanguage] ?? e.type;
        return `Q${e.quarter}: ${translatedType}`;
      })
      .join("\n");
    const translatedCascadeText = (cascadeEvents ?? [])
      .map(
        (e: any) =>
          `${translateRisk(e.sourceRisk)} -> ${translateRisk(e.targetRisk)} (${translateLevel(e.level)})`
      )
      .join("\n");
    const translatedPrimaryDriverText = primaryDriver
      ? translateRisk(primaryDriver)
      : unknownText;
    const translatedSystemPressureText = systemPressure
      ? translateSystemPressure(systemPressure)
      : unknownText;
    const translatedMarginTrendText = marginTrend
      ? translateMarginTrend(marginTrend)
      : unknownText;

    if (executiveQuestion && typeof executiveQuestion === "string") {
      const breachText =
        typeof estimatedTimeToBreach === "number"
          ? `~${estimatedTimeToBreach} steps`
          : notEstimatedText;
      const cascadeDelaySteps = cascadeDelay ?? 1;
      const decisionFlowText = (decisionFlowEvents ?? [])
        .map((e: any) => `${e.time}: ${e.text}`)
        .join("\n");

      const qaLangInstruction =
        language === "sv" ? "Svara på svenska." : "Answer in English.";

      const qaPrompt =
        language === "sv"
          ? `Du analyserar en deterministisk systemsimulering.

Systemkontext:
- Kaskadhändelser: ${translatedCascadeText || noCascadeText}
- Primär drivare: ${translatedPrimaryDriverText}
- Systemtryck: ${translatedSystemPressureText}
- Uppskattad tid till strukturellt brott: ${breachText}
- Marginaltrend: ${translatedMarginTrendText}
- Kaskadfördröjning: ${cascadeDelaySteps} steg efter beslut
- Beslutsflöde: ${decisionFlowText || noDecisionFlowText}

Beslutsfattarens fråga: ${executiveQuestion.trim()}

Svara på frågan utifrån endast den angivna systemkontexten. Var koncis och använd tydligt språk för svenska beslutsfattare.
${qaLangInstruction}`
          : `You are analyzing a deterministic system simulation.

System context:
- Cascade events: ${translatedCascadeText || noCascadeText}
- Primary driver: ${translatedPrimaryDriverText}
- System pressure: ${translatedSystemPressureText}
- Estimated time to structural breach: ${breachText}
- Margin trend: ${translatedMarginTrendText}
- Cascade delay: ${cascadeDelaySteps} timestep(s) after decision
- Decision flow: ${decisionFlowText || noDecisionFlowText}

Executive question: ${executiveQuestion.trim()}

Answer the executive's question using only the provided system context. Be concise and explain in plain language suitable for executives.
${qaLangInstruction}`;

      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3:latest",
          prompt: qaPrompt,
          stream: false,
          options: {
            num_predict: 200,
            temperature: 0.2,
          },
        }),
      });

      const data = await response.json();
      return NextResponse.json({
        text: data.response ?? "No response.",
      });
    }

    const breachText =
      typeof estimatedTimeToBreach === "number"
        ? `~${estimatedTimeToBreach} steps`
        : notEstimatedText;
    const cascadeDelaySteps = cascadeDelay ?? 1;

    const decisionFlowText = (decisionFlowEvents ?? [])
      .map((e: any) => `${e.time}: ${e.text}`)
      .join("\n");

    const langInstruction =
      language === "sv" ? "Svara på svenska." : "Answer in English.";

    const prompt =
      buildInterpretationPrompt({
        language: language === "sv" ? "sv" : "en",
        eventsText: translatedEventsText,
        cascadeText: translatedCascadeText,
        primaryDriverText: translatedPrimaryDriverText,
        systemPressureText: translatedSystemPressureText,
        breachText,
        marginTrendText: translatedMarginTrendText,
        cascadeDelaySteps,
        decisionFlowText,
        tippingQuarter,
        currentMargin,
        alternativeMargin,
        marginImpact,
      }) +
      "\n\n" +
      langInstruction;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt,
        stream: false,
        options: {
          num_predict: 400,
          temperature: 0.2,
        },
      }),
    });

    const data = await response.json();

    let text = (data.response ?? "").trim();

    if (!text || text.length < 10) {
      text =
        language === "sv"
          ? "Systemet visar ökande systemtryck. Den primära drivaren påverkar marginalen negativt och kan leda till strukturell instabilitet om utvecklingen fortsätter."
          : "The system shows increasing pressure. The primary driver is weakening the margin and may lead to structural instability if the trend continues.";
    }

    console.log("AI interpretation length:", text.length);

    return NextResponse.json({
      text,
    });
  } catch (error) {
    return NextResponse.json({
      text: "AI interpretation unavailable.",
    });
  }
}


