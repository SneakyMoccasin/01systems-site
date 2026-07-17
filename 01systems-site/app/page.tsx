"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";
import { getHomepageInsights } from "@/data/insights";

export default function Page() {
  const { lang, setLang } = useLanguage();
  const latestInsights = getHomepageInsights(3);
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
            color: "var(--text-muted)",
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
        <p style={{ fontSize: "18px", lineHeight: 1.65, color: "var(--text-body)", maxWidth: "660px", marginBottom: "20px", fontWeight: 500 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Programvaran byggd för Decision Space Analytics."
            : "Software purpose-built for Decision Space Analytics."}
        </p>
        <p style={{ fontSize: "21px", lineHeight: 1.5, marginBottom: "20px", maxWidth: "700px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Se hur dagens beslut förändrar morgondagens möjligheter."
            : "See how today's decisions reshape tomorrow's options."}
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
          <source src="/videos/Demo01.mp4" type="video/mp4" />
        </video>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "12px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Cascade Engine i praktiken"
            : "Cascade Engine in action"}
        </h2>

        <p style={{ color: "var(--text-muted)", marginBottom: "24px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Utforska hur olika beslut förändrar framtida möjligheter genom gränssnittet."
            : "Explore how different decisions reshape future possibilities through the interface."}
        </p>

        <div
          style={{
            marginTop: "32px",
            marginBottom: "28px",
            width: "min(1200px, calc(100% + 260px))",
            marginLeft: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <Image
            src="/images/cascade-engine-interface-2026-07-16.png"
            alt={(lang as "sv" | "en") === "sv" ? "Skärmbild av Cascade Engine" : "Screenshot of Cascade Engine"}
            width={1829}
            height={980}
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "16px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            maxWidth: "900px",
          }}
        >
          {((lang as "sv" | "en") === "sv"
            ? [
                {
                  title: "AI Inspector",
                  text: "Identifierar de tidigaste strukturella förändringarna i beslutsrummet.",
                },
                {
                  title: "Decision Paths",
                  text: "Jämför hur olika beslut förändrar framtida möjligheter.",
                },
                {
                  title: "AI Interpretation",
                  text: "Förklarar de strukturella drivkrafterna bakom varje scenario.",
                },
              ]
            : [
                {
                  title: "AI Inspector",
                  text: "Highlights the earliest structural changes in the decision space.",
                },
                {
                  title: "Decision Paths",
                  text: "Compare how different decisions reshape future possibilities.",
                },
                {
                  title: "AI Interpretation",
                  text: "Explains the structural drivers behind each scenario.",
                },
              ]
          ).map((item) => (
            <div key={item.title}>
              <h3 style={{ fontSize: "18px", marginBottom: "8px", lineHeight: 1.3 }}>
                {item.title}
              </h3>
              <p style={{ margin: 0, maxWidth: "260px" }}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "20px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Vad är Decision Space Analytics?"
            : "What is Decision Space Analytics?"}
        </h2>

        <div style={{ maxWidth: "680px", color: "var(--text-body)", fontSize: "18px", lineHeight: 1.65 }}>
          {(lang as "sv" | "en") === "sv" ? (
            <>
              <p style={{ marginBottom: "18px" }}>
                Projektverktyg visar aktiviteter, resurser, tidplaner och risker.
              </p>
              <p style={{ marginBottom: "18px" }}>
                Decision Space Analytics besvarar en annan fråga:
              </p>
              <p style={{ marginBottom: "18px", fontSize: "20px", lineHeight: 1.5, color: "var(--text-primary)", fontWeight: 600 }}>
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
              <p style={{ marginBottom: "18px", fontSize: "20px", lineHeight: 1.5, color: "var(--text-primary)", fontWeight: 600 }}>
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

        <div style={{ maxWidth: "680px", color: "var(--text-body)", fontSize: "18px", lineHeight: 1.65 }}>
          {(lang as "sv" | "en") === "sv" ? (
            <>
              <p style={{ marginBottom: "18px" }}>
                Cascade Engine omvandlar beslut, beroenden och begränsningar till jämförbara scenarier.
              </p>
              <p style={{ marginBottom: "18px" }}>
                Programvaran visar hur olika vägval och ordningsföljder påverkar genomförbarhet, prioriteringar och framtida valmöjligheter över tid.
              </p>
              <p style={{ marginBottom: "18px" }}>
                Det ger ledningsgrupper ett konkret underlag för att pröva ett beslut innan resurser binds och konsekvenserna blir svåra att förändra.
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
                Cascade Engine turns decisions, dependencies and constraints into comparable scenarios.
              </p>
              <p style={{ marginBottom: "18px" }}>
                The software shows how different choices and sequences affect feasibility, priorities and future options over time.
              </p>
              <p style={{ marginBottom: "18px" }}>
                It gives leadership teams a concrete basis for testing a decision before resources are committed and its consequences become difficult to change.
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
            ? "Decision Space Analytics – analysens fyra steg"
            : "Decision Space Analytics – Four analytical steps"}
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "20px", maxWidth: "680px" }}>
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
            color: "var(--card-text-primary)",
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
                  color: "var(--card-text-primary)",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--card-text-muted)",
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
                <p style={{ fontSize: "16px", color: "var(--card-text-body)", lineHeight: 1.6, margin: 0 }}>
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

        <p style={{ marginBottom: "15px", maxWidth: "680px", color: "var(--text-body)" }}>
          {(lang as "sv" | "en") === "sv"
            ? "De flesta organisationer har god kontroll över projekt, resurser, budgetar och risker."
            : "Most organizations already understand projects, resources, budgets and risks."}
        </p>

        <p style={{ marginBottom: "15px", maxWidth: "680px", color: "var(--text-body)" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Det som ofta saknas är ett sätt att förstå hur besluten tillsammans förändrar vilka möjligheter som fortfarande finns kvar längre fram."
            : "What is often missing is a way to understand how decisions collectively reshape which future options remain available."}
        </p>

        <p style={{ marginBottom: "15px", maxWidth: "680px", color: "var(--text-body)" }}>
          {(lang as "sv" | "en") === "sv"
            ? "När beslut, beroenden och prioriteringar samverkar förändras organisationens beslutsrum – ofta långt innan några traditionella nyckeltal visar att något är fel."
            : "As decisions, dependencies and priorities interact, an organization's decision space changes—often long before traditional metrics reveal that anything is wrong."}
        </p>

        <p style={{ marginBottom: 0, maxWidth: "680px", color: "var(--text-body)" }}>
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

        <p style={{ marginBottom: "24px", maxWidth: "680px", color: "var(--text-body)" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Decision Space Analytics hjälper ledningsgrupper att analysera frågor som traditionella projekt- och portföljverktyg sällan kan besvara."
            : "Decision Space Analytics helps leadership teams explore questions that traditional project and portfolio tools rarely answer."}
        </p>

        <div style={{ display: "grid", gap: "22px", maxWidth: "680px", color: "var(--text-body)" }}>
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

        <ul style={{ paddingLeft: "20px", color: "var(--text-body)" }}>
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

      <section style={{ marginBottom: "64px", borderTop: "1px solid #e5e5e5", paddingTop: "40px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "12px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv" ? "Så genomförs en analys med Cascade Engine" : "How an analysis is conducted with Cascade Engine"}
        </h2>

        <p style={{ color: "var(--text-muted)", marginBottom: "24px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Cascade Engine är programvaran som används för att genomföra Decision Space Analytics på verkliga beslut. Analysen sker tillsammans med organisationens egna beslutsfattare och domänexperter."
            : "Cascade Engine is the software used to apply Decision Space Analytics to real decisions. The analysis is conducted together with the organisation’s own decision-makers and domain experts."}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            alignItems: "stretch",
          }}
        >
          {((lang as "sv" | "en") === "sv"
            ? [
                {
                  title: "Välj ett verkligt beslut",
                  text: "Utgå från ett investeringsprogram, en omställning eller ett strategiskt vägval som ännu inte är låst.",
                },
                {
                  title: "Bygg beslutsalternativen",
                  text: "Beslut, beroenden, begränsningar och alternativa sekvenser modelleras i Cascade Engine.",
                },
                {
                  title: "Jämför konsekvenserna",
                  text: "Programvaran visualiserar hur olika vägval påverkar genomförbarhet och framtida möjligheter över tid.",
                },
                {
                  title: "Använd resultatet",
                  text: "Ledningsgruppen använder analysen för att ändra, bekräfta eller sekvensera beslutet med större säkerhet.",
                },
              ]
            : [
                {
                  title: "Select a real decision",
                  text: "Start with an investment programme, transformation or strategic choice that is still open.",
                },
                {
                  title: "Build the decision alternatives",
                  text: "Decisions, dependencies, constraints and alternative sequences are modelled in Cascade Engine.",
                },
                {
                  title: "Compare the consequences",
                  text: "The software visualises how different paths affect feasibility and future options over time.",
                },
                {
                  title: "Use the result",
                  text: "Leadership uses the analysis to change, confirm or sequence the decision with greater confidence.",
                },
              ]
          ).map((step, index) => (
            <div
              key={step.title}
              style={{
                padding: "18px 16px",
                border: "1px solid #e5e5e5",
                borderRadius: "8px",
                color: "var(--card-text-primary)",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--card-text-muted)",
                  marginBottom: "10px",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {index + 1}
              </p>
              <h3 style={{ fontSize: "18px", marginBottom: "10px", lineHeight: 1.3 }}>
                {step.title}
              </h3>
              <p style={{ fontSize: "16px", color: "var(--card-text-body)", lineHeight: 1.6, margin: 0 }}>
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          marginTop: "88px",
          marginBottom: "64px",
          padding: "40px 24px",
          borderRadius: "16px",
          background: "#fafafa",
          color: "var(--card-text-primary)",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            color: "var(--card-text-muted)",
            marginBottom: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          FOUNDATION SERIES
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "20px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ fontSize: "22px", lineHeight: 1.3, fontWeight: 600, margin: 0 }}>
            Insights
          </h2>
          <Link href="/insights" style={{ color: "inherit" }}>
            View all Insights
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            maxWidth: "900px",
          }}
        >
          {latestInsights.map((article) => (
            <article
              key={article.slug}
              style={{
                padding: "20px",
                border: "1px solid #dddddd",
                borderRadius: "12px",
                background: "#fff",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.04)",
                color: "var(--card-text-primary)",
              }}
            >
              <p style={{ fontSize: "13px", color: "var(--card-text-muted)", marginBottom: "10px" }}>
                Foundation {String(article.order).padStart(2, "0")}
              </p>
              <h3 style={{ fontSize: "18px", lineHeight: 1.3, marginBottom: "10px" }}>
                <Link href={`/insights/${article.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {article.title}
                </Link>
              </h3>
              <p style={{ margin: 0, color: "var(--card-text-body)" }}>{article.subtitle}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        style={{
          marginTop: "60px",
          padding: "30px",
          border: "1px solid #e5e5e5",
          borderRadius: "12px",
          background: "#fafafa",
          color: "var(--card-text-primary)",
        }}
      >
        <h2 style={{ fontSize: "22px", marginBottom: "10px", lineHeight: 1.3, fontWeight: 600 }}>
          {(lang as "sv" | "en") === "sv"
            ? "Har ni ett beslut som är svårt att överblicka?"
            : "Do you have a decision that's difficult to evaluate?"}
        </h2>

        <p style={{ color: "var(--card-text-body)", marginBottom: "20px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Ta med ett verkligt beslut eller en investeringsfråga. Under genomgången visar vi hur Cascade Engine kan synliggöra beroenden, jämföra alternativa vägval och göra tydligare vad dagens beslut betyder för framtida möjligheter."
            : "Bring a real decision or investment question. In the walkthrough, we'll show how Cascade Engine reveals dependencies, compares alternative paths and makes it clearer what today's decisions mean for future options."}
        </p>

        <p style={{ color: "var(--card-text-body)", marginBottom: "20px", maxWidth: "680px" }}>
          {(lang as "sv" | "en") === "sv"
            ? "Ni får en konkret bild av hur analysen genomförs tillsammans med era egna beslutsfattare och domänexperter, och vad ni kan ta med er vidare efter mötet."
            : "You'll get a concrete view of how the analysis is carried out together with your own decision-makers and domain experts, and what you can take away from the session afterward."}
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
          {(lang as "sv" | "en") === "sv" ? "Boka en genomgång" : "Book a walkthrough"}{" "}
        </button>

        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>christian@01systems.se</p>
      </section>
      <footer style={{ marginTop: "80px", padding: "40px 0" }}>
        <div style={{ fontSize: "14px", color: "var(--text-subtle)" }}>
          © 2026 01 Systems
        </div>
      </footer>
    </main>
  );
}
