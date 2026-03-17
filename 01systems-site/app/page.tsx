"use client";

import { useState } from "react";

export default function Page() {
  const [lang, setLang] = useState<"sv" | "en">("sv");
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "80px 20px",
        maxWidth: "900px",
        margin: "0 auto",
        lineHeight: 1.6,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "20px",
        }}
      >
        <button onClick={() => setLang("sv")} style={{ marginRight: "10px" }}>
          SV
        </button>
        <button onClick={() => setLang("en")}>EN</button>
      </div>

      {/* HERO */}
      <section style={{ marginBottom: "80px" }}>
        <h1 style={{ fontSize: "40px", marginBottom: "20px" }}>
          {lang === "sv"
            ? "AI-baserad simulering av hur beslut skapar kaskader i komplexa system."
            : "AI-based simulation of how decisions create cascades in complex systems."}
        </h1>
        <p style={{ fontSize: "18px", color: "#555" }}>
          {lang === "sv"
            ? "En deterministisk modell som visar hur förändringar sprider sig genom system över tid – innan konsekvenserna är synliga."
            : "A deterministic model that shows how changes propagate through systems over time — before consequences are visible."}
        </p>
        <p style={{ marginTop: "15px", fontWeight: 500 }}>
          Simulation · Cascades · Determinism · AI
        </p>
      </section>

      <section style={{ marginBottom: "80px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "30px" }}>
          {lang === "sv" ? "Hur modellen fungerar" : "How the model works"}
        </h2>

        <div style={{ display: "grid", gap: "20px" }}>
          <div>
            <h3 style={{ marginBottom: "5px" }}>AI</h3>
            <p>
              {lang === "sv"
                ? "AI används för att tolka och förklara hur systemet utvecklas, men påverkar inte själva simuleringen."
                : "AI is used to interpret and explain how the system evolves, but does not influence the simulation itself."}
            </p>
          </div>

          <div>
            <h3 style={{ marginBottom: "5px" }}>Simulation</h3>
            <p>
              {lang === "sv"
                ? "Systemet simuleras över tid för att visa hur beslut påverkar utvecklingen steg för steg."
                : "The system is simulated over time to show how decisions impact development step by step."}
            </p>
          </div>

          <div>
            <h3 style={{ marginBottom: "5px" }}>Cascades</h3>
            <p>
              {lang === "sv"
                ? "Förändringar sprider sig genom systemet och skapar kedjereaktioner som förstärks över tid."
                : "Changes propagate through the system and create chain reactions that amplify over time."}
            </p>
          </div>

          <div>
            <h3 style={{ marginBottom: "5px" }}>Determinism</h3>
            <p>
              {lang === "sv"
                ? "Samma input ger alltid samma resultat. Det gör systemet testbart och förutsägbart."
                : "The same input always produces the same result. This makes the system testable and predictable."}
            </p>
          </div>
        </div>
      </section>

      {/* GRAPH PLACEHOLDER */}
      <section style={{ marginBottom: "80px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "10px" }}>
          {lang === "sv" ? "Scenario A vs Scenario B" : "Scenario A vs Scenario B"}
        </h2>
        <p style={{ color: "#666", marginBottom: "20px" }}>
          {lang === "sv"
            ? "Samma system. Olika beslut. Helt olika utfall."
            : "Same system. Different decisions. Completely different outcomes."}
        </p>

        <iframe
          src="https://pulse-demo-red.vercel.app/stress-test"
          style={{
            width: "100%",
            height: "500px",
            border: "none",
            borderRadius: "8px",
            background: "#fff",
          }}
        />
      </section>

      {/* CASCADE EXPLANATION */}
      <section style={{ marginBottom: "80px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px" }}>
          {lang === "sv"
            ? "Vad som händer efter beslutet är det som räknas."
            : "What happens after the decision is what matters."}
        </h2>

        <p style={{ marginBottom: "15px" }}>
          {lang === "sv"
            ? "När ett beslut förändrar en del av systemet påverkar det hur nästa del reagerar. Detta fortsätter steg för steg och skapar en kaskad. Det är inte en enskild händelse som orsakar problem – utan hur systemet utvecklas över tid."
            : "When one decision changes part of a system, it affects how the next part responds. This continues step by step and creates a cascade. Problems are not caused by a single event — but by how the system evolves over time."}
        </p>
      </section>

      {/* INSIGHTS */}
      <section style={{ marginBottom: "80px" }}>
        <ul style={{ paddingLeft: "20px" }}>
          <li>
            {lang === "sv"
              ? "Problem uppstår sällan där man först tror"
              : "Problems rarely appear where you first expect."}
          </li>
          <li>
            {lang === "sv"
              ? "Konsekvenser uppstår senare än man förväntar sig"
              : "Consequences show up later than you expect."}
          </li>
          <li>
            {lang === "sv"
              ? "Små förändringar kan skapa helt olika utveckling över tid"
              : "Small changes can lead to very different trajectories over time."}
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section>
        <h2 style={{ fontSize: "22px", marginBottom: "10px" }}>
          {lang === "sv"
            ? "Vill du testa detta på din egen verksamhet?"
            : "Want to try this in your own organization?"}
        </h2>
        <p style={{ color: "#666" }}>
          {lang === "sv"
            ? "Kontakta mig för att testa detta på din egen verksamhet."
            : "Contact me to test this on your own system."}
        </p>
        <a href="mailto:christian@01systems.se">christian@01systems.se</a>
      </section>
    </main>
  );
}
