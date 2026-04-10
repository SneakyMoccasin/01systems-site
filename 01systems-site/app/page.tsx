"use client";

import { useState } from "react";

export default function Page() {
  const [lang, setLang] = useState<"sv" | "en">("sv");
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
      <section style={{ marginBottom: "64px" }}>
        <h1 style={{ fontSize: "40px", marginBottom: "20px" }}>
          {lang === "sv"
            ? "Simulera konsekvenser av beslut innan de inträffar."
            : "Simulate the consequences of decisions before they occur."}
        </h1>
        <p style={{ fontSize: "20px", marginBottom: "12px", maxWidth: "680px" }}>
  {lang === "sv"
    ? "Förstå hur beslut påverkar varandra innan du genomför dem."
    : "Understand how decisions influence each other before they are implemented."
  }
</p>
       {lang === "sv" ? (
          <p style={{ fontSize: "18px", color: "#555", maxWidth: "680px" }}>
            Cascade Engine är en deterministisk decision-flow-simuleringsmotor som gör det möjligt att testa alternativa beslut och se hur konsekvenser sprids genom beroenden, resurser och begränsningar innan besluten genomförs i verkligheten.
          </p>
        ) : (
          <>
            <p style={{ fontSize: "18px", color: "#555", maxWidth: "680px" }}>
            Cascade Engine is a deterministic decision-flow simulation engine that allows organizations to test alternative decisions and observe how consequences propagate through dependencies, resources and constraints before decisions are implemented in reality.
            </p>
            <p style={{ fontSize: "18px", color: "#555", maxWidth: "680px", marginTop: "12px" }}>
  {lang === "sv"
    ? "Utvecklad för organisationer där beslut påverkar många delar av verksamheten — inom fastighet, infrastruktur och offentlig sektor."
    : "Designed for organizations where decisions affect many parts of the organization — including real estate, infrastructure and the public sector."
  }
</p>
            <p
              style={{
                fontSize: "18px",
                color: "#555",
                maxWidth: "680px",
                marginTop: "12px",
              }}
            >
              We model how capacity, system load and structural margin evolve over time — and how decisions create cascade effects across interconnected factors.
            </p>
            <p
              style={{
                fontSize: "18px",
                color: "#555",
                maxWidth: "680px",
                marginTop: "12px",
              }}
            >
              This is not forecasting.
              <br />
              It is not optimization.
              <br />
              It is structural consequence modeling.
            </p>
            <p
              style={{
                fontSize: "18px",
                color: "#555",
                maxWidth: "680px",
                marginTop: "12px",
              }}
            >
              Using our simulation engine, organizations can:
            </p>
            <ul
              style={{
                fontSize: "18px",
                color: "#555",
                maxWidth: "680px",
                marginTop: "8px",
                paddingLeft: "20px",
              }}
            >
              <li>Identify when structural flexibility begins to erode</li>
              <li>Compare alternative strategies before capital is committed</li>
              <li>Understand how parallel decisions interact over time</li>
              <li>Detect cascade effects before they become systemic risk</li>
              <li>Run simulations interactively or headless for large scenario sets</li>
            </ul>
            <p
              style={{
                fontSize: "18px",
                color: "#555",
                maxWidth: "680px",
                marginTop: "12px",
              }}
            >
              01 Systems is based in Sweden and works with decision-makers in real estate, infrastructure and other system-critical sectors.
            </p>
          </>
        )}
        <p style={{ marginTop: "15px", fontWeight: 500, maxWidth: "680px" }}>
        Decision Flow Simulation · Cascade Propagation · Constraint Dynamics · Deterministic Modeling
        </p>
      </section>

      {/* GRAPH PLACEHOLDER */}
      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "10px", lineHeight: 1.3, fontWeight: 600 }}>
          {lang === "sv"
            ? "Testa olika beslut i samma system"
            : "Test different decisions in the same system"}
        </h2>
        <p style={{ color: "#666", marginBottom: "20px", maxWidth: "680px" }}>
          {lang === "sv"
            ? "Ändra parametrar och se hur systemet utvecklas över tid."
            : "Adjust parameters and see how the system evolves over time."}
        </p>

        <p style={{ color: "#666", marginBottom: "20px", maxWidth: "680px" }}>
          {lang === "sv"
            ? "Den här simuleringen visar hur två olika beslut utvecklas över tid i samma system. Modellen gör det möjligt att jämföra alternativa strategier innan beslut genomförs i verkligheten."
            : "This simulation shows how two different decisions evolve over time within the same system. The model allows leadership teams to compare alternative strategies before decisions are implemented in reality."}
        </p>

        <p style={{ color: "#666", marginBottom: "20px", maxWidth: "680px" }}>
          {lang === "sv"
            ? "Du kan själv testa hur olika beslut påverkar utvecklingen genom att ändra inställningarna i modellen."
            : "You can test how different decisions impact the system by adjusting the parameters in the model."}
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

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {lang === "sv" ? "En förenklad modell" : "A simplified model"}
        </h2>

        <p style={{ color: "#555", marginBottom: "15px", maxWidth: "680px" }}>
          {lang === "sv"
            ? "Det här är en förenklad, publik modell som visar grundprincipen: hur beslut kan skapa kaskader i komplexa system över tid."
            : "This is a simplified public model showing the core principle: how decisions can create cascades in complex systems over time."}
        </p>

        <p style={{ color: "#555", maxWidth: "680px" }}>
          {lang === "sv"
            ? "Bakom den finns en mer utvecklad modell med fler lager, fler scenarier och djupare analys."
            : "Behind it sits a more developed model with additional layers, richer scenarios, and deeper analysis."}
        </p>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "30px", lineHeight: 1.3, fontWeight: 600 }}>
          {lang === "sv" ? "Hur modellen fungerar" : "How the model works"}
        </h2>

        <p style={{ marginBottom: "20px", maxWidth: "680px" }}>
          {lang === "sv"
            ? "Modellen består av flera lager som tillsammans beskriver hur systemet beter sig över tid."
            : "The model consists of multiple layers that together describe how the system behaves over time."}
        </p>

        <div style={{ display: "grid", gap: "25px" }}>
          <div>
            <h3>AI</h3>
            <p style={{ maxWidth: "680px" }}>
              {lang === "sv"
                ? "AI används för att tolka och förklara resultatet, men påverkar inte själva simuleringen. Det gör att analysen kan vara flexibel utan att förändra systemets logik."
                : "AI is used to interpret and explain results, but does not influence the simulation itself. This allows flexible analysis without changing system behavior."}
            </p>
          </div>

          <div>
            <h3>Simulation</h3>
            <p style={{ maxWidth: "680px" }}>
              {lang === "sv"
                ? "Systemet simuleras steg för steg över tid. Varje beslut påverkar nästa tillstånd och bygger vidare på tidigare förändringar. Simuleringen kan även köras headless för att analysera större mängder scenarier automatiskt utan det visuella gränssnittet."
                : "The system is simulated step by step over time. Each decision affects the next state and builds on previous changes. The simulation can also run headless to analyze large scenario sets automatically without the visual interface."}
            </p>
          </div>

          <div>
            <h3>Cascades</h3>
            <p style={{ maxWidth: "680px" }}>
              {lang === "sv"
                ? "När du ändrar en variabel i systemet kan du se exakt hur påverkan sprider sig vidare – vilka delar som påverkas först, vad som triggas därefter och hur effekten förstärks över tid. Det gör det möjligt att förstå vilka beslut som faktiskt driver en negativ eller positiv utveckling."
                : "When you change a variable in the system, you can see exactly how the impact propagates — which parts are affected first, what gets triggered next, and how the effect amplifies over time. This makes it possible to understand which decisions actually drive negative or positive outcomes."}
            </p>
          </div>

          <div>
            <h3>Determinism</h3>
            <p style={{ maxWidth: "680px" }}>
              {lang === "sv"
                ? "Samma input ger alltid samma resultat. Det gör modellen testbar, repeterbar och möjlig att använda för beslutsanalys."
                : "The same input always produces the same result. This makes the model testable, repeatable, and reliable for decision analysis."}
            </p>
          </div>
        </div>
      </section>

      <p style={{ marginBottom: "80px", color: "#555", maxWidth: "680px" }}>
        {lang === "sv"
          ? "Simuleringen är deterministisk i grunden, medan AI fungerar som ett tolkningslager ovanpå modellen."
          : "The simulation is deterministic at its core, while AI acts as an interpretation layer on top of the model."}
      </p>

      {/* CASCADE EXPLANATION */}
      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {lang === "sv"
            ? "Vad som händer efter beslutet är det som räknas."
            : "What happens after the decision is what matters."}
        </h2>

        <p style={{ marginBottom: "15px", maxWidth: "680px" }}>
          {lang === "sv"
            ? "När ett beslut förändrar en del av systemet påverkar det hur nästa del reagerar. Detta fortsätter steg för steg och skapar en kaskad. Det är inte en enskild händelse som orsakar problem – utan hur systemet utvecklas över tid."
            : "When one decision changes part of a system, it affects how the next part responds. This continues step by step and creates a cascade. Problems are not caused by a single event — but by how the system evolves over time."}
        </p>
      </section>

      {/* INSIGHTS */}
      <section style={{ marginBottom: "64px" }}>
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

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {lang === "sv" ? "Den fulla modellen" : "The full model"}
        </h2>

        <p style={{ color: "#555", marginBottom: "20px", maxWidth: "680px" }}>
          {lang === "sv"
            ? "Exempel från den utökade modellen med fler variabler, scenarier och systeminsikter."
            : "Examples from the extended model with more variables, scenarios, and system insight."}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >

          <img
            src="/images/pulse-ui-1.jpg"
            style={{
              width: "100%",
              borderRadius: "12px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            }}
          />

          <img
            src="/images/pulse-ui-2.jpg"
            style={{
              width: "100%",
              borderRadius: "12px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            }}
          />

          <img
            src="/images/pulse-ui-3.jpg"
            style={{
              width: "100%",
              borderRadius: "12px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            }}
          />

          <img
            src="/images/pulse-ui-4.jpg"
            style={{
              width: "100%",
              borderRadius: "12px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            }}
          />

        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {lang === "sv"
            ? "Vad du faktiskt kan se i modellen"
            : "What you can actually see in the model"}
        </h2>

        <ul style={{ paddingLeft: "20px", display: "grid", gap: "12px" }}>
          <li>
            {lang === "sv"
              ? "När en negativ utveckling börjar i simuleringen — innan den syns i de sammanfattade resultaten"
              : "When a negative trend begins in the simulation — before it appears in summarized results"}
          </li>

          <li>
            {lang === "sv"
              ? "Vilka beslut som kan leda till ett framtida problem"
              : "Which decisions can lead to a future problem"}
          </li>

          <li>
            {lang === "sv"
              ? "Hur en förändring sprider sig genom systemet steg för steg"
              : "How a change propagates through the system step by step"}
          </li>

          <li>
            {lang === "sv"
              ? "Var trycket byggs upp och systemet blir mer sårbart"
              : "Where pressure builds up and the system becomes more vulnerable"}
          </li>

          <li>
            {lang === "sv"
              ? "Hur olika beslut kan leda till olika utveckling över tid"
              : "How different decisions can lead to different developments over time"}
          </li>

          <li>
            {lang === "sv"
              ? "Vad som händer om du ändrar ett beslut innan du genomför det"
              : "What happens if you change a decision before implementing it"}
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {lang === "sv" ? "Vem det här är för" : "Who this is for"}
        </h2>

        <ul style={{ paddingLeft: "20px" }}>
          <li>
            {lang === "sv"
              ? "Beslutsfattare som arbetar med komplexa fastighetsportföljer"
              : "Real estate companies managing real estate property portfolios"}
          </li>
          <li>
            {lang === "sv"
              ? "Kommuner och offentlig sektor"
              : "Municipalities and public sector organizations"}
          </li>
          <li>
            {lang === "sv"
              ? "Konsulter inom strategi, infrastruktur och analys"
              : "Consultants in strategy, infrastructure and analysis"}
          </li>
        </ul>
      </section>

      <section
        style={{
          marginTop: "60px",
          padding: "30px",
          border: "1px solid #e5e5e5",
          borderRadius: "12px",
          background: "#fafafa",
        }}
      >
        <h2 style={{ fontSize: "22px", marginBottom: "10px", lineHeight: 1.3, fontWeight: 600 }}>
          {lang === "sv"
            ? "Vill du se detta på din egen verklighet?"
            : "Want to see this on your own system?"}
        </h2>

        <p style={{ color: "#666", marginBottom: "20px", maxWidth: "680px" }}>
          {lang === "sv"
            ? "Jag visar hur era beslut påverkar utvecklingen över tid – baserat på er verklighet."
            : "I’ll show how your decisions impact outcomes over time — based on your real system."}
        </p>

        <button
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
          {lang === "sv" ? "Boka genomgång" : "Book a walkthrough"}{" "}
        </button>

        <p style={{ fontSize: "14px", color: "#999" }}>christian@01systems.se</p>
      </section>
      <footer style={{ marginTop: "80px", padding: "40px 0", opacity: 0.6 }}>
        <div style={{ fontSize: "14px" }}>
          © 2026 01 Systems
        </div>
      </footer>
    </main>
  );
}
