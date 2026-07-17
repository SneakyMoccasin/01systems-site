"use client";

import { useLanguage } from "@/components/language-context";

export function AboutPageContent() {
  const { lang } = useLanguage();
  const isSwedish = lang === "sv";

  return (
    <main
      className="page-shell"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "900px",
      }}
    >
      <section style={{ marginBottom: "48px" }}>
        <p className="eyebrow content-narrow">01 Systems</p>
        <h1 className="page-title content-narrow">{isSwedish ? "Om" : "About"}</h1>
      </section>

      <section
        className="body-large stack-lg"
        style={{ marginBottom: "48px", maxWidth: "760px", color: "var(--text-body)" }}
      >
        <p style={{ margin: 0 }}>
          {isSwedish
            ? "Jag började inte med ambitionen att bygga en ny analysplattform."
            : "I didn’t set out to build a new analytics platform."}
        </p>
        <p style={{ margin: 0 }}>
          {isSwedish
            ? "Jag började med en fråga som jag inte kunde släppa:"
            : "I started with a question I couldn’t stop thinking about:"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>
            {isSwedish
              ? "Hur förändrar dagens beslut vilka beslut som fortfarande är möjliga i morgon?"
              : "How do today’s decisions change which decisions are still possible tomorrow?"}
          </strong>
        </p>
        <p style={{ margin: 0 }}>
          {isSwedish
            ? "När jag försökte besvara den upptäckte jag att det fanns gott om verktyg för att analysera projekt, risker, kostnader och utfall – men inget praktiskt sätt att analysera hur beslut steg för steg förändrar en organisations framtida handlingsutrymme."
            : "As I tried to answer it, I found that there were many tools for analysing projects, risks, costs and outcomes — but no practical way to analyse how decisions gradually reshape an organisation’s future decision space."}
        </p>
        <p style={{ margin: 0 }}>
          {isSwedish
            ? "Det var utgångspunkten för Cascade Engine."
            : "That became the starting point for Cascade Engine."}
        </p>
        <p style={{ margin: 0 }}>
          {isSwedish ? "Idén bygger på en enkel observation: " : "The idea is built on a simple observation: "}
          <strong>
            {isSwedish
              ? "individuellt rimliga beslut, fattade i en viss ordning, kan gradvis stänga dörrar som ingen medvetet valde att stänga."
              : "individually reasonable decisions, made in a particular sequence, can gradually close doors that no one consciously chose to close."}
          </strong>
        </p>
        <p style={{ margin: 0 }}>
          {isSwedish
            ? "Sedan dess har metoden utvecklats genom återkommande diskussioner med personer som arbetar med riskhantering, systemtänkande och komplexa program, samtidigt som den omsatts i en praktisk programvara för Decision Space Analytics."
            : "Since then, the method has been developed through recurring discussions with people working in risk management, systems thinking and complex programmes, while also being translated into practical software for Decision Space Analytics."}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Christian Strandek</strong>
          <br />
          Founder, 01 Systems
          <br />
          Creator of Decision Space Analytics
        </p>
      </section>

      <section
        className="surface-card"
        style={{
          maxWidth: "760px",
          border: "1px solid #e5e5e5",
          borderRadius: "12px",
          background: "#fafafa",
          color: "var(--card-text-primary)",
        }}
      >
        <h2 className="section-title" style={{ marginBottom: "10px" }}>
          {isSwedish ? "Boka en genomgång" : "Book a walkthrough"}
        </h2>
        <p style={{ color: "var(--card-text-body)", marginBottom: "20px", maxWidth: "640px" }}>
          {isSwedish
            ? "Ta med ett verkligt besluts- eller investeringsfall. Vi visar hur Cascade Engine stödjer Decision Space Analytics och hur arbetet genomförs tillsammans med ert team."
            : "Bring a real decision or investment question. We'll show how Cascade Engine supports Decision Space Analytics and how the work is carried out together with your team."}
        </p>
        <a
          href="mailto:christian@01systems.se"
          className="touch-link"
          style={{
            display: "inline-block",
            padding: "14px 22px",
            background: "#000",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "16px",
          }}
        >
          {isSwedish ? "Boka en genomgång" : "Book a walkthrough"}
        </a>
      </section>
    </main>
  );
}
