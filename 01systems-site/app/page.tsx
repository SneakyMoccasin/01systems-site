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
      <section style={{ marginBottom: "72px" }}>
        <h1 style={{ fontSize: "42px", lineHeight: 1.15, marginBottom: "28px", maxWidth: "760px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Organisationer får sällan problem av ett enskilt beslut."
            : "Organizations rarely fail because of a single decision."}
        </h1>
        <p style={{ fontSize: "21px", lineHeight: 1.5, marginBottom: "20px", maxWidth: "700px" }}>
  {(lang as "sv" | "en") === "sv"
    ? "Problemen uppstår när beslut, prioriteringar och begränsningar börjar påverka varandra över tid."
    : "Problems emerge when decisions, priorities and constraints begin influencing each other over time."
  }
</p>
       {(lang as "sv" | "en") === "sv" ? (
          <p style={{ fontSize: "18px", lineHeight: 1.65, color: "#555", maxWidth: "660px", marginBottom: 0 }}>
            Cascade Engine hjälper organisationer förstå hur beslut gradvis påverkar genomförande, prioriteringar och framtida möjligheter innan problemen blivit synliga i verkligheten.
          </p>
        ) : (
          <>
            <div style={{ maxWidth: "720px", lineHeight: "1.65", marginTop: "28px" }}>
              <p style={{ fontSize: "18px", color: "#555", maxWidth: "660px", marginBottom: 0 }}>
              Cascade Engine helps organizations understand how decisions gradually affect execution, priorities and future possibilities before problems become visible in the real world.
              </p>
              <p style={{ fontSize: "18px", color: "#555", maxWidth: "660px", marginTop: "18px", marginBottom: 0 }}>
    {(lang as "sv" | "en") === "sv"
      ? "Utvecklad för organisationer där beslut påverkar många delar av verksamheten — inom fastighet, infrastruktur och offentlig sektor."
      : "Designed for organizations where decisions affect many parts of the organization — including real estate, infrastructure and the public sector."
    }
  </p>
              <p
                style={{
                  fontSize: "18px",
                  color: "#555",
                  maxWidth: "660px",
                  marginTop: "18px",
                  marginBottom: 0,
                }}
              >
                We model how capacity, system load and structural margin evolve over time — and how decisions create cascade effects across interconnected factors.
              </p>
              <div
                style={{
                  marginTop: "32px",
                  marginBottom: "32px",
                  fontWeight: 500,
                  letterSpacing: "0.2px",
                }}
              >
                <p
                  style={{
                    fontSize: "18px",
                    color: "#555",
                    maxWidth: "680px",
                  }}
                >
                  This is not forecasting.
                </p>
                <p
                  style={{
                    fontSize: "18px",
                    color: "#555",
                    maxWidth: "680px",
                    marginTop: "6px",
                  }}
                >
                  It is not optimization.
                </p>
                <p
                  style={{
                    fontSize: "18px",
                    color: "#555",
                    maxWidth: "680px",
                    marginTop: "6px",
                  }}
                >
                  It is structural consequence modeling.
                </p>
              </div>
              <p
                style={{
                  fontSize: "18px",
                  color: "#555",
                  maxWidth: "680px",
                  marginTop: "16px",
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
                  marginTop: "16px",
                }}
              >
                01 Systems is based in Sweden and works with decision-makers in real estate, infrastructure and other system-critical sectors.
              </p>
            </div>
          </>
        )}
        <p style={{ marginTop: "15px", fontWeight: 500, maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Beslutssamverkan · Genomföranderisk · Begränsningsanalys · Scenarioanalys"
            : "Decision Interaction · Implementation Risk · Constraint Awareness · Scenario Analysis"}
        </p>
      </section>

      {/* WORKFLOW OVERVIEW */}
      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "10px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Cascade Engine i beslutsflödet"
            : "Cascade Engine in the decision workflow"}
        </h2>
        <p style={{ color: "#666", marginBottom: "20px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Plattformen används uppströms för att strukturera beslut innan genomförandet låser framtida alternativ."
            : "The platform is used upstream to structure decisions before implementation locks future options."}
        </p>

        <div
          style={{
            width: "100%",
            maxWidth: "900px",
            border: "1px solid #e5e5e5",
            borderRadius: "8px",
            padding: "28px 24px",
            background: "#fff",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              alignItems: "stretch",
            }}
          >
            {[
              {
                svTitle: "Beslutsläge",
                enTitle: "Decision context",
                svText: "Mål, begränsningar och beroenden tydliggörs innan riktning väljs.",
                enText: "Goals, constraints and dependencies are clarified before direction is chosen.",
              },
              {
                svTitle: "Struktur",
                enTitle: "Structural mapping",
                svText: "Systemets kopplingar och känsliga punkter synliggörs tidigt.",
                enText: "System relationships and sensitive pressure points are surfaced early.",
              },
              {
                svTitle: "Scenarioanalys",
                enTitle: "Scenario analysis",
                svText: "Alternativa vägar jämförs innan resurser binds upp i genomförandet.",
                enText: "Alternative paths are compared before resources are committed to execution.",
              },
              {
                svTitle: "Beslutsunderlag",
                enTitle: "Decision guidance",
                svText: "Ledningen får en tydligare bild av följdverkningar innan problem uppstår.",
                enText: "Leadership gets a clearer view of downstream effects before problems emerge.",
              },
            ].map((step, index) => (
              <div
                key={index}
                style={{
                  padding: "18px 16px",
                  border: "1px solid #e5e5e5",
                  borderRadius: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    marginBottom: "10px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {index + 1}
                </p>
                <h3 style={{ fontSize: "18px", marginBottom: "10px", lineHeight: 1.3 }}>
                  {(lang as "sv" | "en") === "sv" ? step.svTitle : step.enTitle}
                </h3>
                <p style={{ fontSize: "16px", color: "#555", lineHeight: 1.6, margin: 0 }}>
                  {(lang as "sv" | "en") === "sv" ? step.svText : step.enText}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "30px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv" ? "Hur plattformen stödjer beslutsarbetet" : "How the platform supports decision work"}
        </h2>

        <p style={{ marginBottom: "20px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Cascade Engine skapar struktur i komplexa beslut genom att göra avvägningar, beroenden och följdeffekter lättare att analysera."
            : "Cascade Engine brings structure to complex decisions by making trade-offs, dependencies and downstream effects easier to examine."}
        </p>

        <div style={{ display: "grid", gap: "25px" }}>
          <div>
            <h3>{(lang as "sv" | "en") === "sv" ? "Tolkning" : "Interpretation"}</h3>
            <p style={{ maxWidth: "680px" }}>
              {(lang as "sv" | "en") === "sv"
                ? "AI hjälper till att sammanfatta mönster och förklara konsekvenser i ett tydligt språk för ledningsgrupper och rådgivare."
                : "AI helps summarize patterns and explain implications in clear language for leadership teams and advisors."}
            </p>
          </div>

          <div>
            <h3>{(lang as "sv" | "en") === "sv" ? "Beslutsspår" : "Decision paths"}</h3>
            <p style={{ maxWidth: "680px" }}>
              {(lang as "sv" | "en") === "sv"
                ? "Olika vägval kan analyseras innan genomförande, så att team kan jämföra sannolika konsekvenser och tidseffekter."
                : "Alternative choices can be explored before implementation, so teams can compare likely consequences and timing."}
            </p>
          </div>

          <div>
            <h3>{(lang as "sv" | "en") === "sv" ? "Följdeffekter" : "Downstream effects"}</h3>
            <p style={{ maxWidth: "680px" }}>
              {(lang as "sv" | "en") === "sv"
                ? "Plattformen synliggör hur ett beslut kan påverka prioriteringar, resurser och framtida handlingsutrymme i organisationen."
                : "The platform helps reveal how one decision can influence priorities, resources and future options across the organization."}
            </p>
          </div>

          <div>
            <h3>{(lang as "sv" | "en") === "sv" ? "Konsistens" : "Consistency"}</h3>
            <p style={{ maxWidth: "680px" }}>
              {(lang as "sv" | "en") === "sv"
                ? "Analysen är strukturerad och repeterbar, vilket gör det lättare att återkomma till antaganden och jämföra alternativ med större trygghet."
                : "The analysis is structured and repeatable, which makes it easier to revisit assumptions and compare alternatives with confidence."}
            </p>
          </div>
        </div>
      </section>

      {/* CASCADE EXPLANATION */}
      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Vad som händer efter beslutet är det som räknas."
            : "What happens after the decision is what matters."}
        </h2>

        <p style={{ marginBottom: "15px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "När ett beslut förändrar en del av systemet påverkar det hur nästa del reagerar. Detta fortsätter steg för steg och skapar följdeffekter genom organisationen. Det är inte en enskild händelse som orsakar problem – utan hur systemet utvecklas över tid."
            : "When one decision changes part of a system, it affects how the next part responds. This continues step by step and creates downstream effects across the organization. Problems are not caused by a single event — but by how the system evolves over time."}
        </p>
      </section>

      {/* INSIGHTS */}
      <section style={{ marginBottom: "64px" }}>
        <ul style={{ paddingLeft: "20px" }}>
          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Problem uppstår sällan där man först tror"
              : "Problems rarely appear where you first expect."}
          </li>
          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Konsekvenser uppstår senare än man förväntar sig"
              : "Consequences show up later than you expect."}
          </li>
          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Små förändringar kan skapa helt olika utveckling över tid"
              : "Small changes can lead to very different trajectories over time."}
          </li>
        </ul>
      </section>


      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Vad plattformen hjälper dig att se"
            : "What the platform helps you see"}
        </h2>

        <ul style={{ paddingLeft: "20px", display: "grid", gap: "12px" }}>
          <li>
            {(lang as "sv" | "en") === "sv"
              ? "När en negativ utveckling börjar i simuleringen — innan den syns i de sammanfattade resultaten"
              : "When a negative trend begins in the simulation — before it appears in summarized results"}
          </li>

          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Vilka beslut som kan leda till ett framtida problem"
              : "Which decisions can lead to a future problem"}
          </li>

          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Hur en förändring sprider sig genom systemet steg för steg"
              : "How a change propagates through the system step by step"}
          </li>

          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Var trycket byggs upp och systemet blir mer sårbart"
              : "Where pressure builds up and the system becomes more vulnerable"}
          </li>

          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Hur olika beslut kan leda till olika utveckling över tid"
              : "How different decisions can lead to different developments over time"}
          </li>

          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Vad som händer om du ändrar ett beslut innan du genomför det"
              : "What happens if you change a decision before implementing it"}
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv" ? "Vem det här är för" : "Who this is for"}
        </h2>

        <ul style={{ paddingLeft: "20px" }}>
          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Ledningsgrupper som ansvarar för komplexa portföljer och långsiktiga investeringar"
              : "Leadership teams overseeing complex portfolios and long-term investments"}
          </li>
          <li>
            {(lang as "sv" | "en") === "sv"
              ? "Kommuner och offentlig sektor"
              : "Municipalities and public sector organizations"}
          </li>
          <li>
            {(lang as "sv" | "en") === "sv"
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
          {(lang as "sv" | "en") === "sv"
            ? "Vill du utforska detta i din egen organisation?"
            : "Want to explore this in your own organization?"}
        </h2>

        <p style={{ color: "#666", marginBottom: "20px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Vi hjälper team att analysera hur större beslut kan påverka genomförande, prioriteringar och framtida möjligheter i deras egen kontext."
            : "We help teams examine how major decisions may affect execution, priorities and future options in their specific context."}
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
          {(lang as "sv" | "en") === "sv" ? "Boka samtal" : "Book a conversation"}{" "}
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
