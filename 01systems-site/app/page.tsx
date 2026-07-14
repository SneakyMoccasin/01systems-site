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
          Cascade Engine
        </h1>
        <p style={{ fontSize: "18px", lineHeight: 1.65, color: "#555", maxWidth: "660px", marginBottom: "20px", fontWeight: 500 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Programvaran byggd för Decision Space Analytics."
            : "Software purpose-built for Decision Space Analytics."}
        </p>
        <p style={{ fontSize: "21px", lineHeight: 1.5, marginBottom: "20px", maxWidth: "700px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Se hur dagens beslut förändrar morgondagens möjligheter."
            : "See how today's decisions reshape tomorrow's options."}
        </p>
        <p style={{ fontSize: "18px", lineHeight: 1.65, color: "#555", maxWidth: "660px", marginBottom: 0 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Cascade Engine hjälper ledningsgrupper att modellera, jämföra och visualisera hur beslut, beroenden och prioriteringar tillsammans förändrar vilka framtida möjligheter som fortfarande finns kvar."
            : "Cascade Engine helps leadership teams model, compare and visualize how decisions, dependencies and priorities collectively reshape which future options remain available."}
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

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Vad är Cascade Engine?"
            : "What is Cascade Engine?"}
        </h2>

        <div style={{ maxWidth: "680px", color: "#555", fontSize: "18px", lineHeight: 1.65 }}>
          {(lang as "sv" | "en") === "sv" ? (
            <>
              <p style={{ marginBottom: "18px" }}>
                Cascade Engine är programvaran byggd för Decision Space Analytics.
              </p>
              <p style={{ marginBottom: "18px" }}>
                Den hjälper ledningsgrupper att modellera, jämföra och visualisera hur olika beslut förändrar organisationens framtida möjligheter innan besluten genomförs.
              </p>
              <p style={{ marginBottom: "18px" }}>
                Istället för att analysera enskilda projekt analyserar Cascade Engine hur beslut tillsammans påverkar vilka alternativ som fortfarande är möjliga längre fram.
              </p>
              <div style={{ display: "grid", gap: "12px" }}>
                {[
                  "Modellera alternativa beslut",
                  "Jämför olika sekvenser",
                  "Visualisera hur beslutsmöjligheter förändras",
                  "Skapa tydliga beslutsunderlag",
                ].map((item) => (
                  <p key={item} style={{ margin: 0 }}>
                    {item}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <>
              <p style={{ marginBottom: "18px" }}>
                Cascade Engine is the software purpose-built for Decision Space Analytics.
              </p>
              <p style={{ marginBottom: "18px" }}>
                It helps leadership teams model, compare and visualize how different decisions reshape future options before those decisions are executed.
              </p>
              <p style={{ marginBottom: "18px" }}>
                Instead of analyzing individual projects, Cascade Engine analyzes how decisions collectively influence which options remain available over time.
              </p>
              <div style={{ display: "grid", gap: "12px" }}>
                {[
                  "Model alternative decisions",
                  "Compare different sequences",
                  "Visualize how decision space changes",
                  "Create clear decision guidance",
                ].map((item) => (
                  <p key={item} style={{ margin: 0 }}>
                    {item}
                  </p>
                ))}
              </div>
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

      {/* CASCADE EXPLANATION */}
      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Varför Decision Space Analytics?"
            : "Why Decision Space Analytics?"}
        </h2>

        <p style={{ marginBottom: "15px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "De flesta organisationer har god kontroll över projekt, resurser, budgetar och risker."
            : "Most organizations already understand projects, resources, budgets and risks."}
        </p>

        <p style={{ marginBottom: "15px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Det som ofta saknas är ett sätt att förstå hur besluten tillsammans förändrar vilka möjligheter som fortfarande finns kvar längre fram."
            : "What is often missing is a way to understand how decisions collectively reshape which future options remain available."}
        </p>

        <p style={{ marginBottom: "15px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "När beslut, beroenden och prioriteringar samverkar förändras organisationens beslutsrum – ofta långt innan några traditionella nyckeltal visar att något är fel."
            : "As decisions, dependencies and priorities interact, an organization's decision space changes—often long before traditional metrics reveal that anything is wrong."}
        </p>

        <p style={{ marginBottom: 0, maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Decision Space Analytics hjälper ledningsgrupper att upptäcka den förändringen innan den blir synlig i genomförandet."
            : "Decision Space Analytics helps leadership teams recognize that change before it becomes visible in execution."}
        </p>
      </section>

      {/* INSIGHTS */}
      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Frågor Decision Space Analytics hjälper dig besvara"
            : "Questions Decision Space Analytics helps answer"}
        </h2>

        <p style={{ marginBottom: "24px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Decision Space Analytics hjälper ledningsgrupper att analysera frågor som traditionella projekt- och portföljverktyg sällan kan besvara."
            : "Decision Space Analytics helps leadership teams explore questions that traditional project and portfolio tools rarely answer."}
        </p>

        <div style={{ display: "grid", gap: "22px", maxWidth: "680px" }}>
          {((lang as "sv" | "en") === "sv"
            ? [
                "Vilka framtida möjligheter stänger det här beslutet?",
                "Vilka alternativ bevarar störst framtida flexibilitet?",
                "Vilka beslut konkurrerar egentligen om samma resurser eller kapacitet?",
                "När börjar beslutsrummet förändras?",
                "Vilka beslut verkar oberoende men påverkar i själva verket varandra?",
                "Var uppstår strukturella låsningar innan de blir synliga i genomförandet?",
              ]
            : [
                "Which future options does this decision close?",
                "Which choices preserve the greatest future flexibility?",
                "Which decisions are silently competing for the same resources or capacity?",
                "When does the decision space begin to change?",
                "Which decisions appear independent but actually influence one another?",
                "Where do structural lock-ins emerge before they become visible in execution?",
              ]
          ).map((question) => (
            <p key={question} style={{ margin: 0 }}>
              {question}
            </p>
          ))}
        </div>
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
