"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { CASCADE_ENGINE_MEDIA } from "@/components/cascade-engine-media";
import { useLanguage } from "@/components/language-context";
import {
  PRIMARY_CTA_COPY,
  PRIMARY_CTA_DESTINATION,
} from "@/components/primary-cta-content";

type LocalizedCopy = {
  en: string;
  sv: string;
};

function localized(lang: "sv" | "en", copy: LocalizedCopy) {
  return copy[lang];
}

const chapterSpacing = { marginBottom: "72px" } as const;
const bodyStack = {
  maxWidth: "700px",
  color: "var(--text-body)",
} as const;

export function ExecutiveHomePageContent() {
  const { lang } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyMotionPreference = () => {
      const video = videoRef.current;
      if (!video) return;

      if (mediaQuery.matches) {
        video.pause();
        return;
      }

      void video.play().catch(() => {
        // Autoplay can still be blocked by browser policy. The muted first frame remains visible.
      });
    };

    applyMotionPreference();
    mediaQuery.addEventListener("change", applyMotionPreference);
    return () => mediaQuery.removeEventListener("change", applyMotionPreference);
  }, []);

  const isSwedish = lang === "sv";
  const media = CASCADE_ENGINE_MEDIA[lang];
  const primaryCta = PRIMARY_CTA_COPY[lang];

  return (
    <main
      className="page-shell executive-homepage"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "900px",
      }}
    >
      <section className="executive-hero" style={{ marginBottom: 0 }}>
        <h1 className="page-title content-narrow executive-hero-title" style={{ marginBottom: "28px", maxWidth: "780px" }}>
          {localized(lang, {
            en: "We've all seen organisations gradually limit their future options.",
            sv: "Vi har alla sett organisationer gradvis begränsa sitt framtida handlingsutrymme.",
          })}
        </h1>
        <div className="body-large stack-lg" style={bodyStack}>
          <p style={{ margin: 0 }}>
            {localized(lang, {
              en: "Not through one decision—but through many individually reasonable decisions.",
              sv: "Inte genom ett enda beslut, utan genom många individuellt rimliga beslut.",
            })}
          </p>
          <p className="body-xl" style={{ margin: 0, color: "var(--text-primary)", fontWeight: 600 }}>
            {localized(lang, {
              en: "What if that loss of future flexibility could be understood while meaningful alternatives still remained?",
              sv: "Tänk om den förändringen kunde förstås medan meningsfulla alternativ fortfarande fanns kvar?",
            })}
          </p>
          <p style={{ margin: 0 }}>
            {localized(lang, {
              en: "That is exactly the kind of decision situation Cascade Engine is designed to analyse.",
              sv: "Det är precis den typen av beslutssituation Cascade Engine är byggd för att analysera.",
            })}
          </p>
        </div>
      </section>

      <section id="demonstration" style={chapterSpacing}>
        <h2 className="section-title">
          {isSwedish
            ? "Se hur en strukturerad beslutssituation kan representeras och jämföras."
            : "See how a structured decision situation can be represented and compared."}
        </h2>
        <div className="body-large stack-lg" style={bodyStack}>
          <p style={{ margin: 0 }}>
            {isSwedish
              ? "Exemplet nedan visar hur två konfigurerade beslutssituationer kan modelleras och analyseras."
              : "The example below illustrates how two configured decision situations can be modelled and analysed."}
          </p>
          <p style={{ margin: 0 }}>{isSwedish ? "Syftet är inte att förutsäga framtiden." : "Its purpose is not to predict the future."}</p>
          <p style={{ margin: 0 }}>
            {isSwedish
              ? "Det visar hur en strukturerad jämförelse kan göras utifrån information som uttryckligen har representerats i modellen."
              : "It shows how a structured comparison can be made from information explicitly represented in the model."}
          </p>
        </div>
        <div className="full-bleed-media">
          <video
            key={lang}
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={media.interfacePreview.src}
            className="rounded-media"
            aria-label={isSwedish ? "Autospelande demonstration av Cascade Engine" : "Autoplaying Cascade Engine demonstration"}
          >
            <source src={media.demoVideo} type="video/mp4" />
          </video>
        </div>
      </section>

      <section style={chapterSpacing}>
        <h2 className="section-title">{isSwedish ? "Vad det här exemplet visar" : "What this showcase demonstrates"}</h2>
        <div className="body-large stack-lg" style={bodyStack}>
          <p style={{ margin: 0 }}>
            {isSwedish
              ? "Exemplet visar en strukturerad jämförelse mellan två modellerade beslutssituationer."
              : "This showcase illustrates a structured comparison between two modelled decision situations."}
          </p>
          <p style={{ margin: 0 }}>
            {isSwedish
              ? "Cascade Engine synliggör skillnader mellan alternativen utifrån de beslut, beroenden och begränsningar som uttryckligen har representerats i modellen."
              : "Cascade Engine makes differences between the alternatives visible based on the decisions, dependencies and constraints explicitly represented in the model."}
          </p>
        </div>

        <h3 style={{ fontSize: "20px", lineHeight: 1.3, margin: "32px 0 16px" }}>
          {isSwedish ? "Cascade Engines gränssnitt" : "Cascade Engine interface"}
        </h3>
        <div className="full-bleed-media" style={{ marginTop: "16px" }}>
          <Image
            src={media.interfacePreview.src}
            alt={isSwedish ? "Gränssnittsvy från Cascade Engine" : "Cascade Engine interface view"}
            width={media.interfacePreview.width}
            height={media.interfacePreview.height}
            className="rounded-media"
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      </section>

      <section style={chapterSpacing}>
        <h2 className="section-title">{isSwedish ? "Vad Cascade Engine gör" : "What Cascade Engine does"}</h2>
        <div className="body-large product-information" style={bodyStack}>
          <div className="product-information-group">
            <p>
              {isSwedish
                ? "Cascade Engine är en deterministisk analysmotor för beslutssituationer där flera beslut, beroenden och begränsningar är strukturellt sammankopplade."
                : "Cascade Engine is a deterministic analysis engine for decision situations where multiple decisions, dependencies and constraints are structurally connected."}
            </p>
            <p>
              {isSwedish
                ? "Motorn jämför uttryckligen konfigurerade alternativ och visar hur deras strukturella förutsättningar skiljer sig över tid. Skillnaderna ger underlag för att förstå hur organisationens framtida handlingsutrymme kan påverkas inom den representerade modellen."
                : "The engine compares explicitly configured alternatives and shows how their structural conditions differ over time. Those differences provide insight into how the organisation’s future room to act may be affected within the represented model."}
            </p>
            <p>
              {isSwedish
                ? "Inom en konfigurerad modell kan Cascade Engine jämföra samma startförhållanden och åtgärder i olika ordning eller vid olika tidpunkter och visa var de modellerade vägarna skiljer sig och om de senare konvergerar."
                : "Within a configured model, Cascade Engine can compare the same starting conditions and actions in different orders or at different times, showing where the modelled paths diverge and whether they later converge."}
            </p>
          </div>
          <div className="product-information-group">
            <p className="product-list-intro">{isSwedish ? "Den kan synliggöra:" : "It can make visible:"}</p>
            <ul className="bullet-list executive-product-list">
              <li>{isSwedish ? "när representerade begränsningar aktiveras," : "when represented constraints become active,"}</li>
              <li>{isSwedish ? "hur gemensamma kapaciteter skiljer sig mellan konfigurerade alternativ," : "how shared capacities differ across configured alternatives,"}</li>
              <li>{isSwedish ? "vilka beroenden, begränsningar och drivkrafter som bidrar till skillnaderna," : "which dependencies, constraints and drivers contribute to the differences,"}</li>
              <li>{isSwedish ? "och hur alternativens strukturella förutsättningar utvecklas över tid." : "and how the structural conditions of the alternatives develop over time."}</li>
            </ul>
          </div>
          <div className="product-information-group product-boundaries">
            <p>{isSwedish ? "Cascade Engine förutser inte organisationens framtida utfall." : "Cascade Engine does not predict organisational outcomes."}</p>
            <p>{isSwedish ? "Den avgör inte vilket beslut som är rätt." : "It does not determine which decision is correct."}</p>
          </div>
          <p className="product-judgement">
            {isSwedish
              ? "Den ger ett strukturerat underlag för ledningens diskussion och bedömning innan viktiga åtaganden görs."
              : "It provides a structured basis for executive discussion and judgement before important commitments are made."}
          </p>
        </div>
      </section>

      <section style={chapterSpacing}>
        <div className="responsive-grid feature-grid" style={{ gap: "24px" }}>
          <div className="surface-card" style={{ border: "1px solid #e5e5e5", background: "#fff", color: "var(--card-text-primary)" }}>
            <h2 className="section-title">{isSwedish ? "Vad ni bidrar med" : "What you provide"}</h2>
            <div className="product-card-lead">
              <p className="body-xl" style={{ color: "var(--card-text-primary)", fontWeight: 600 }}>
                {isSwedish ? "Ni börjar inte med ett omfattande dataintegrationsprojekt." : "You don’t start with a large data-integration project."}
              </p>
              <p className="body-xl" style={{ color: "var(--card-text-primary)", fontWeight: 600 }}>
                {isSwedish ? "Ni börjar med en beslutssituation." : "You start with a decision situation."}
              </p>
            </div>
            <div className="product-card-content" style={{ color: "var(--card-text-body)" }}>
              <div className="product-information-group">
                <p>{isSwedish ? "Varje modell utvecklas tillsammans med organisationen." : "Every model is developed together with the organisation."}</p>
                <p>{isSwedish ? "Organisationen bidrar med domänkunskapen. Cascade Engine bidrar med den analytiska strukturen." : "The organisation provides domain expertise. Cascade Engine provides the analytical structure."}</p>
                <p>
                  {isSwedish
                    ? "Relevanta beslut, alternativ, beroenden, begränsningar, kapaciteter och antaganden identifieras och granskas innan alternativen analyseras."
                    : "Relevant decisions, alternatives, dependencies, constraints, capacities and assumptions are identified and reviewed before the alternatives are analysed."}
                </p>
              </div>
              <div className="product-information-group">
                <p className="product-list-intro">{isSwedish ? "Analysen börjar vanligtvis med:" : "Typically, the analysis begins with:"}</p>
                <ul className="bullet-list executive-product-list">
                  <li>{isSwedish ? "viktiga beslut som fortfarande är öppna," : "important decisions that are still open,"}</li>
                  <li>{isSwedish ? "realistiska alternativ," : "realistic alternatives,"}</li>
                  <li>{isSwedish ? "relevanta beroenden," : "relevant dependencies,"}</li>
                  <li>{isSwedish ? "representerade begränsningar," : "represented constraints,"}</li>
                  <li>{isSwedish ? "gemensamma kapaciteter," : "shared capacities,"}</li>
                  <li>{isSwedish ? "antaganden som kan granskas tillsammans med domänexperter." : "assumptions that can be reviewed with domain experts."}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="surface-card" style={{ border: "1px solid #e5e5e5", background: "#fff", color: "var(--card-text-primary)" }}>
            <h2 className="section-title">{isSwedish ? "Vad ni får tillbaka" : "What you receive"}</h2>
            <div className="product-card-content" style={{ color: "var(--card-text-body)" }}>
              <div className="product-information-group">
                <p className="product-list-intro">{isSwedish ? "Analysen ger:" : "The analysis provides:"}</p>
                <ul className="bullet-list executive-product-list">
                  <li>{isSwedish ? "en strukturerad representation av er beslutssituation," : "a structured representation of your decision situation,"}</li>
                  <li>{isSwedish ? "en jämförelse mellan alternativa beslutsstrukturer," : "a comparison of alternative decision structures,"}</li>
                  <li>{isSwedish ? "synlighet i representerade beroenden och begränsningar," : "visibility into represented dependencies and constraints,"}</li>
                  <li>{isSwedish ? "en förklaring av vilka modellerade faktorer som bidrar till skillnaderna," : "an explanation of which modelled factors contribute to the differences,"}</li>
                  <li>{isSwedish ? "ett strukturerat underlag för ledningens diskussion." : "a structured basis for executive discussion."}</li>
                </ul>
              </div>
              <div className="product-responsibility">
                <p>{isSwedish ? "Analysen ger ett underlag för diskussion – inte en rekommendation om vilket beslut som ska fattas." : "The analysis provides a basis for discussion—not a recommended decision."}</p>
                <p>{isSwedish ? "Det slutliga omdömet och beslutet förblir ett mänskligt ansvar." : "Executive judgement remains a human responsibility."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={chapterSpacing}>
        <h2 className="section-title">{isSwedish ? "Varför den här analysen ställer en annan fråga" : "Why this analysis asks a different question"}</h2>
        <div className="body-large stack-lg" style={bodyStack}>
          <p style={{ margin: 0 }}>
            {isSwedish
              ? "Varje analysansats börjar med att avgöra vilken fråga analysen är byggd för att besvara."
              : "Every analytical approach begins by deciding which question it is trying to answer."}
          </p>
          <p style={{ margin: 0 }}>{isSwedish ? "Decision Space Analytics utgår från frågan:" : "Decision Space Analytics begins with this question:"}</p>
          <p className="body-xl" style={{ margin: 0, color: "var(--text-primary)", fontWeight: 600 }}>
            {isSwedish ? "Hur förändrar dagens beslut vad som fortfarande är möjligt senare?" : "How do today’s decisions change what remains possible later?"}
          </p>
          <p style={{ margin: 0 }}>
            {isSwedish
              ? "I stället för att börja med förutsagda utfall undersöker Decision Space Analytics hur uttryckligen representerade beslut, beroenden, begränsningar och kapaciteter förändrar vad som fortfarande är möjligt inom varje modellerat alternativ."
              : "Rather than beginning with predicted outcomes, Decision Space Analytics examines how explicitly represented decisions, dependencies, constraints and capacities reshape what remains possible within each modelled alternative."}
          </p>
          <p style={{ margin: 0 }}>{isSwedish ? "Decision Space Analytics definierar den analytiska frågan och principerna." : "Decision Space Analytics defines the analytical question and principles."}</p>
          <p style={{ margin: 0 }}>{isSwedish ? "Cascade Engine tillhandahåller den strukturerade representationen, jämförelsen och analysen." : "Cascade Engine provides the structured representation, comparison and analysis."}</p>
          <div style={{ display: "grid", gap: "10px", marginTop: "24px" }}>
            <Link href="/insights" className="touch-link executive-reference-link">{isSwedish ? "Läs Foundation-serien →" : "Read the Foundation Series →"}</Link>
            <Link href="/architecture" className="touch-link executive-reference-link">{isSwedish ? "Utforska Product Architecture →" : "Explore the Product Architecture →"}</Link>
          </div>
        </div>
      </section>

      <section className="surface-card" style={{ marginBottom: "28px", border: "1px solid #e5e5e5", background: "#fafafa", color: "var(--card-text-primary)" }}>
        <p className="body-large" style={{ marginTop: 0, color: "var(--card-text-body)" }}>
          {isSwedish
            ? "Det första steget är inte att förstå hela det analytiska ramverket."
            : "Understanding the complete analytical framework is not the first step."}
        </p>
        <p className="body-xl" style={{ marginBottom: 0, fontWeight: 600 }}>
          {isSwedish ? "Det första steget är att förstå en konkret beslutssituation." : "The first step is understanding one concrete decision situation."}
        </p>
      </section>

      <section style={chapterSpacing}>
        <h2 className="section-title">{isSwedish ? "En första pilot är medvetet liten." : "A first pilot is intentionally small."}</h2>
        <div className="body-large stack-lg" style={bodyStack}>
          <p style={{ margin: 0 }}>
            {isSwedish
              ? "En pilot fokuserar på en konkret beslutssituation – inte hela organisationen."
              : "A pilot focuses on one concrete decision situation—not the entire organisation."}
          </p>
          <p style={{ margin: 0 }}>{isSwedish ? "Typisk omfattning:" : "Typical scope:"}</p>
          <ul className="bullet-list executive-pilot-scope-list">
            <li>2–4 workshops</li>
            <li>{isSwedish ? "cirka 10–30 representerade initiativ" : "approximately 10–30 represented initiatives"}</li>
            <li>{isSwedish ? "beslutsägare och domänexperter" : "decision owners and domain experts"}</li>
            <li>{isSwedish ? "inget stort dataintegrationsprojekt" : "no large data-integration project"}</li>
            <li>{isSwedish ? "ett strukturerat analysunderlag" : "structured analytical deliverables"}</li>
          </ul>
        </div>
      </section>

      <section id="conversation" className="surface-card" style={{ marginBottom: "64px", border: "1px solid #e5e5e5", background: "#fafafa", color: "var(--card-text-primary)" }}>
        <h2 className="section-title">{primaryCta.heading}</h2>
        <div className="body-large stack-lg" style={{ maxWidth: "700px", color: "var(--card-text-body)" }}>
          <p style={{ margin: 0 }}>{primaryCta.supportingText}</p>
          <a
            href={PRIMARY_CTA_DESTINATION}
            className="touch-button"
            style={{
              width: "fit-content",
              padding: "14px 22px",
              background: "#000",
              color: "#fff",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "16px",
            }}
          >
            {primaryCta.button}
          </a>
        </div>
      </section>
    </main>
  );
}
