"use client";

import { useLanguage } from "@/components/language-context";
import {
  PRIMARY_CTA_COPY,
  PRIMARY_CTA_DESTINATION,
} from "@/components/primary-cta-content";

export function SiteCta() {
  const { lang } = useLanguage();
  const copy = PRIMARY_CTA_COPY[lang];

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
        {copy.heading}
      </h2>

      <p style={{ color: "var(--card-text-body)", marginBottom: "20px", maxWidth: "680px" }}>
        {copy.supportingText}
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
        onClick={() => (window.location.href = PRIMARY_CTA_DESTINATION)}
      >
        {copy.button}
      </button>

      <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>christian@01systems.se</p>
    </section>
  );
}
