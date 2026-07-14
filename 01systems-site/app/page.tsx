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
          Decision Space Analytics
        </p>
        <h1 style={{ fontSize: "42px", lineHeight: 1.15, marginBottom: "28px", maxWidth: "760px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Se hur dagens beslut förändrar morgondagens möjligheter."
            : "See how today’s decisions reshape tomorrow’s options."}
        </h1>
        <p style={{ fontSize: "21px", lineHeight: 1.5, marginBottom: "20px", maxWidth: "700px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Cascade Engine hjälper ledningsgrupper att förstå hur beslut, beroenden och prioriteringar tillsammans förändrar vilka alternativ som fortfarande är möjliga längre fram."
            : "Cascade Engine helps leadership teams understand how decisions, dependencies and priorities interact to reshape which options remain possible over time."}
        </p>
        <p style={{ fontSize: "18px", lineHeight: 1.65, color: "#555", maxWidth: "660px", marginBottom: 0, fontWeight: 500 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Byggd för Decision Space Analytics."
            : "Purpose-built for Decision Space Analytics."}
        </p>
      </section>

      {/* EXECUTIVE DEMO VIDEO */}
      <section style={{ marginBottom: "64px" }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full rounded-2xl border border-white/10 shadow-2xl mt-8"
        >
          <source src="/videos/ce-demo-english.mp4" type="video/mp4" />
        </video>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Vad är Decision Space Analytics?"
            : "What is Decision Space Analytics?"}
        </h2>

        <div style={{ maxWidth: "680px", color: "#555", fontSize: "18px", lineHeight: 1.65 }}>
          {(lang as "sv" | "en") === "sv" ? (
            <>
              <p style={{ marginBottom: "18px" }}>
                Projektverktyg visar aktiviteter, resurser, tidplaner och risker.
              </p>
              <p style={{ marginBottom: "18px" }}>
                Decision Space Analytics besvarar en annan fråga:
              </p>
              <p style={{ marginBottom: "18px", fontSize: "20px", lineHeight: 1.5, color: "#222", fontWeight: 600 }}>
                Vilka framtida möjligheter är fortfarande öppna efter att dagens beslut har fattats?
              </p>
              <p style={{ marginBottom: 0 }}>
                Genom att jämföra olika beslut och sekvenser visar analysen hur vissa alternativ öppnas, bevaras eller stängs över tid.
              </p>
            </>
          ) : (
            <>
              <p style={{ marginBottom: "18px" }}>
                Project tools show activities, resources, schedules and risks.
              </p>
              <p style={{ marginBottom: "18px" }}>
                Decision Space Analytics answers a different question:
              </p>
              <p style={{ marginBottom: "18px", fontSize: "20px", lineHeight: 1.5, color: "#222", fontWeight: 600 }}>
                Which future options remain open after today’s decisions have been made?
              </p>
              <p style={{ marginBottom: 0 }}>
                By comparing different decisions and sequences, the analysis reveals how options open, remain available or close over time.
              </p>
            </>
          )}
        </div>
      </section>

      {/* WORKFLOW OVERVIEW */}
      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "10px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Så används Decision Space Analytics"
            : "How Decision Space Analytics is used"}
        </h2>
        <p style={{ color: "#666", marginBottom: "20px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Metoden hjälper ledningsgrupper att analysera ett verkligt vägskäl innan resurser binds och framtida alternativ begränsas."
            : "The method helps leadership teams analyze a real decision point before resources are committed and future options become constrained."}
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
                svTitle: "Definiera beslutet",
                enTitle: "Define the decision",
                svText: "Tydliggör vilket vägskäl organisationen står inför och vilka alternativ som fortfarande är öppna.",
                enText: "Clarify the decision point the organization is facing and which options are still open.",
              },
              {
                svTitle: "Kartlägg beslutsrummet",
                enTitle: "Map the decision space",
                svText: "Synliggör beroenden, begränsningar och prioriteringar som påverkar vad som fortfarande är möjligt.",
                enText: "Reveal the dependencies, constraints and priorities that shape what remains possible.",
              },
              {
                svTitle: "Jämför alternativen",
                enTitle: "Compare the options",
                svText: "Analysera hur olika beslut och sekvenser öppnar, bevarar eller stänger framtida möjligheter.",
                enText: "Analyze how different decisions and sequences open, preserve or close future options.",
              },
              {
                svTitle: "Stärk beslutet",
                enTitle: "Strengthen the decision",
                svText: "Ge ledningen ett tydligare underlag för att ändra, bekräfta eller sekvensera beslutet med större säkerhet.",
                enText: "Give leadership a clearer basis to change, confirm or sequence the decision with greater confidence.",
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
          {(lang as "sv" | "en") === "sv" ? "Vad Cascade Engine tillför" : "What Cascade Engine adds"}
        </h2>

        <p style={{ marginBottom: "20px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Cascade Engine gör Decision Space Analytics konkret genom att låta ledningsgrupper jämföra hur olika beslut och sekvenser förändrar framtida möjligheter."
            : "Cascade Engine makes Decision Space Analytics practical by allowing leadership teams to compare how different decisions and sequences reshape future options."}
        </p>

        <div style={{ display: "grid", gap: "25px" }}>
          <div>
            <h3>{(lang as "sv" | "en") === "sv" ? "Beslutsrum" : "Decision space"}</h3>
            <p style={{ maxWidth: "680px" }}>
              {(lang as "sv" | "en") === "sv"
                ? "Synliggör vilka alternativ som fortfarande är öppna och hur de förändras när beslut fattas."
                : "Reveal which options remain open and how they change as decisions are made."}
            </p>
          </div>

          <div>
            <h3>{(lang as "sv" | "en") === "sv" ? "Alternativa sekvenser" : "Alternative sequences"}</h3>
            <p style={{ maxWidth: "680px" }}>
              {(lang as "sv" | "en") === "sv"
                ? "Jämför hur olika ordningsföljder påverkar genomförbarhet, prioriteringar och framtida valmöjligheter."
                : "Compare how different sequences affect feasibility, priorities and future options."}
            </p>
          </div>

          <div>
            <h3>{(lang as "sv" | "en") === "sv" ? "Strukturella samband" : "Structural relationships"}</h3>
            <p style={{ maxWidth: "680px" }}>
              {(lang as "sv" | "en") === "sv"
                ? "Visa hur beroenden, begränsningar och konkurrerande prioriteringar påverkar varandra över tid."
                : "Show how dependencies, constraints and competing priorities interact over time."}
            </p>
          </div>

          <div>
            <h3>{(lang as "sv" | "en") === "sv" ? "Tydlig tolkning" : "Clear interpretation"}</h3>
            <p style={{ maxWidth: "680px" }}>
              {(lang as "sv" | "en") === "sv"
                ? "Översätt analysen till ett tydligt beslutsunderlag som ledningsgrupper och rådgivare kan använda i praktiken."
                : "Translate the analysis into clear decision guidance that leadership teams and advisors can use in practice."}
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
