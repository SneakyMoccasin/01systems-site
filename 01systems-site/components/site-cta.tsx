"use client";

import { useLanguage } from "@/components/language-context";

export function SiteCta() {
  const { lang } = useLanguage();

  return (
    <section
      className="surface-card"
      style={{
        marginTop: "60px",
        border: "1px solid #e5e5e5",
        borderRadius: "12px",
        background: "#fafafa",
        color: "var(--card-text-primary)",
      }}
    >
      <h2 className="section-title" style={{ marginBottom: "10px" }}>
        {lang === "sv"
          ? "Har ni ett beslut som är svårt att överblicka?"
          : "Do you have a decision that's difficult to evaluate?"}
      </h2>

      <p style={{ color: "var(--card-text-body)", marginBottom: "20px", maxWidth: "680px" }}>
        {lang === "sv"
          ? "Ta med ett verkligt beslut eller en investeringsfråga. Under genomgången visar vi hur Cascade Engine kan synliggöra beroenden, jämföra alternativa vägval och göra tydligare vad dagens beslut betyder för framtida möjligheter."
          : "Bring a real decision or investment question. In the walkthrough, we'll show how Cascade Engine reveals dependencies, compares alternative paths and makes it clearer what today's decisions mean for future options."}
      </p>

      <p style={{ color: "var(--card-text-body)", marginBottom: "20px", maxWidth: "680px" }}>
        {lang === "sv"
          ? "Ni får en konkret bild av hur analysen genomförs tillsammans med era egna beslutsfattare och domänexperter, och vad ni kan ta med er vidare efter mötet."
          : "You'll get a concrete view of how the analysis is carried out together with your own decision-makers and domain experts, and what you can take away from the session afterward."}
      </p>

      <button
        className="touch-button"
        style={{
          padding: "14px 22px",
          background: "#000",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          marginBottom: "10px",
          fontSize: "16px",
        }}
        onClick={() => (window.location.href = "mailto:christian@01systems.se")}
      >
        {lang === "sv" ? "Boka en genomgång" : "Book a walkthrough"}
      </button>

      <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>christian@01systems.se</p>
    </section>
  );
}
