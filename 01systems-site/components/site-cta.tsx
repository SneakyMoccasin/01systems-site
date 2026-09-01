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
          ? "Diskutera en konkret beslutssituation"
          : "Discuss a concrete decision situation"}
      </h2>

      <p style={{ color: "var(--card-text-body)", marginBottom: "20px", maxWidth: "680px" }}>
        {lang === "sv"
          ? "Ett inledande samtal börjar med en avgränsad beslutssituation och de beslut, alternativ, beroenden, begränsningar och antaganden som kan vara relevanta för en första analys."
          : "An initial conversation begins with one bounded decision situation and the decisions, alternatives, dependencies, constraints and assumptions that may be relevant to an initial analysis."}
      </p>

      <p style={{ color: "var(--card-text-body)", marginBottom: "20px", maxWidth: "680px" }}>
        {lang === "sv"
          ? "Tillsammans bedömer vi om situationen kan representeras tydligt. Ingen omfattande förberedelse eller fullständig datainsamling krävs inför det första samtalet."
          : "Together, we assess whether the situation can be represented clearly. No extensive preparation or complete data collection is required before the first conversation."}
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
        {lang === "sv" ? "Boka ett inledande samtal" : "Book an initial conversation"}
      </button>

      <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>christian@01systems.se</p>
    </section>
  );
}
