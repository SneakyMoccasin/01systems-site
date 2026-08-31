"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/language-context";

type Lang = "sv" | "en";
type Pair = [string, string];

const text = {
  en: {
    lead: "Deterministic decision analysis engine",
    verbs: ["Represent.", "Execute.", "Compare.", "Inspect."],
    spec: "Product specification",
    specs: [["Analysis type", "Deterministic"], ["Input", "Explicitly represented decision situations"], ["Output", "Structural comparison of configured alternatives"], ["Dependencies", "Explicitly represented"], ["Constraints", "Explicitly represented"], ["Shared capacities", "Supported when represented in the model"], ["Recommendation engine", "No"], ["Prediction", "No"], ["Human judgement", "Required"]] as Pair[],
    represents: "What the engine represents",
    representsIntro: "The analysis starts with a bounded representation of a specific decision situation.",
    represented: ["decisions and alternatives,", "dependencies between represented elements,", "constraints and activation conditions,", "shared capacities,", "drivers and configured effects,", "initial conditions and reviewable assumptions."],
    representedLimit: "Information not represented in the model is not part of the analysis.",
    configure: "How alternatives are configured",
    process: [["Bound the situation", "The organisation and 01 Systems define the decision situation to be represented."], ["Represent the model", "Decisions, alternatives, relationships, capacities, conditions and assumptions are made explicit."], ["Establish a shared basis", "Alternatives are configured so that differences can be compared consistently."], ["Execute the analysis", "Cascade Engine executes the configured model deterministically."]] as Pair[],
    processLimit: "The same represented inputs and assumptions produce the same analytical result. The engine does not decide which assumptions are true or which alternative is preferable.",
    workspace: "The analytical workspace",
    workspaceItems: ["configure represented model elements,", "select and compare configured alternatives,", "inspect calculated outputs,", "inspect completed deterministic findings."],
    workspaceCaption: "The workspace combines configuration, comparison, calculated outputs and deterministic presentation. All visible information is model-relative.",
    calculates: "What the engine calculates",
    calculatesIntro: "Cascade Engine executes the represented relationships in the configured model.",
    outputs: ["structural margin throughout the analysis period,", "changes in represented constraint states,", "differences between configured alternatives,", "development of represented drivers over time,", "traceable analytical findings from the configured model."],
    outputsLimit: "The outputs describe the configured representation. They do not establish real-world causality.",
    margin: "Structural Margin",
    marginItems: ["shows development throughout the modelled analysis period,", "compares margin histories for configured alternatives,", "shows represented constraint windows and model steps."],
    marginCaption: "A displayed window or model step is not an exact prediction of when a real-world constraint will activate.",
    findings: "Structural Findings",
    findingsItems: ["organises results already calculated,", "shows represented drivers and constraints,", "shows traceable propagation paths,", "does not use a language model."],
    findingsLimit: "Structural Findings does not perform a second analysis or discover real-world causes.",
    consequences: "Structural Consequences",
    consequenceItems: ["when represented effects begin to propagate through the configured model,", "how structural margin changes over the represented analysis period,", "how forward decision flexibility develops,", "how configured alternatives differ over time."],
    consequencesAlt: "Cascade Engine view showing when represented effects begin to appear, demand response, margins, forward decision flexibility, goal progress and decision effect.",
    boundaries: "Product boundaries",
    boundaryIntro: "Cascade Engine does not:",
    boundaryItems: ["predict future events,", "determine which assumptions are correct,", "discover causal relationships automatically,", "optimise decisions,", "recommend a preferred alternative,", "replace domain expertise or executive judgement."],
    quality: "Analysis quality depends on the represented model and its reviewed assumptions.",
    human: "Human responsibility",
    organisation: "The organisation",
    orgItems: ["provides domain expertise,", "defines decisions and alternatives,", "reviews assumptions,", "validates modelled relationships."],
    engineItems: ["executes the model deterministically,", "compares alternatives consistently,", "calculates configured effects,", "presents analytical results structurally."],
    judgement: "Executive judgement remains a human responsibility.",
    relationship: "Relationship to Decision Space Analytics",
    dsa: "Defines the analytical question and principles.",
    ce: "Represents, executes, compares and makes configured alternatives inspectable.",
    architecture: "Formal analytical responsibilities, modelling principles and deterministic boundaries.",
    architectureLink: "Explore Product Architecture",
    cta: "Discuss a concrete decision situation",
    ctaIntro: "An initial conversation begins with one bounded decision situation.",
    ctaBody: "Together, we assess whether its decisions, alternatives, dependencies, constraints and assumptions can be represented clearly for an initial analysis.",
    ctaButton: "Book an initial conversation",
    ctaNote: "No extensive preparation or complete data collection is required before the first conversation.",
  },
  sv: {
    lead: "Deterministisk motor för beslutsanalys",
    verbs: ["Representera.", "Köra.", "Jämföra.", "Granska."],
    spec: "Produktspecifikation",
    specs: [["Analystyp", "Deterministisk"], ["Indata", "Uttryckligen representerade beslutssituationer"], ["Resultat", "Strukturell jämförelse av konfigurerade alternativ"], ["Beroenden", "Uttryckligen representerade"], ["Begränsningar", "Uttryckligen representerade"], ["Gemensamma kapaciteter", "Stöds när de representeras i modellen"], ["Rekommendationsmotor", "Nej"], ["Prediktion", "Nej"], ["Mänskligt omdöme", "Krävs"]] as Pair[],
    represents: "Vad motorn representerar", representsIntro: "Analysen utgår från en avgränsad representation av en specifik beslutssituation.", represented: ["beslut och alternativ,", "beroenden mellan representerade element,", "begränsningar och villkor för aktivering,", "gemensamma kapaciteter,", "drivkrafter och konfigurerade effekter,", "initiala förutsättningar och granskbara antaganden."], representedLimit: "Information som inte representeras i modellen ingår inte i analysen.",
    configure: "Hur alternativen konfigureras", process: [["Avgränsa situationen", "Organisationen och 01 Systems definierar vilken beslutssituation som ska representeras."], ["Representera modellen", "Beslut, alternativ, samband, kapaciteter, villkor och antaganden görs uttryckliga."], ["Skapa en gemensam grund", "Alternativen konfigureras så att skillnader kan jämföras konsekvent."], ["Kör analysen", "Cascade Engine kör den konfigurerade modellen deterministiskt."]] as Pair[], processLimit: "Samma representerade indata och antaganden ger samma analytiska resultat. Motorn avgör inte vilka antaganden som är sanna eller vilket alternativ som är att föredra.",
    workspace: "Den analytiska arbetsytan", workspaceItems: ["konfigurera modellens representerade element,", "välja och jämföra konfigurerade alternativ,", "granska beräknade resultat,", "granska färdiga deterministiska fynd."], workspaceCaption: "Arbetsytan samlar konfiguration, jämförelse, beräknade resultat och deterministisk presentation. All synlig information är modellrelativ.",
    calculates: "Vad motorn beräknar", calculatesIntro: "Cascade Engine kör de representerade sambanden i den konfigurerade modellen.", outputs: ["strukturell marginal genom analysperioden,", "förändringar i representerade begränsningstillstånd,", "skillnader mellan konfigurerade alternativ,", "utveckling av representerade drivkrafter över tid,", "spårbara analytiska fynd från den konfigurerade modellen."], outputsLimit: "Resultaten beskriver den konfigurerade representationen. De fastställer inte verkliga orsakssamband.",
    margin: "Strukturell marginal", marginItems: ["visar utvecklingen under den modellerade analysperioden,", "jämför marginalhistorik för konfigurerade alternativ,", "visar representerade begränsningsfönster och modellsteg."], marginCaption: "Ett visat fönster eller modellsteg är inte en exakt förutsägelse av när en verklig begränsning kommer att aktiveras.",
    findings: "Strukturella fynd", findingsItems: ["organiserar redan beräknade resultat,", "visar representerade drivkrafter och begränsningar,", "visar spårbara spridningsvägar,", "använder ingen språkmodell."], findingsLimit: "Structural Findings genomför inte en ny analys och upptäcker inte verkliga orsaker.",
    consequences: "Strukturella konsekvenser", consequenceItems: ["när representerade effekter börjar spridas genom den konfigurerade modellen,", "hur strukturell marginal förändras under den representerade analysperioden,", "hur framtida beslutsflexibilitet utvecklas,", "hur konfigurerade alternativ skiljer sig över tid."], consequencesAlt: "Cascade Engine-vy som visar när representerade effekter börjar framträda, efterfrågerespons, marginaler, framtida beslutsflexibilitet, målutveckling och beslutseffekt.",
    boundaries: "Produktens gränser", boundaryIntro: "Cascade Engine:", boundaryItems: ["förutsäger inte framtida händelser,", "avgör inte vilka antaganden som är korrekta,", "upptäcker inte orsakssamband automatiskt,", "optimerar inte beslut,", "rekommenderar inte ett föredraget alternativ,", "ersätter inte domänkunskap eller ledningens omdöme."], quality: "Analysens kvalitet beror på den representerade modellen och dess granskade antaganden.",
    human: "Mänskligt ansvar", organisation: "Organisationen", orgItems: ["bidrar med domänkunskap,", "definierar beslut och alternativ,", "granskar antaganden,", "validerar modellerade samband."], engineItems: ["kör modellen deterministiskt,", "jämför alternativ konsekvent,", "beräknar konfigurerade effekter,", "presenterar analysresultat strukturerat."], judgement: "Ledningens omdöme förblir ett mänskligt ansvar.",
    relationship: "Relationen till Decision Space Analytics", dsa: "Definierar den analytiska frågan och principerna.", ce: "Representerar, kör, jämför och gör konfigurerade alternativ granskningsbara.", architecture: "Formella analytiska ansvarsområden, modelleringsprinciper och deterministiska gränser.", architectureLink: "Utforska Product Architecture",
    cta: "Diskutera en konkret beslutssituation", ctaIntro: "Ett inledande samtal börjar med en avgränsad beslutssituation.", ctaBody: "Tillsammans bedömer vi om dess beslut, alternativ, beroenden, begränsningar och antaganden kan representeras tydligt för en första analys.", ctaButton: "Boka ett inledande samtal", ctaNote: "Ingen omfattande förberedelse eller fullständig datainsamling krävs inför det första samtalet.",
  },
};

function Bullets({ items }: { items: string[] }) { return <ul className="bullet-list body-large cascade-product-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="cascade-product-section"><h2 className="section-title">{title}</h2>{children}</section>; }

export function CascadeEnginePageContent() {
  const { lang } = useLanguage();
  const copy = text[lang];
  return <main className="page-shell cascade-product-page">
    <section className="cascade-product-hero"><p className="eyebrow">01 Systems · Cascade Engine</p><h1 className="page-title">Cascade Engine</h1><p className="body-xl cascade-product-lead">{copy.lead}</p><ul className="cascade-product-verbs">{copy.verbs.map(v => <li key={v}>{v}</li>)}</ul></section>
    <section className="cascade-product-specification"><h2 className="section-title">{copy.spec}</h2><dl className="cascade-specification-list">{copy.specs.map(([label,value]) => <div className="cascade-specification-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <Section title={copy.represents}><p className="body-large cascade-product-intro">{copy.representsIntro}</p><Bullets items={copy.represented}/><p className="body-large cascade-product-conclusion">{copy.representedLimit}</p></Section>
    <Section title={copy.configure}><ol className="cascade-process-list">{copy.process.map(([title,body]) => <li key={title}><strong>{title}</strong><span>{body}</span></li>)}</ol><p className="body-large cascade-product-boundary">{copy.processLimit}</p></Section>
    <Section title={copy.workspace}><Bullets items={copy.workspaceItems}/></Section>
    <Section title={copy.calculates}><p className="body-large cascade-product-intro">{copy.calculatesIntro}</p><Bullets items={copy.outputs}/><p className="body-large cascade-product-conclusion">{copy.outputsLimit}</p></Section>
    <Section title={copy.margin}><Bullets items={copy.marginItems}/><figure className="cascade-product-figure"><Image src="/images/cascade-engine-structural-margin.png" alt={copy.margin} width={1500} height={1044} sizes="(max-width: 900px) 100vw, 900px"/><figcaption className="cascade-product-caption">{copy.marginCaption}</figcaption></figure></Section>
    <Section title={copy.findings}><div className="cascade-findings-figure"><figure className="cascade-product-figure"><Image src="/images/cascade-engine-structural-findings.png" alt={copy.findings} width={398} height={848} sizes="(max-width: 640px) 100vw, 398px"/></figure><div className="cascade-findings-description"><Bullets items={copy.findingsItems}/><p className="body-large cascade-product-conclusion">{copy.findingsLimit}</p></div></div></Section>
    <Section title={copy.consequences}><Bullets items={copy.consequenceItems}/><figure className="cascade-product-figure cascade-product-consequences-figure"><Image src="/images/cascade-engine-propagation-results.png" alt={copy.consequencesAlt} width={396} height={677} sizes="(max-width: 440px) calc(100vw - 48px), 396px"/></figure></Section>
    <Section title={copy.boundaries}><p className="body-large cascade-product-intro">{copy.boundaryIntro}</p><Bullets items={copy.boundaryItems}/><p className="body-large cascade-product-conclusion">{copy.quality}</p></Section>
    <Section title={copy.human}><div className="cascade-responsibility-groups"><div><h3>{copy.organisation}</h3><Bullets items={copy.orgItems}/></div><div><h3>Cascade Engine</h3><Bullets items={copy.engineItems}/></div></div><p className="body-large cascade-product-conclusion">{copy.judgement}</p></Section>
    <Section title={copy.relationship}><dl className="cascade-relationship-list"><div><dt>Decision Space Analytics</dt><dd>{copy.dsa}</dd></div><div><dt>Cascade Engine</dt><dd>{copy.ce}</dd></div></dl></Section>
    <Section title="Product Architecture"><p className="body-large cascade-product-intro">{copy.architecture}</p><Link href="/architecture" className="touch-link cascade-product-inline-link">{copy.architectureLink}</Link></Section>
    <section className="surface-card cascade-product-cta"><h2 className="section-title">{copy.cta}</h2><div className="body-large cascade-product-copy"><p>{copy.ctaIntro}</p><p>{copy.ctaBody}</p><a href="mailto:christian@01systems.se" className="touch-button cascade-product-cta-button">{copy.ctaButton}</a><p className="cascade-product-supporting-text">{copy.ctaNote}</p></div></section>
  </main>;
}
