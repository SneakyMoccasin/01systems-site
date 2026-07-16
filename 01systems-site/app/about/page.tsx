"use client";

import { useLanguage } from "@/components/language-context";

export default function AboutPage() {
  const { lang } = useLanguage();
  const isSwedish = lang === "sv";

  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "60px 16px",
        maxWidth: "900px",
        margin: "0 auto",
        lineHeight: 1.6,
      }}
    >
      <section style={{ marginBottom: "48px" }}>
        <p
          style={{
            fontSize: "13px",
            color: "#666",
            marginBottom: "14px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            maxWidth: "760px",
          }}
        >
          01 Systems
        </p>
        <h1 style={{ fontSize: "42px", lineHeight: 1.15, marginBottom: "20px", maxWidth: "760px" }}>
          {isSwedish ? "Om" : "About"}
        </h1>
      </section>

      <section style={{ marginBottom: "48px", maxWidth: "760px", color: "#555", fontSize: "18px", lineHeight: 1.65 }}>
        <p style={{ marginBottom: "18px" }}>
          {isSwedish
            ? "01 Systems bygger programvara för Decision Space Analytics."
            : "01 Systems is building software for Decision Space Analytics."}
        </p>
        <p style={{ marginBottom: "18px" }}>
          {isSwedish
            ? "Decision Space Analytics finns för att hjälpa organisationer att undersöka en fråga som vanliga projekt-, portfölj- och riskverktyg sällan besvarar direkt: vilka framtida beslut som fortfarande är öppna efter att dagens beslut har fattats."
            : "Decision Space Analytics exists to help organizations examine a question that ordinary project, portfolio and risk tools rarely answer directly: which future decisions remain open after today's decisions have been made."}
        </p>
        <p style={{ marginBottom: "18px" }}>
          {isSwedish
            ? "Cascade Engine skapades för att göra den analysen praktisk. Programvaran hjälper till att jämföra beslut, sekvenser, beroenden och begränsningar så att ledningsgrupper kan se hur olika vägval omformar framtida möjligheter över tid."
            : "Cascade Engine was created to make that analysis practical. The software helps compare decisions, sequences, dependencies and constraints so that leadership teams can see how different paths reshape future possibilities over time."}
        </p>
        <p style={{ marginBottom: 0 }}>
          {isSwedish
            ? "Analyser genomförs tillsammans med kundernas egna beslutsfattare och domänexperter, med deras verkliga beslut, antaganden och begränsningar som grund för arbetet."
            : "Analyses are carried out together with customers' own decision-makers and domain experts, using their real decisions, assumptions and constraints as the basis for the work."}
        </p>
      </section>

      <section
        style={{
          maxWidth: "760px",
          padding: "30px",
          border: "1px solid #e5e5e5",
          borderRadius: "12px",
          background: "#fafafa",
        }}
      >
        <h2 style={{ fontSize: "22px", marginBottom: "10px", lineHeight: 1.3, fontWeight: 600 }}>
          {isSwedish ? "Boka en genomgång" : "Book a walkthrough"}
        </h2>
        <p style={{ color: "#666", marginBottom: "20px", maxWidth: "640px" }}>
          {isSwedish
            ? "Ta med ett verkligt besluts- eller investeringsfall. Vi visar hur Cascade Engine stödjer Decision Space Analytics och hur arbetet genomförs tillsammans med ert team."
            : "Bring a real decision or investment question. We'll show how Cascade Engine supports Decision Space Analytics and how the work is carried out together with your team."}
        </p>
        <a
          href="mailto:christian@01systems.se"
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
