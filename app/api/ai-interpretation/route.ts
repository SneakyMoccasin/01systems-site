import { NextResponse } from "next/server";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import { EVENT_TRANSLATIONS } from "@/src/pilotFastighet/uiText";
import { getTransportPolicyExplanationLabel } from "@/src/pilotFastighet/transportDomainMapping";
import { resolveTransportInspectorContext } from "@/src/pilotFastighet/transportInspectorAdapter";
import { mapRiskLabelToPolicyLabel } from "@/app/pilot-fastighet/components/inspector-utils/mapRiskLabelToPolicyLabel";
import {
  profileCount,
  profileMeasure,
  profileMeasureAsync,
  profileValue,
} from "@/src/lib/runtimeProfile";

type InterpretationLanguage = "sv" | "en";

type InterpretationPromptInput = {
  language: InterpretationLanguage;
  interpretationMode?: "generic" | "transport" | "real-estate";
  eventsText: string;
  cascadeText: string;
  transportSummaryCascadeText?: string;
  cascadeDriversText?: string;
  primaryDriverText: string;
  systemPressureText: string;
  breachText: string;
  marginTrendText: string;
  structuralDivergenceText: string;
  cascadeDelaySteps: number;
  decisionFlowText: string;
  tippingQuarter: number | null;
  currentMargin: number;
  alternativeMargin: number;
  marginImpact: number;
  goalDirection?: "toward" | "away" | null;
};

function buildInterpretationPrompt(input: InterpretationPromptInput): string {
  const isTransport = input.interpretationMode === "transport";
  const isRealEstate = input.interpretationMode === "real-estate";
  const cascadeSegments = input.cascadeText
    .split("→")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (
    input.language === "sv" &&
    isTransport &&
    cascadeSegments[0] === input.primaryDriverText
  ) {
    cascadeSegments.shift();
  }
  const cascadeChainWithoutRoot = cascadeSegments.join(" → ");
  const transportSummaryCascadeText =
    input.transportSummaryCascadeText ?? cascadeChainWithoutRoot;
  const swedishTransportCascadeBodyText = (() => {
    const primaryDriverText = input.primaryDriverText || "en policydrivare";
    const [firstStep, secondStep, ...remainingSteps] = cascadeSegments;
    const normalizedFirstStep =
      firstStep === "genomförandetakt"
        ? "genomförandetakten"
        : firstStep ?? "systemets genomförande";
    const normalizedSecondStep =
      secondStep === "kapacitetstryck i nätverket"
        ? "kapacitetstryck i nätverket"
        : secondStep;
    const normalizedRemainingSteps = remainingSteps.map((step) =>
      step === "efterfrågetryck i transportsystemet"
        ? "efterfrågeutvecklingen"
        : step
    );

    if (!firstStep) {
      return `Den identifierade spridningskedjan visar hur ${primaryDriverText} omsätts till följdeffekter i transportsystemet.`;
    }

    return `Den identifierade spridningskedjan visar genom att ${primaryDriverText} påverkar ${normalizedFirstStep}${
      normalizedSecondStep
        ? `, vilket skapar ${normalizedSecondStep}`
        : ""
    }${
      normalizedRemainingSteps.length > 0
        ? ` och påverkar ${normalizedRemainingSteps.join(" och ")}`
        : ""
    }.`;
  })();
  const templates =
    input.language === "sv"
      ? {
          intro: "Du analyserar en deterministisk systemsimulering.",
          data: "Data:",
          events: "Händelser",
          cascade: isRealEstate ? "Påverkanskedja" : "Kaskad",
          primaryDriver: isRealEstate ? "Viktigaste affärsfaktor" : "Primär drivare",
          systemPressure: isRealEstate
            ? "Påverkan på kassaflöde och handlingsutrymme"
            : "Systemtryck",
          breach: isRealEstate
            ? "Tid tills handlingsutrymmet pressas tydligt"
            : "Uppskattad tid till strukturellt brott",
          marginTrend: isRealEstate ? "Trend i handlingsutrymme" : "Margintrend",
          structuralDivergence: isRealEstate
            ? "Skillnad mellan strategierna"
            : "Strukturell divergens",
          cascadeDelay: isRealEstate ? "Tid tills påverkan slår igenom" : "Kaskadfördröjning",
          decisionFlow: "Beslutsflöde",
          tipping: isRealEstate ? "Tidpunkt med störst press" : "Tippingpunkt",
          currentMargin: "Nuvarande marginal",
          alternativeMargin: "Alternativ marginal",
          difference: "Skillnad",
          noData: isRealEstate ? "Ingen tydlig kedja" : "Inga",
          noFlow: "—",
          noTipping: "Ingen",
          structureHeader:
            "Strukturera svaret i fyra delar (behåll rubrikerna):",
          summaryHeader: "Sammanfattning:",
          summaryBody:
            isTransport
              ? `Transportnätverket utvecklar ett strukturellt tryck genom ${input.primaryDriverText || "centrala policydrivare"}, vilket påverkar systemets utvecklingsriktning${transportSummaryCascadeText ? ` via följande spridningskedja: ${transportSummaryCascadeText}` : input.structuralDivergenceText ? ` genom ${input.structuralDivergenceText}` : " tidigt i simuleringen"}.`
              : isRealEstate
                ? `Portföljen påverkas främst av ${input.primaryDriverText || "refinansiering, kapitalbindning och beläggning"}, vilket minskar handlingsutrymmet ${input.breachText && input.breachText !== "Ej uppskattad" ? `före ${input.breachText}` : "tidigt i simuleringen"} och signalerar att stabiliserande beslut kan behövas i ett tidigt skede.`
              : `Systemet utvecklar strukturellt tryck genom påverkan från ${input.primaryDriverText || "centrala systemdrivare"}, vilket minskar handlingsutrymmet ${input.breachText && input.breachText !== "Ej uppskattad" ? `före ${input.breachText}` : "tidigt i simuleringen"} och indikerar att stabiliserande beslut kan krävas i ett tidigt skede.`,
          structuralHeader: isRealEstate ? "Affärsanalys:" : "Strukturell analys:",
          structuralBody:
            isTransport
              ? `Den observerade utvecklingen drivs av ${input.primaryDriverText || "transportpolitiska drivkrafter"} och visar hur policyval omformas till strukturella följdeffekter i systemet. ${input.structuralDivergenceText}`
              : isRealEstate
                ? `Utvecklingen formas av samspelet mellan refinansiering, kapitalbindning, likviditet, beläggning och underhållsstrategi. ${input.structuralDivergenceText}`
              : "Den observerade marginaltrenden visar att flera strukturella drivkrafter samverkar och gradvis minskar systemets flexibilitet, vilket innebär att stabilisering sannolikt kräver koordinerade åtgärder snarare än en enskild insats.",
          cascadeHeader: isRealEstate ? "Påverkan i portföljen:" : "Kaskaddynamik:",
          cascadeBody:
            isTransport
              ? swedishTransportCascadeBodyText
              : isRealEstate
                ? `Påverkanskedjan visar hur ${input.primaryDriverText || "det tydligaste affärstrycket"} får följdeffekter via ${input.cascadeDriversText || "kapitalstruktur, kassaflöde, beläggning och underhållsstrategi"}, vilket successivt begränsar portföljens handlingsutrymme.`
                : `Den identifierade kaskadsekvensen visar hur förändringar i ${input.primaryDriverText || "systemets centrala drivare"} sprids vidare genom ${input.cascadeDriversText || "flera strukturella drivkrafter"} och skapar ett tidigt tipping-läge, vilket innebär att sena åtgärder får begränsad effekt jämfört med tidiga insatser.`,
          outlookHeader: "Framåtblick:",
          outlookBody:
            `${isTransport
              ? "Transportsystemets fortsatta utveckling bör bedömas utifrån vilken policykedja som nu dominerar och hur detta påverkar genomförbarhet och kapacitetsflexibilitet."
              : isRealEstate
                ? "Portföljens fortsatta utveckling bör bedömas utifrån hur refinansieringsförmåga, kassaflöde, beläggning och kapitalbindning påverkar handlingsutrymmet de kommande stegen."
              : `Den fortsatta marginalutvecklingen indikerar att systemet närmar sig ett möjligt strukturellt brottstillstånd ${input.breachText && input.breachText !== "Ej uppskattad" ? `kring ${input.breachText}` : "senare i simuleringen"}, vilket innebär att utvecklingen bör följas och stabiliserande beslut övervägas i tid.`}${input.goalDirection === "toward"
  ? " Utvecklingen rör systemet i riktning mot målstrategin, vilket stärker förutsättningarna för strukturell stabilisering."
  : input.goalDirection === "away"
  ? " Utvecklingen rör systemet bort från målstrategin, vilket innebär att ytterligare stabiliserande beslut kan krävas tidigt i förloppet."
  : ""}`,
          footer:
            "Använd tydligt språk anpassat för svenska beslutsfattare.",
        }
      : {
          intro:
            "You are an analyst explaining simulation results to executives. Use clear, non-technical language.",
          data: "Data:",
          events: "Events",
          cascade: isRealEstate ? "Impact chain" : "System cascade",
          primaryDriver: isRealEstate ? "Main business factor" : "Primary driver",
          systemPressure: isRealEstate ? "Cash-flow and flexibility impact" : "System pressure",
          breach: isRealEstate
            ? "Estimated time until flexibility narrows materially"
            : "Estimated time to structural breach",
          marginTrend: isRealEstate ? "Flexibility trend" : "Margin trend (alternative strategy)",
          structuralDivergence: isRealEstate ? "Difference between strategies" : "Structural divergence",
          cascadeDelay: isRealEstate ? "Time before the impact spreads" : "Cascade delay",
          decisionFlow: "Decision flow",
          tipping: isRealEstate ? "Peak pressure point" : "Tipping point",
          currentMargin: "Current margin",
          alternativeMargin: "Alternative margin",
          difference: "Difference",
          noData: isRealEstate ? "No clear chain" : "None",
          noFlow: "—",
          noTipping: "None",
          structureHeader:
            "Write your analysis in exactly this structure (keep the headings):",
          summaryHeader: "Executive Summary:",
          summaryBody:
            isTransport
              ? `The transport system shows structural pressure through ${input.primaryDriverText || "policy-driven system change"}, with divergence emerging through ${input.structuralDivergenceText || "a distinct propagation pathway"}.`
              : isRealEstate
                ? `The portfolio is primarily pressured by ${input.primaryDriverText || "refinancing, capital lock-in, occupancy, and cash flow"}, which reduces decision flexibility early in the horizon.`
              : "The system shows increasing structural pressure following early driver interaction and constraint activation. The structural margin declines early in the trajectory, indicating reduced flexibility if no corrective action is taken.",
          structuralHeader: isRealEstate ? "Business Analysis:" : "Structural Analysis:",
          structuralBody:
            isTransport
              ? `The observed system behaviour is driven by ${input.primaryDriverText || "transport policy levers"} and translated through ${input.cascadeText || "a policy propagation chain"}.`
              : isRealEstate
                ? "The observed development reflects interaction between refinancing conditions, leverage, liquidity, occupancy, and maintenance choices rather than one isolated issue."
              : "No single dominant driver is identified. The declining margin trend reflects interaction between several structural drivers rather than one isolated factor.",
          cascadeHeader: isRealEstate ? "Portfolio Impact:" : "Cascade Dynamics:",
          cascadeBody:
            isTransport
              ? `The propagation chain shows how ${input.primaryDriverText || "the selected policy lever"} affects subsequent transport-system conditions. ${input.structuralDivergenceText}`
              : isRealEstate
                ? `The impact chain shows how ${input.primaryDriverText || "the most visible business pressure"} spreads into capital lock-in, cash flow, occupancy, or maintenance capacity.`
              : "The cascade sequence begins with early driver interaction and continues through constraint activation. This leads to a structural tipping condition and propagation across multiple structural drivers.",
          outlookHeader: "Forward Outlook:",
          outlookBody:
            isTransport
              ? "Future interpretation should prioritise which policy pathway is now dominant, even when margin deltas remain small."
              : isRealEstate
                ? "Forward-looking assessment should focus on whether refinancing capacity, occupancy, cash flow, and maintenance choices preserve room to act."
              : "The system approaches a potential structural breach condition, although the timing remains uncertain. The declining margin trend indicates that corrective decisions may be required to stabilise the trajectory.",
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
${templates.structuralDivergence}: ${input.structuralDivergenceText}
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
    profileCount("ai-interpretation.route.post.calls");
    const body = await profileMeasureAsync(
      "ai-interpretation.route.request.json.ms",
      () => req.json()
    );
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
      caseType,
      selectedActions,
      primaryDriverChanged,
      constraintActivationChanged,
      propagationRootChanged,
      dominantScenarioDifferenceChannel,
      question: executiveQuestion,
    } = body;
    const uiLanguage: InterpretationLanguage = language === "sv" ? "sv" : "en";
    const t = pulseLanguage[uiLanguage] as any;
    const driverLabels = t.driverLabels ?? {};
    const riskLabels = t.riskLabels ?? {};
    const unknownText = uiLanguage === "sv" ? "okänd" : "Unknown";
    const notEstimatedText = uiLanguage === "sv" ? "Ej uppskattad" : "Not estimated";
    const noCascadeText =
      caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "Ingen tydlig kedja"
          : "No clear chain"
        : uiLanguage === "sv"
          ? "Inga"
          : "None";
    const noDominantFactorText =
      caseType === "real-estate"
        ? uiLanguage === "sv"
          ? "ej tydligt identifierad"
          : "not clearly identified"
        : unknownText;
    const noDecisionFlowText = uiLanguage === "sv" ? "Inget" : "None";
    const translateRisk = (key: string) =>
      driverLabels[key] ??
      riskLabels[key] ??
      mapRiskLabelToPolicyLabel(key, uiLanguage) ??
      EVENT_TRANSLATIONS[key as keyof typeof EVENT_TRANSLATIONS]?.[uiLanguage] ??
      key;
    const translateTransportRisk = (key: string) =>
      getTransportPolicyExplanationLabel(key, uiLanguage);
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
    const transportContext =
      caseType === "transport"
        ? resolveTransportInspectorContext({
            language: uiLanguage,
            selectedActions: selectedActions ?? [],
            primaryDriverKey: primaryDriver,
          })
        : null;
    const translatedDominantScenarioDifferenceChannel =
      caseType === "transport"
        ? dominantScenarioDifferenceChannel
          ? String(dominantScenarioDifferenceChannel)
              .split("→")
              .map((part: string) => translateTransportRisk(part.trim()))
              .join(" → ")
          : transportContext?.dominantScenarioDifferenceChannel ?? null
        : dominantScenarioDifferenceChannel
          ? String(dominantScenarioDifferenceChannel)
              .split("→")
              .map((part: string) => translateRisk(part.trim()))
              .join(" → ")
          : null;
    const translatedEventsText = (events ?? [])
      .map((e: any) => {
        const translatedType =
          EVENT_TRANSLATIONS[e.type as keyof typeof EVENT_TRANSLATIONS]?.[uiLanguage] ?? e.type;
        return `Q${e.quarter}: ${translatedType}`;
      })
      .join("\n");
    const translatedCascadeText =
      caseType === "transport"
        ? transportContext?.propagationChainLabel ??
          (cascadeEvents ?? [])
            .map(
              (e: any) =>
                `${translateTransportRisk(e.sourceRisk)} -> ${translateTransportRisk(e.targetRisk)} (${translateLevel(e.level)})`
            )
            .join("\n")
        : (cascadeEvents ?? [])
            .map(
              (e: any) =>
                `${translateRisk(e.sourceRisk)} -> ${translateRisk(e.targetRisk)} (${translateLevel(e.level)})`
            )
            .join("\n");
    const translatedPrimaryDriverText =
      caseType === "transport"
        ? transportContext?.systemDriverLabel ??
          (primaryDriver ? translateTransportRisk(primaryDriver) : unknownText)
        : primaryDriver
          ? translateRisk(primaryDriver)
          : cascadeEvents && cascadeEvents.length > 0
            ? translateRisk(cascadeEvents[0].sourceRisk)
            : noDominantFactorText;
    const hasStructuralDivergence = Boolean(
      (typeof marginImpact === "number" && marginImpact !== 0) ||
        primaryDriverChanged ||
        constraintActivationChanged ||
        propagationRootChanged ||
        translatedDominantScenarioDifferenceChannel
    );
    const translatedStructuralDivergenceText = hasStructuralDivergence
      ? translatedDominantScenarioDifferenceChannel ??
        (caseType === "real-estate"
          ? uiLanguage === "sv"
            ? "en annan kombination av refinansiering, kassaflöde, beläggning och kapitalbindning"
            : "a different combination of refinancing, cash flow, occupancy, and capital lock-in"
          : uiLanguage === "sv"
            ? "en förändrad primär drivare eller spridningskedja"
            : "a shifted primary driver or propagation chain")
      : uiLanguage === "sv"
        ? "ingen tydlig strukturell divergens identifierad ännu"
        : "no clear structural divergence identified yet";
    const translatedSystemPressureText = systemPressure
      ? translateSystemPressure(systemPressure)
      : noDominantFactorText;
    const translatedMarginTrendText = marginTrend
      ? translateMarginTrend(marginTrend)
      : noDominantFactorText;

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
- ${caseType === "real-estate" ? "Påverkanskedja" : "Kaskadhändelser"}: ${translatedCascadeText || noCascadeText}
- ${caseType === "real-estate" ? "Viktigaste affärsfaktor" : "Primär drivare"}: ${translatedPrimaryDriverText}
- ${caseType === "real-estate" ? "Påverkan på kassaflöde och handlingsutrymme" : "Systemtryck"}: ${translatedSystemPressureText}
- ${caseType === "real-estate" ? "Tid tills handlingsutrymmet pressas tydligt" : "Uppskattad tid till strukturellt brott"}: ${breachText}
- ${caseType === "real-estate" ? "Trend i handlingsutrymme" : "Marginaltrend"}: ${translatedMarginTrendText}
- ${caseType === "real-estate" ? "Tid tills påverkan slår igenom" : "Kaskadfördröjning"}: ${cascadeDelaySteps} steg efter beslut
- Beslutsflöde: ${decisionFlowText || noDecisionFlowText}

Beslutsfattarens fråga: ${executiveQuestion.trim()}

Svara på frågan utifrån endast den angivna systemkontexten. Var koncis och använd tydligt språk för svenska beslutsfattare.
${qaLangInstruction}`
          : `You are analyzing a deterministic system simulation.

System context:
- ${caseType === "real-estate" ? "Impact chain" : "Cascade events"}: ${translatedCascadeText || noCascadeText}
- ${caseType === "real-estate" ? "Main business factor" : "Primary driver"}: ${translatedPrimaryDriverText}
- ${caseType === "real-estate" ? "Cash-flow and flexibility impact" : "System pressure"}: ${translatedSystemPressureText}
- ${caseType === "real-estate" ? "Estimated time until flexibility narrows materially" : "Estimated time to structural breach"}: ${breachText}
- ${caseType === "real-estate" ? "Flexibility trend" : "Margin trend"}: ${translatedMarginTrendText}
- ${caseType === "real-estate" ? "Time before the impact spreads" : "Cascade delay"}: ${cascadeDelaySteps} timestep(s) after decision
- Decision flow: ${decisionFlowText || noDecisionFlowText}

Executive question: ${executiveQuestion.trim()}

Answer the executive's question using only the provided system context. Be concise and explain in plain language suitable for executives.
${qaLangInstruction}`;

      const ollamaRequestBody = profileMeasure(
        "ai-interpretation.route.qa.serialize.ms",
        () =>
          JSON.stringify({
            model: "llama3:latest",
            prompt: qaPrompt,
            stream: false,
            options: {
              num_predict: 200,
              temperature: 0.2,
            },
          })
      );
      profileValue(
        "ai-interpretation.route.qa.payload.bytes",
        ollamaRequestBody.length,
        "bytes"
      );

      const response = await profileMeasureAsync(
        "ai-interpretation.route.qa.fetch.ms",
        () =>
          fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: ollamaRequestBody,
          })
      );

      const data = await profileMeasureAsync(
        "ai-interpretation.route.qa.response.json.ms",
        () => response.json()
      );
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
        transportSummaryCascadeText:
          translatedDominantScenarioDifferenceChannel ??
          transportContext?.propagationChainLabel ??
          undefined,
        cascadeDriversText: translatedCascadeText,
        primaryDriverText: translatedPrimaryDriverText,
        systemPressureText: translatedSystemPressureText,
        breachText,
        marginTrendText: translatedMarginTrendText,
        structuralDivergenceText: translatedStructuralDivergenceText,
        cascadeDelaySteps,
        decisionFlowText,
        tippingQuarter,
        currentMargin,
        alternativeMargin,
        marginImpact,
        interpretationMode:
          caseType === "transport"
            ? "transport"
            : caseType === "real-estate"
              ? "real-estate"
              : "generic",
      }) +
      "\n\n" +
      langInstruction;

    const ollamaRequestBody = profileMeasure(
      "ai-interpretation.route.summary.serialize.ms",
      () =>
        JSON.stringify({
          model: "llama3:latest",
          prompt,
          stream: false,
          options: {
            num_predict: 400,
            temperature: 0.2,
          },
        })
    );
    profileValue(
      "ai-interpretation.route.summary.payload.bytes",
      ollamaRequestBody.length,
      "bytes"
    );

    const response = await profileMeasureAsync(
      "ai-interpretation.route.summary.fetch.ms",
      () =>
        fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: ollamaRequestBody,
        })
    );

    const data = await profileMeasureAsync(
      "ai-interpretation.route.summary.response.json.ms",
      () => response.json()
    );

    let text = (data.response ?? "").trim();

    if (!text || text.length < 10) {
      text =
        caseType === "transport"
          ? language === "sv"
            ? hasStructuralDivergence
              ? `Transportsystemet visar strukturell divergens genom ${translatedStructuralDivergenceText}. Den dominerande policydrivaren är ${translatedPrimaryDriverText}.`
              : `Transportsystemet visar ännu begränsad marginalskillnad, men den dominerande policydrivaren är ${translatedPrimaryDriverText} och spridningskedjan är ${translatedCascadeText || noCascadeText}.`
            : hasStructuralDivergence
              ? `The transport system shows structural divergence through ${translatedStructuralDivergenceText}. The dominant policy driver is ${translatedPrimaryDriverText}.`
              : `The transport system does not yet show a large margin delta, but the dominant policy driver is ${translatedPrimaryDriverText} and the propagation chain is ${translatedCascadeText || noCascadeText}.`
          : language === "sv"
            ? caseType === "real-estate"
              ? "Portföljen visar ökande press på kassaflöde och handlingsutrymme. Refinansiering, kapitalbindning och beläggning behöver följas nära om utvecklingen fortsätter."
              : "Systemet visar ökande systemtryck. Den primära drivaren påverkar marginalen negativt och kan leda till strukturell instabilitet om utvecklingen fortsätter."
            : caseType === "real-estate"
              ? "The portfolio shows rising pressure on cash flow and strategic flexibility. Refinancing, capital lock-in, and occupancy should be monitored closely if the trajectory continues."
              : "The system shows increasing pressure. The primary driver is weakening the margin and may lead to structural instability if the trend continues.";
    }


    return NextResponse.json({
      text,
    });
  } catch (error) {
    return NextResponse.json({
      text: "AI interpretation unavailable.",
    });
  }
}
