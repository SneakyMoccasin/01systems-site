"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-context";
import { SiteCta } from "@/components/site-cta";

type Language = "sv" | "en";

type PageCopy = {
  eyebrow: string;
  title: string;
  intro: string[];
  corePrinciple: {
    heading: string;
    questionIntro: string;
    question: string;
    body: string;
    diagramTitle: string;
    diagramSteps: string[];
    conclusion: string;
  };
  analyticalModel: {
    heading: string;
    intro: string;
    diagramTitle: string;
    diagramSteps: string[];
    responsibility: string;
    presentation: string;
  };
  deterministicFoundation: {
    heading: string;
    body: string[];
    diagramTitle: string;
    parentTop: string;
    parentMiddle: string;
    childNodes: string[];
    conclusion: string;
  };
  analyticalScope: {
    heading: string;
    body: string[];
  };
  capabilities: {
    heading: string;
    designedTo: string;
    notDesignedTo: string;
    swipeHint: string;
    rows: [string, string][];
  };
};

const COPY: Record<Language, PageCopy> = {
  en: {
    eyebrow: "Architecture",
    title: "Understanding the Analytical Foundation of Cascade Engine",
    intro: [
      "Cascade Engine is a structural analysis engine designed to examine how combinations and sequences of decisions influence future execution conditions.",
      "Rather than estimating probabilities or forecasting future events, it characterises how structural relationships evolve as decisions interact over time. The analytical results describe how structural relationships change, where constraints emerge and how future execution flexibility is affected.",
    ],
    corePrinciple: {
      heading: "Core Principle",
      questionIntro:
        "Every implementation of Cascade Engine is built around a single analytical question:",
      question:
        "How do combinations and sequences of decisions change future execution flexibility?",
      body:
        "Rather than considering decisions in isolation, the analysis examines how multiple decisions interact structurally over time. Individually reasonable decisions may collectively reduce future execution flexibility by activating constraints, increasing structural dependencies or narrowing available execution paths.",
      diagramTitle: "Analytical Principle",
      diagramSteps: [
        "Decisions",
        "Structural Relationships",
        "Future Execution Flexibility",
      ],
      conclusion:
        "The purpose of the analysis is not to determine whether individual decisions are objectively correct or incorrect. Instead, it characterises how combinations of decisions influence the structural conditions under which future decisions must be made.",
    },
    analyticalModel: {
      heading: "The Analytical Model",
      intro:
        "The analytical model describes how structural analysis is performed before analytical results are presented to the user.",
      diagramTitle: "Analytical Flow",
      diagramSteps: [
        "Decisions",
        "Structural Relationships",
        "Structural Analysis",
        "Analytical Results",
        "Presentation",
      ],
      responsibility: "Each stage has a distinct responsibility.",
      presentation:
        "Presentation components communicate completed analytical results but do not alter the structural analysis that produced them.",
    },
    deterministicFoundation: {
      heading: "Deterministic Foundation",
      body: [
        "Cascade Engine separates structural analysis from the presentation of analytical results.",
        "The structural analysis follows a deterministic analytical process. For identical analytical inputs and assumptions, it produces identical analytical results.",
        "The presentation of those results is performed by separate components that communicate the completed analysis to the user.",
        "The principal presentation categories are illustrated below. They represent analytical responsibilities rather than an exhaustive inventory of interface components.",
      ],
      diagramTitle: "Analytical Architecture",
      parentTop: "Structural Analysis",
      parentMiddle: "Analytical Results",
      childNodes: ["Visualisation", "AI Inspector", "AI Interpretation"],
      conclusion:
        "These categories may be implemented through multiple visual, summary and explanatory interface components.",
    },
    analyticalScope: {
      heading: "Analytical Scope",
      body: [
        "Every analytical method is designed to answer a particular type of question.",
        "Cascade Engine is designed to analyse how combinations and sequences of decisions influence future execution conditions through their structural relationships.",
        "Its analytical scope is centred on the structural consequences of decision interaction rather than on predicting future events or estimating uncertainty.",
        "The analysis characterises how structural conditions change as decisions accumulate, allowing users to examine where constraints emerge, how dependencies develop and how future execution flexibility is affected.",
      ],
    },
    capabilities: {
      heading: "Capabilities",
      designedTo: "Designed to",
      notDesignedTo: "Not Designed to",
      swipeHint: "Swipe sideways to view both columns →",
      rows: [
        [
          "Analyse structural relationships between decisions.",
          "Predict future events.",
        ],
        [
          "Characterise cumulative structural effects as decisions interact over time.",
          "Estimate or simulate uncertainty.",
        ],
        [
          "Compare alternative decision structures.",
          "Determine objectively correct decisions.",
        ],
        [
          "Show how decision structures influence future execution conditions.",
          "Replace domain expertise.",
        ],
        [
          "Produce consistent structural analyses from identical analytical inputs and assumptions.",
          "Eliminate human judgement from decision-making.",
        ],
      ],
    },
  },
  sv: {
    eyebrow: "Arkitektur",
    title: "Den analytiska grunden för Cascade Engine",
    intro: [
      "Cascade Engine är en strukturell analysmotor som undersöker hur kombinationer och sekvenser av beslut påverkar framtida genomförandeförutsättningar.",
      "I stället för att uppskatta sannolikheter eller förutsäga framtida händelser karakteriserar motorn hur strukturella samband utvecklas när beslut samverkar över tid. Analysresultaten visar hur dessa samband förändras, var begränsningar uppstår och hur det framtida handlingsutrymmet påverkas.",
    ],
    corePrinciple: {
      heading: "Grundprincip",
      questionIntro:
        "Varje implementation av Cascade Engine utgår från en central analytisk fråga:",
      question:
        "Hur förändrar kombinationer och sekvenser av beslut det framtida handlingsutrymmet?",
      body:
        "I stället för att betrakta beslut isolerat analyseras hur flera beslut samverkar strukturellt över tid. Beslut som vart och ett framstår som rimliga kan tillsammans minska det framtida handlingsutrymmet genom att aktivera begränsningar, öka strukturella beroenden eller minska antalet tillgängliga vägar för genomförande.",
      diagramTitle: "Analytisk princip",
      diagramSteps: ["Beslut", "Strukturella samband", "Framtida handlingsutrymme"],
      conclusion:
        "Analysens syfte är inte att avgöra om enskilda beslut är objektivt rätt eller fel. Den karakteriserar i stället hur kombinationer av beslut påverkar de strukturella förutsättningar inom vilka framtida beslut måste fattas.",
    },
    analyticalModel: {
      heading: "Den analytiska modellen",
      intro:
        "Den analytiska modellen beskriver hur den strukturella analysen genomförs innan analysresultaten presenteras för användaren.",
      diagramTitle: "Analytiskt flöde",
      diagramSteps: [
        "Beslut",
        "Strukturella samband",
        "Strukturell analys",
        "Analysresultat",
        "Presentation",
      ],
      responsibility: "Varje steg har ett avgränsat ansvar.",
      presentation:
        "Presentationskomponenterna kommunicerar färdigställda analysresultat men förändrar inte den strukturella analys som har producerat dem.",
    },
    deterministicFoundation: {
      heading: "Deterministisk grund",
      body: [
        "Cascade Engine skiljer den strukturella analysen från presentationen av analysresultaten.",
        "Den strukturella analysen följer en deterministisk analysprocess. Identiska analytiska indata och antaganden ger identiska analysresultat.",
        "Resultaten presenteras genom separata komponenter som kommunicerar den färdigställda analysen till användaren.",
        "De huvudsakliga presentationskategorierna illustreras nedan. De representerar analytiska ansvarsområden och är inte en uttömmande förteckning över gränssnittets komponenter.",
      ],
      diagramTitle: "Analytisk arkitektur",
      parentTop: "Strukturell analys",
      parentMiddle: "Analysresultat",
      childNodes: ["Visualisering", "AI Inspector", "AI-tolkning"],
      conclusion:
        "Dessa kategorier kan implementeras genom flera visuella, sammanfattande och förklarande gränssnittskomponenter.",
    },
    analyticalScope: {
      heading: "Analytisk omfattning",
      body: [
        "Varje analysmetod är utformad för att besvara en viss typ av fråga.",
        "Cascade Engine är utformad för att analysera hur kombinationer och sekvenser av beslut påverkar framtida genomförandeförutsättningar genom sina strukturella samband.",
        "Den analytiska omfattningen är inriktad på de strukturella konsekvenserna av att beslut samverkar, snarare än på att förutsäga framtida händelser eller uppskatta osäkerhet.",
        "Analysen karakteriserar hur de strukturella förutsättningarna förändras när beslut ackumuleras. Det gör det möjligt för användaren att undersöka var begränsningar uppstår, hur beroenden utvecklas och hur det framtida handlingsutrymmet påverkas.",
      ],
    },
    capabilities: {
      heading: "Förmågor och avgränsningar",
      designedTo: "Utformad för att",
      notDesignedTo: "Inte utformad för att",
      swipeHint: "Svep åt sidan för att se båda kolumnerna →",
      rows: [
        [
          "Analysera strukturella samband mellan beslut.",
          "Förutsäga framtida händelser.",
        ],
        [
          "Karakterisera kumulativa strukturella effekter när beslut samverkar över tid.",
          "Uppskatta eller simulera osäkerhet.",
        ],
        [
          "Jämföra alternativa beslutsstrukturer.",
          "Avgöra vilka beslut som är objektivt korrekta.",
        ],
        [
          "Visa hur beslutsstrukturer påverkar framtida genomförandeförutsättningar.",
          "Ersätta domänexpertis.",
        ],
        [
          "Producera konsekventa strukturella analyser från identiska analytiska indata och antaganden.",
          "Eliminera mänskligt omdöme från beslutsfattandet.",
        ],
      ],
    },
  },
};

function VerticalFlowDiagram({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  return (
    <div
      className="surface-card"
      style={{
        border: "1px solid #e5e5e5",
        background: "#fafafa",
        color: "var(--card-text-primary)",
      }}
    >
      <p
        className="eyebrow"
        style={{
          marginBottom: "20px",
          color: "var(--card-text-muted)",
        }}
      >
        {title}
      </p>
      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "10px",
          textAlign: "center",
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step}
            style={{
              display: "grid",
              justifyItems: "center",
              gap: "10px",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                padding: "14px 16px",
                border: "1px solid #e5e5e5",
                borderRadius: "10px",
                background: "#fff",
                color: "var(--card-text-primary)",
                fontSize: "clamp(16px, 3.8vw, 18px)",
                lineHeight: 1.4,
                fontWeight: 500,
              }}
            >
              {step}
            </div>
            {index < steps.length - 1 ? (
              <div
                aria-hidden="true"
                style={{
                  fontSize: "24px",
                  lineHeight: 1,
                  color: "var(--text-muted)",
                }}
              >
                ↓
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchitectureDiagram({
  title,
  parentTop,
  parentMiddle,
  childNodes,
}: {
  title: string;
  parentTop: string;
  parentMiddle: string;
  childNodes: string[];
}) {
  return (
    <div
      className="surface-card"
      style={{
        border: "1px solid #e5e5e5",
        background: "#fafafa",
        color: "var(--card-text-primary)",
      }}
    >
      <p
        className="eyebrow"
        style={{
          marginBottom: "20px",
          color: "var(--card-text-muted)",
        }}
      >
        {title}
      </p>
      <div
        style={{
          display: "grid",
          gap: "12px",
          justifyItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "14px 16px",
            border: "1px solid #e5e5e5",
            borderRadius: "10px",
            background: "#fff",
            fontSize: "clamp(16px, 3.8vw, 18px)",
            lineHeight: 1.4,
            fontWeight: 500,
            color: "var(--card-text-primary)",
          }}
        >
          {parentTop}
        </div>
        <div
          aria-hidden="true"
          style={{ fontSize: "24px", lineHeight: 1, color: "var(--text-muted)" }}
        >
          │
        </div>
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "14px 16px",
            border: "1px solid #e5e5e5",
            borderRadius: "10px",
            background: "#fff",
            fontSize: "clamp(16px, 3.8vw, 18px)",
            lineHeight: 1.4,
            fontWeight: 500,
            color: "var(--card-text-primary)",
          }}
        >
          {parentMiddle}
        </div>
        <div
          style={{
            width: "100%",
            marginTop: "6px",
            display: "grid",
            justifyItems: "center",
            gap: "14px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "2px",
              height: "22px",
              background: "var(--text-muted)",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              width: "min(100%, 720px)",
              display: "grid",
              gap: "0",
              justifyItems: "stretch",
            }}
          >
            <div
              style={{
                height: "2px",
                background: "var(--text-muted)",
                width: "100%",
              }}
            />
            <div
              className="responsive-grid feature-grid"
              style={{
                width: "100%",
                gap: "12px",
                alignItems: "start",
              }}
            >
              {childNodes.map((item) => (
                <div
                  key={item}
                  style={{
                    display: "grid",
                    justifyItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: "2px",
                      height: "22px",
                      background: "var(--text-muted)",
                    }}
                  />
                  <div
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "1px solid #e5e5e5",
                      borderRadius: "10px",
                      background: "#fff",
                      fontSize: "clamp(15px, 3.6vw, 17px)",
                      lineHeight: 1.4,
                      fontWeight: 500,
                      color: "var(--card-text-primary)",
                    }}
                  >
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArchitecturePageContent() {
  const { lang } = useLanguage();
  const copy = COPY[lang];
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [canScrollTable, setCanScrollTable] = useState(false);
  const [canScrollTableRight, setCanScrollTableRight] = useState(false);
  const [hasScrolledTable, setHasScrolledTable] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsNarrowViewport(window.innerWidth <= 640);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const element = tableScrollRef.current;
    if (!element) return;

    const updateScrollState = () => {
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      setCanScrollTable(maxScrollLeft > 8);
      setCanScrollTableRight(element.scrollLeft < maxScrollLeft - 8);
      setHasScrolledTable(element.scrollLeft > 8);
    };

    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateScrollState())
        : null;
    resizeObserver?.observe(element);

    window.addEventListener("resize", updateScrollState);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  return (
    <main
      className="page-shell"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "900px",
      }}
    >
      <section style={{ marginBottom: "64px" }}>
        <p className="eyebrow content-narrow">{copy.eyebrow}</p>
        <h1 className="page-title content-narrow" style={{ marginBottom: "18px" }}>
          {copy.title}
        </h1>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)" }}
        >
          {copy.intro.map((paragraph) => (
            <p key={paragraph} style={{ margin: 0 }}>
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          {copy.corePrinciple.heading}
        </h2>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)", marginBottom: "24px" }}
        >
          <p style={{ margin: 0 }}>{copy.corePrinciple.questionIntro}</p>
          <p
            className="body-xl"
            style={{ margin: 0, color: "var(--text-primary)", fontWeight: 600 }}
          >
            {copy.corePrinciple.question}
          </p>
          <p style={{ margin: 0 }}>{copy.corePrinciple.body}</p>
        </div>
        <VerticalFlowDiagram
          title={copy.corePrinciple.diagramTitle}
          steps={copy.corePrinciple.diagramSteps}
        />
        <p
          className="body-large"
          style={{ marginTop: "24px", maxWidth: "760px", color: "var(--text-body)" }}
        >
          {copy.corePrinciple.conclusion}
        </p>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          {copy.analyticalModel.heading}
        </h2>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)", marginBottom: "24px" }}
        >
          <p style={{ margin: 0 }}>{copy.analyticalModel.intro}</p>
        </div>
        <VerticalFlowDiagram
          title={copy.analyticalModel.diagramTitle}
          steps={copy.analyticalModel.diagramSteps}
        />
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)", marginTop: "24px" }}
        >
          <p style={{ margin: 0 }}>{copy.analyticalModel.responsibility}</p>
          <p style={{ margin: 0 }}>{copy.analyticalModel.presentation}</p>
        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          {copy.deterministicFoundation.heading}
        </h2>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)", marginBottom: "24px" }}
        >
          {copy.deterministicFoundation.body.map((paragraph) => (
            <p key={paragraph} style={{ margin: 0 }}>
              {paragraph}
            </p>
          ))}
        </div>
        <ArchitectureDiagram
          title={copy.deterministicFoundation.diagramTitle}
          parentTop={copy.deterministicFoundation.parentTop}
          parentMiddle={copy.deterministicFoundation.parentMiddle}
          childNodes={copy.deterministicFoundation.childNodes}
        />
        <p
          className="body-large"
          style={{ marginTop: "24px", maxWidth: "760px", color: "var(--text-body)" }}
        >
          {copy.deterministicFoundation.conclusion}
        </p>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          {copy.analyticalScope.heading}
        </h2>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)" }}
        >
          {copy.analyticalScope.body.map((paragraph) => (
            <p key={paragraph} style={{ margin: 0 }}>
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          {copy.capabilities.heading}
        </h2>
        {isNarrowViewport && canScrollTable ? (
          <p
            className="eyebrow"
            style={{
              marginBottom: "12px",
              color: "var(--text-muted)",
              opacity: hasScrolledTable ? 0.55 : 1,
              transition: "opacity 180ms ease",
            }}
          >
            {copy.capabilities.swipeHint}
          </p>
        ) : null}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "12px",
          }}
        >
          <div
            ref={tableScrollRef}
            className="surface-card"
            style={{
              border: "1px solid #e5e5e5",
              background: "#fafafa",
              color: "var(--card-text-primary)",
              overflowX: "auto",
              overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              maxWidth: "100%",
            }}
          >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "620px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0 0 14px 0",
                    fontSize: "13px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--card-text-muted)",
                    verticalAlign: "top",
                  }}
                >
                  {copy.capabilities.designedTo}
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0 0 14px 24px",
                    fontSize: "13px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--card-text-muted)",
                    verticalAlign: "top",
                  }}
                >
                  {copy.capabilities.notDesignedTo}
                </th>
              </tr>
            </thead>
            <tbody>
              {copy.capabilities.rows.map(([designedTo, notDesignedTo]) => (
                <tr key={designedTo}>
                  <td
                    style={{
                      padding: "14px 24px 14px 0",
                      borderTop: "1px solid #e5e5e5",
                      color: "var(--card-text-body)",
                      verticalAlign: "top",
                      fontSize: "16px",
                      lineHeight: 1.65,
                    }}
                  >
                    {designedTo}
                  </td>
                  <td
                    style={{
                      padding: "14px 0 14px 24px",
                      borderTop: "1px solid #e5e5e5",
                      color: "var(--card-text-body)",
                      verticalAlign: "top",
                      fontSize: "16px",
                      lineHeight: 1.65,
                    }}
                  >
                    {notDesignedTo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {isNarrowViewport && canScrollTableRight ? (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: "28px",
                pointerEvents: "none",
                background:
                  "linear-gradient(to left, rgba(250, 250, 250, 0.96), rgba(250, 250, 250, 0))",
              }}
            />
          ) : null}
        </div>
      </section>
      <SiteCta />
    </main>
  );
}
