import { NextResponse } from "next/server";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import { EVENT_TRANSLATIONS } from "@/src/pilotFastighet/uiText";
import { getTransportPolicyExplanationLabel } from "@/src/pilotFastighet/transportDomainMapping";
import { resolveTransportInspectorContext } from "@/src/pilotFastighet/transportInspectorAdapter";
import { mapRiskLabelToPolicyLabel } from "@/app/pilot-fastighet/components/inspector-utils/mapRiskLabelToPolicyLabel";
import {
  getExecutiveDemoInterpretationAddon,
  surfaceOrgDemoText,
} from "@/src/pilotFastighet/executiveDemoTransformation";
import {
  profileCount,
  profileMeasure,
  profileMeasureAsync,
  profileValue,
} from "@/src/lib/runtimeProfile";
import { buildScheduledInterpretationContext } from "@/src/pilotFastighet/analysis/scheduledInterpretationContext";

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
  executiveDemoMode?: boolean;
};

function buildInterpretationPrompt(input: InterpretationPromptInput): string {
  const isTransport = input.interpretationMode === "transport";
  const isRealEstate = input.interpretationMode === "real-estate";
  const isExecRe = Boolean(input.executiveDemoMode) && isRealEstate;
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
      return `Den identifierade beroendekedjan visar hur ${primaryDriverText} omsätts till följdeffekter i transportsystemet.`;
    }

    return `Den identifierade beroendekedjan visar genom att ${primaryDriverText} påverkar ${normalizedFirstStep}${
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
          intro: isExecRe
            ? "Du tolkar en deterministisk genomförings- och beroendemodell. Beskriv observerade strukturer — samordningstryck, beroenden, genomföringsflexibilitet — utan råd om vad mottagaren ska göra."
            : "Du analyserar en deterministisk systemsimulering.",
          data: "Data:",
          events: "Händelser",
          cascade: isRealEstate ? "Påverkanskedja" : "Kaskad",
          primaryDriver: isRealEstate
            ? isExecRe
              ? "Dominerande genomföringspåverkan"
              : "Viktigaste affärsfaktor"
            : "Primär drivare",
          systemPressure: isRealEstate
            ? isExecRe
              ? "Påverkan på genomföringsflexibilitet"
              : "Påverkan på kassaflöde och handlingsutrymme"
            : "Systemtryck",
          breach: isRealEstate
            ? "Tid tills handlingsutrymmet pressas tydligt"
            : "Uppskattad tid till strukturellt brott",
          marginTrend: isRealEstate ? "Trend i handlingsutrymme" : "Margintrend",
          structuralDivergence: isRealEstate
            ? "Skillnad mellan strategierna"
            : "Skillnad i hur trycket utvecklas",
          cascadeDelay: isRealEstate ? "Tid tills påverkan slår igenom" : "Kaskadfördröjning",
          decisionFlow: "Beslutsflöde",
          tipping: isRealEstate ? "Tidpunkt med störst press" : "Tippingpunkt",
          currentMargin: "Nuvarande marginal",
          alternativeMargin: "Alternativ marginal",
          difference: "Skillnad",
          noData: isRealEstate ? "Ingen tydlig kedja" : "Inga",
          noFlow: "—",
          noTipping: "Ingen",
          structureHeader: isExecRe
            ? "Använd exakt dessa rubriker (inget inledande ”här är min analys” eller liknande):"
            : "Strukturera svaret i fyra delar (behåll rubrikerna):",
          summaryHeader: "Sammanfattning:",
          summaryBody:
            isTransport
              ? `Transportnätverket utvecklar ett genomförandetryck genom ${input.primaryDriverText || "centrala policydrivare"}, vilket påverkar systemets utvecklingsriktning${transportSummaryCascadeText ? ` via följande beroendekedja: ${transportSummaryCascadeText}` : input.structuralDivergenceText ? ` genom ${input.structuralDivergenceText}` : " tidigt i scenariospåret"}.`
              : isRealEstate
                ? isExecRe
                  ? `Genomföringsmönstret domineras av ${input.primaryDriverText || "samtidiga beroenden och resursbindning i initiativportföljen"}. Tryck koncentreras när flera åtaganden möter samma genomföringskapacitet.`
                  : `Portföljen påverkas främst av ${input.primaryDriverText || "refinansiering, kapitalbindning och beläggning"}. Detta minskar portföljens handlingsutrymme tidigt i scenariospåret.`
              : `Systemet utvecklar genomförandetryck genom påverkan från ${input.primaryDriverText || "centrala systemdrivare"}, vilket minskar handlingsutrymmet ${input.breachText && input.breachText !== "Ej uppskattad" ? `före ${input.breachText}` : "tidigt i scenariospåret"} och indikerar att stabiliserande beslut kan krävas i ett tidigt skede.`,
          structuralHeader: isRealEstate
            ? isExecRe
              ? "Strukturella drivkrafter:"
              : "Vad utvecklingen styrs av:"
            : "Strukturell analys:",
          structuralBody:
            isTransport
              ? `Den observerade utvecklingen drivs av ${input.primaryDriverText || "transportpolitiska drivkrafter"} och visar hur policyval omformas till strukturella följdeffekter i systemet. ${input.structuralDivergenceText}`
              : isRealEstate
                ? isExecRe
                  ? `Utvecklingen speglar samverkan mellan sekvensering, resursbindning, operativa avväganden och beroenden — inte en isolerad faktor. ${input.structuralDivergenceText}`
                  : `Utvecklingen styrs främst av refinansiering, kapitalbindning, likviditet, beläggning och underhållsstrategi. ${input.structuralDivergenceText}`
              : "Den observerade marginaltrenden visar att flera strukturella drivkrafter samverkar och gradvis minskar systemets flexibilitet, vilket innebär att stabilisering sannolikt kräver koordinerade åtgärder snarare än en enskild insats.",
          cascadeHeader: isRealEstate
            ? isExecRe
              ? "Hur beroenden sprider sig:"
              : "Påverkan i portföljen:"
            : "Hur kaskadeffekter sprider sig:",
          cascadeBody:
            isTransport
              ? swedishTransportCascadeBodyText
              : isRealEstate
                ? isExecRe
                  ? `${input.primaryDriverText || "Den dominerande påverkan"} förskjuter hur snabbt beroenden aktiveras i förhållande till tillgänglig genomföringskapacitet.`
                  : `${input.primaryDriverText || "Ränteexponering"} driver ökade risker via refinansieringsrisk och belåningsnivå.`
                : `Den identifierade kaskadsekvensen visar hur förändringar i ${input.primaryDriverText || "systemets centrala drivare"} sprids vidare genom ${input.cascadeDriversText || "flera strukturella drivkrafter"} och skapar ett tidigt tipping-läge, vilket innebär att sena åtgärder får begränsad effekt jämfört med tidiga insatser.`,
          outlookHeader: isExecRe ? "Tryckets utveckling:" : "Framåtblick:",
          outlookBody: (() => {
            const goalExtraSv =
              input.goalDirection === "toward"
                ? " Utvecklingen rör systemet i riktning mot målstrategin, vilket stärker förutsättningarna för strukturell stabilisering."
                : input.goalDirection === "away"
                  ? " Utvecklingen rör systemet bort från målstrategin, vilket innebär att ytterligare stabiliserande beslut kan krävas tidigt i förloppet."
                  : "";
            const goalExecSv =
              input.goalDirection === "toward"
                ? " Mönstret ligger närmare målspårets riktning."
                : input.goalDirection === "away"
                  ? " Mönstret ligger bort från målspårets riktning."
                  : "";
            if (isTransport) {
              return `Transportsystemets fortsatta utveckling bör bedömas utifrån vilken policykedja som nu dominerar och hur detta påverkar genomförbarhet och kapacitetsflexibilitet.`;
            }
            if (isRealEstate && isExecRe) {
              return `När samordningstryck koncentreras smalnar handlingsutrymmet vanligtvis gradvis. Alternativspåret sprider beroendeaktivering så genomföringskapaciteten hinner absorbera trycket längre.${goalExecSv}`;
            }
            if (isRealEstate) {
              return `Refinansieringsförmåga, kassaflöde och beläggning påverkar portföljens handlingsutrymme framåt.${goalExtraSv}`;
            }
            return `Den fortsatta marginalutvecklingen indikerar att systemet närmar sig ett möjligt strukturellt brottstillstånd ${input.breachText && input.breachText !== "Ej uppskattad" ? `kring ${input.breachText}` : "senare i scenariospåret"}, vilket innebär att utvecklingen bör följas och stabiliserande beslut övervägas i tid.${goalExtraSv}`;
          })(),
          footer:
            isRealEstate
              ? isExecRe
                ? "Håll språket observatoriskt. Beskriv hur genomföringsflexibilitet, beroenden och samordningstryck utvecklas — utan rådgivning och utan finansord i svaret."
                : "Använd tydligt språk anpassat för svenska beslutsfattare. Använd kort, beslutsnära formuleringar. Undvik formuleringar som: 'det är viktigt att övervaka' 'detta kan signalera att stabiliserande beslut behövs' eller andra generella rådgivningsformuleringar. Beskriv istället direkt hur handlingsutrymmet förändras."
              : "Använd tydligt språk anpassat för svenska beslutsfattare.",
        }
      : {
          intro: isExecRe
            ? "You interpret output from a deterministic execution and dependency model. Describe what the run shows—coordination pressure, dependencies, room to act—not what the reader should do."
            : "You are an analyst explaining simulation results to executives. Use clear, non-technical language.",
          data: "Data:",
          events: "Events",
          cascade: isRealEstate ? "Impact chain" : "System cascade",
          primaryDriver: isRealEstate
            ? isExecRe
              ? "Dominant execution pressure"
              : "Main business factor"
            : "Primary driver",
          systemPressure: isRealEstate
            ? isExecRe
              ? "Effect on execution flexibility"
              : "Cash-flow and flexibility impact"
            : "System pressure",
          breach: isRealEstate
            ? "Estimated time until flexibility narrows materially"
            : "Estimated time to structural breach",
          marginTrend: isRealEstate ? "Flexibility trend" : "Margin trend (alternative strategy)",
          structuralDivergence: isRealEstate ? "Difference between strategies" : "Difference in how pressure develops",
          cascadeDelay: isRealEstate ? "Time before the impact spreads" : "Cascade delay",
          decisionFlow: "Decision flow",
          tipping: isRealEstate ? "Peak pressure point" : "Tipping point",
          currentMargin: "Current margin",
          alternativeMargin: "Alternative margin",
          difference: "Difference",
          noData: isRealEstate ? "No clear chain" : "None",
          noFlow: "—",
          noTipping: "None",
          structureHeader: isExecRe
            ? "Use exactly these headings (no preamble like “here is my analysis”):"
            : "Write your analysis in exactly this structure (keep the headings):",
          summaryHeader: isExecRe ? "Overview:" : "Executive Summary:",
          summaryBody:
            isTransport
              ? `The transport system shows implementation pressure through ${input.primaryDriverText || "policy-driven system change"}, with divergence emerging through ${input.structuralDivergenceText || "a distinct dependency sequence"}.`
              : isRealEstate
                ? isExecRe
                  ? `The pattern is dominated by ${input.primaryDriverText || "overlapping dependencies and resource lock-in across the initiative portfolio"}. Pressure concentrates when parallel commitments hit the same execution capacity.`
                  : `The portfolio is primarily pressured by ${input.primaryDriverText || "refinancing, capital lock-in, occupancy, and cash flow"}, which reduces decision flexibility early in the horizon.`
              : "The system shows increasing implementation pressure following early driver interaction and constraint activation. The structural margin declines early in the trajectory, indicating reduced flexibility if no corrective action is taken.",
          structuralHeader: isRealEstate
            ? isExecRe
              ? "Structural drivers:"
              : "Business Analysis:"
            : "Structural Analysis:",
          structuralBody:
            isTransport
              ? `The observed system behaviour is driven by ${input.primaryDriverText || "transport policy levers"} and translated through ${input.cascadeText || "a policy dependency sequence"}.`
              : isRealEstate
                ? isExecRe
                  ? `The trajectory reflects sequencing, resource lock-in, operational trade-offs, and shared dependencies—not a single isolated lever.`
                  : "The observed development reflects interaction between refinancing conditions, leverage, liquidity, occupancy, and maintenance choices rather than one isolated issue."
              : "No single dominant driver is identified. The declining margin trend reflects interaction between several structural drivers rather than one isolated factor.",
          cascadeHeader: isRealEstate
            ? isExecRe
              ? "Dependency propagation:"
              : "Portfolio Impact:"
            : "How cascade effects spread:",
          cascadeBody:
            isTransport
              ? `The dependency sequence shows how ${input.primaryDriverText || "the selected policy lever"} affects subsequent transport-system conditions. ${input.structuralDivergenceText}`
              : isRealEstate
                ? isExecRe
                  ? `${input.primaryDriverText || "The dominant pressure"} shifts how quickly dependencies activate relative to available execution capacity.`
                  : `The impact chain shows how ${input.primaryDriverText || "the most visible business pressure"} spreads into capital lock-in, cash flow, occupancy, or maintenance capacity.`
              : "The cascade sequence begins with early driver interaction and continues through constraint activation. This leads to a structural tipping condition and propagation across multiple structural drivers.",
          outlookHeader: isExecRe ? "How pressure evolves:" : "Forward Outlook:",
          outlookBody: (() => {
            if (isTransport) {
              return "Describe which dependency pathway is structurally dominant from here, even when margin deltas stay small.";
            }
            if (isRealEstate && isExecRe) {
              const g =
                input.goalDirection === "toward"
                  ? " The pattern sits closer to the goal-track direction."
                  : input.goalDirection === "away"
                    ? " The pattern sits away from the goal-track direction."
                    : "";
              return `As coordination pressure concentrates, room to act typically narrows gradually. The alternative path spreads dependency activation so capacity can absorb it longer.${g}`;
            }
            if (isRealEstate) {
              return "Forward pressure depends on how occupancy, resource flow to change, and operational trade-offs interact with execution headroom.";
            }
            return "The system moves toward a possible structural breach window, though timing stays uncertain; the margin trend shows flexibility eroding if pressure continues.";
          })(),
          footer: isExecRe
            ? "Observational wording only: how execution flexibility and dependencies evolve. No consulting tone, no recommendations, no finance vocabulary in the answer body."
            : "Be concise and avoid technical jargon.",
        };

  return `${templates.intro}

${input.language === "sv" && isRealEstate && isExecRe
  ? `SPRÅKREGEL (DEMONSTRATION):
Beskriv observerade strukturer: samordningstryck, beroenden, genomföringsflexibilitet.
Inga rekommendationer. Formulera inte vad mottagaren bör göra.
Undvik finansord (refinansiering, likviditet, belåning, finansiering).
`
  : ""}
${input.language === "sv" && isRealEstate && !isExecRe
  ? `BESLUTSREGEL (FASTIGHET):
Beskriv endast observerade strukturella konsekvenser.
Ge inga rekommendationer.
Formulera inte vad användaren bör göra.
Beskriv endast hur handlingsutrymmet förändras.
Beskriv direkt hur handlingsutrymmet förändras.
Undvik rådgivande formuleringar som:
'det är viktigt att övervaka'
'detta kan signalera att stabiliserande beslut behövs'.
Formulera istället konsekvenser direkt.
Om handlingsutrymmet förbättras:
skriv "detta minskar handlingsutrymmet".

Om handlingsutrymmet minskar:
skriv "detta minskar handlingsutrymmet".

Skriv aldrig formuleringar om att beslut "kan behövas".
Beskriv istället konsekvensen direkt.
`
  : ""}

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
${templates.tipping}: ${input.tippingQuarter != null ? `M${input.tippingQuarter}` : templates.noTipping}
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
      caseType: caseTypeRaw,
      selectedActions,
      primaryDriverChanged,
      constraintActivationChanged,
      propagationRootChanged,
      dominantScenarioDifferenceChannel,
      question: executiveQuestion,
      executiveDemoMode: executiveDemoModeRaw,
      executionContext,
    } = body;
    const uiLanguage: InterpretationLanguage = language === "sv" ? "sv" : "en";
    const executiveDemoMode =
      executiveDemoModeRaw === true ||
      executiveDemoModeRaw === "true" ||
      executiveDemoModeRaw === 1;
    const caseType =
      caseTypeRaw === "realEstate" || caseTypeRaw === "real_estate"
        ? "real-estate"
        : caseTypeRaw === "transport"
          ? "transport"
          : caseTypeRaw ?? null;
    const demoSurface = (value: string) =>
      executiveDemoMode ? surfaceOrgDemoText(value, uiLanguage) : value;
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
    const translateRisk = (key: string) => {
      const execPolicy =
        executiveDemoMode && caseType === "real-estate"
          ? mapRiskLabelToPolicyLabel(key, uiLanguage, { executiveDemo: true })
          : null;
      const defaultPolicy = mapRiskLabelToPolicyLabel(key, uiLanguage);
      if (execPolicy != null && execPolicy !== defaultPolicy) {
        return execPolicy;
      }
      return (
        driverLabels[key] ??
        riskLabels[key] ??
        defaultPolicy ??
        EVENT_TRANSLATIONS[key as keyof typeof EVENT_TRANSLATIONS]?.[uiLanguage] ??
        key
      );
    };
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
    /** Executive demo + real-estate: avoid sending raw MODERATE/HIGH tokens into the model (they elicit finance-y paraphrases). */
    const systemPressureForPrompt = (value: string) => {
      if (!(executiveDemoMode && caseType === "real-estate")) {
        return translateSystemPressure(value);
      }
      if (uiLanguage === "sv") {
        switch (value) {
          case "LOW":
            return "begränsat genomföringstryck";
          case "MODERATE":
            return "påtagligt samordningstryck som sprider sig";
          case "HIGH":
            return "högt samordningstryck över flera beroenden";
          case "SYSTEMIC":
            return "systemiskt: många beroenden aktiveras samtidigt";
          default:
            return translateSystemPressure(value);
        }
      }
      switch (value) {
        case "LOW":
          return "limited execution-pressure buildup";
        case "MODERATE":
          return "notable coordination strain with dependency spread";
        case "HIGH":
          return "high coordination strain across linked dependencies";
        case "SYSTEMIC":
          return "systemic: many dependencies activating together";
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
        return `M${e.quarter}: ${translatedType}`;
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
          ? executiveDemoMode
            ? uiLanguage === "sv"
              ? "en annan mix av resursbindning, sekvensering och genomföringskapacitet"
              : "a different mix of resource lock-in, sequencing, and execution capacity"
            : uiLanguage === "sv"
              ? "en annan kombination av refinansiering, kassaflöde och beläggning kan behövas för att minska riskerna"
              : "a different combination of refinancing, cash flow, occupancy, and capital lock-in"
          : uiLanguage === "sv"
            ? "en förändrad primär drivare eller beroendekedja"
            : "a shifted primary driver or dependency sequence")
      : uiLanguage === "sv"
        ? "ingen tydlig skillnad i hur trycket utvecklas identifierad ännu"
        : "no clear difference in how pressure develops identified yet";
    const translatedSystemPressureText = systemPressure
      ? systemPressureForPrompt(systemPressure)
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
        .map((e: any) => {
          const line = `${e.time}: ${e.text}`;
          return executiveDemoMode ? demoSurface(line) : line;
        })
        .join("\n");

      const qaLangInstruction =
        language === "sv" ? "Svara på svenska." : "Answer in English.";

      const qaPrompt =
        language === "sv"
          ? `Du analyserar en deterministisk systemsimulering.

Systemkontext:
- ${caseType === "real-estate" ? "Påverkanskedja" : "Kaskadhändelser"}: ${demoSurface(translatedCascadeText || noCascadeText)}
- ${caseType === "real-estate" ? (executiveDemoMode ? "Dominerande genomföringspåverkan" : "Viktigaste affärsfaktor") : "Primär drivare"}: ${demoSurface(translatedPrimaryDriverText)}
- ${caseType === "real-estate" ? (executiveDemoMode ? "Påverkan på genomföringsflexibilitet" : "Påverkan på kassaflöde och handlingsutrymme") : "Systemtryck"}: ${demoSurface(translatedSystemPressureText)}
- ${caseType === "real-estate" ? "Tid tills handlingsutrymmet pressas tydligt" : "Uppskattad tid till strukturellt brott"}: ${demoSurface(breachText)}
- ${caseType === "real-estate" ? "Trend i handlingsutrymme" : "Marginaltrend"}: ${demoSurface(translatedMarginTrendText)}
- ${caseType === "real-estate" ? "Tid tills påverkan slår igenom" : "Kaskadfördröjning"}: ${cascadeDelaySteps} steg efter beslut
- Beslutsflöde: ${decisionFlowText || noDecisionFlowText}

Beslutsfattarens fråga: ${executiveQuestion.trim()}

Svara på frågan utifrån endast den angivna systemkontexten. Var koncis och använd tydligt språk för svenska beslutsfattare.
${qaLangInstruction}${executiveDemoMode ? getExecutiveDemoInterpretationAddon(uiLanguage) : ""}`
          : `You are analyzing a deterministic system simulation.

System context:
- ${caseType === "real-estate" ? "Impact chain" : "Cascade events"}: ${demoSurface(translatedCascadeText || noCascadeText)}
- ${caseType === "real-estate" ? (executiveDemoMode ? "Dominant execution pressure" : "Main business factor") : "Primary driver"}: ${demoSurface(translatedPrimaryDriverText)}
- ${caseType === "real-estate" ? (executiveDemoMode ? "Effect on execution flexibility" : "Cash-flow and flexibility impact") : "System pressure"}: ${demoSurface(translatedSystemPressureText)}
- ${caseType === "real-estate" ? "Estimated time until flexibility narrows materially" : "Estimated time to structural breach"}: ${demoSurface(breachText)}
- ${caseType === "real-estate" ? "Flexibility trend" : "Margin trend"}: ${demoSurface(translatedMarginTrendText)}
- ${caseType === "real-estate" ? "Time before the impact spreads" : "Cascade delay"}: ${cascadeDelaySteps} timestep(s) after decision
- Decision flow: ${decisionFlowText || noDecisionFlowText}

Executive question: ${executiveQuestion.trim()}

Answer the executive's question using only the provided system context. Be concise and explain in plain language suitable for executives.
${qaLangInstruction}${executiveDemoMode ? getExecutiveDemoInterpretationAddon(uiLanguage) : ""}`;

      const ollamaRequestBody = profileMeasure(
        "ai-interpretation.route.qa.serialize.ms",
        () =>
          JSON.stringify({
            model: "llama3:latest",
            prompt: qaPrompt,
            stream: false,
            options: {
              num_predict: executiveDemoMode ? 120 : 200,
              temperature: executiveDemoMode ? 0.15 : 0.2,
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
      const qaTextRaw = (data.response ?? "No response.").trim();
      return NextResponse.json({
        text: executiveDemoMode ? demoSurface(qaTextRaw) : qaTextRaw,
      });
    }

    const breachText =
      typeof estimatedTimeToBreach === "number"
        ? `~${estimatedTimeToBreach} steps`
        : notEstimatedText;
    const cascadeDelaySteps = cascadeDelay ?? 1;

    const decisionFlowText = (decisionFlowEvents ?? [])
      .map((e: any) => {
        const line = `${e.time}: ${e.text}`;
        return executiveDemoMode ? demoSurface(line) : line;
      })
      .join("\n");

    const transportSummaryCascadeRaw =
      translatedDominantScenarioDifferenceChannel ??
      transportContext?.propagationChainLabel ??
      undefined;

    const langInstruction =
      language === "sv" ? "Svara på svenska." : "Answer in English.";

    const prompt =
      buildInterpretationPrompt({
        language: language === "sv" ? "sv" : "en",
        executiveDemoMode,
        eventsText: demoSurface(translatedEventsText),
        cascadeText: demoSurface(translatedCascadeText),
        transportSummaryCascadeText:
          transportSummaryCascadeRaw != null
            ? demoSurface(String(transportSummaryCascadeRaw))
            : undefined,
        cascadeDriversText: demoSurface(translatedCascadeText),
        primaryDriverText: demoSurface(translatedPrimaryDriverText),
        systemPressureText: demoSurface(translatedSystemPressureText),
        breachText: demoSurface(breachText),
        marginTrendText: demoSurface(translatedMarginTrendText),
        structuralDivergenceText: demoSurface(translatedStructuralDivergenceText),
        cascadeDelaySteps,
        decisionFlowText: demoSurface(decisionFlowText),
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
      langInstruction +
      (executiveDemoMode ? getExecutiveDemoInterpretationAddon(uiLanguage) : "") +
      (executionContext?.mode === "actions-over-time"
        ? buildScheduledInterpretationContext(executionContext)
        : "");

    const ollamaRequestBody = profileMeasure(
      "ai-interpretation.route.summary.serialize.ms",
      () =>
        JSON.stringify({
          model: "llama3:latest",
          prompt,
          stream: false,
          options: {
            num_predict: executiveDemoMode ? 220 : 400,
            temperature: executiveDemoMode ? 0.15 : 0.2,
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
              ? `Transportsystemet visar skillnad i hur trycket utvecklas genom ${translatedStructuralDivergenceText}. Den dominerande policydrivaren är ${translatedPrimaryDriverText}.`
              : `Transportsystemet visar ännu begränsad marginalskillnad, men den dominerande policydrivaren är ${translatedPrimaryDriverText} och beroendekedjan är ${translatedCascadeText || noCascadeText}.`
            : hasStructuralDivergence
              ? `The transport system shows a difference in how pressure develops through ${translatedStructuralDivergenceText}. The dominant policy driver is ${translatedPrimaryDriverText}.`
              : `The transport system does not yet show a large margin delta, but the dominant policy driver is ${translatedPrimaryDriverText} and the dependency sequence is ${translatedCascadeText || noCascadeText}.`
          : language === "sv"
            ? caseType === "real-estate"
              ? executiveDemoMode
                ? "Initiativportföljen visar ökande samordningstryck mot genomföringsflexibilitet; samma kombination av sekvensering och resursbindning förstärker mönstret om det fortgår."
                : "Portföljen visar ökande press på kassaflöde och handlingsutrymme. Refinansiering, kapitalbindning och beläggning behöver följas nära om utvecklingen fortsätter."
              : "Systemet visar ökande systemtryck. Den primära drivaren påverkar marginalen negativt och kan leda till strukturell instabilitet om utvecklingen fortsätter."
            : caseType === "real-estate"
              ? executiveDemoMode
                ? "The initiative portfolio shows rising coordination pressure on execution flexibility; the same sequencing and lock-in combination reinforces the pattern if it continues."
                : "The portfolio shows rising pressure on cash flow and strategic flexibility. Refinancing, capital lock-in, and occupancy should be monitored closely if the trajectory continues."
              : "The system shows increasing pressure. The primary driver is weakening the margin and may lead to structural instability if the trend continues.";
    }


    if (executiveDemoMode && text) {
      text = demoSurface(text);
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
