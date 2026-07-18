import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Architecture",
  description:
    "Understand the analytical foundation of Cascade Engine, including its core principle, analytical model, deterministic foundation, analytical scope, and capabilities.",
  path: "/architecture",
});

function VerticalFlowDiagram({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  return (
    <div
      className="surface-card"
      style={{
        border: "1px solid #e5e5e5",
        background: "#fafafa",
        color: "var(--card-text-primary)",
      }}
    >
      <p
        className="eyebrow"
        style={{
          marginBottom: "20px",
          color: "var(--card-text-muted)",
        }}
      >
        {title}
      </p>
      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "10px",
          textAlign: "center",
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step}
            style={{
              display: "grid",
              justifyItems: "center",
              gap: "10px",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "420px",
                padding: "14px 16px",
                border: "1px solid #e5e5e5",
                borderRadius: "10px",
                background: "#fff",
                color: "var(--card-text-primary)",
                fontSize: "clamp(16px, 3.8vw, 18px)",
                lineHeight: 1.4,
                fontWeight: 500,
              }}
            >
              {step}
            </div>
            {index < steps.length - 1 ? (
              <div
                aria-hidden="true"
                style={{
                  fontSize: "24px",
                  lineHeight: 1,
                  color: "var(--text-muted)",
                }}
              >
                ↓
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div
      className="surface-card"
      style={{
        border: "1px solid #e5e5e5",
        background: "#fafafa",
        color: "var(--card-text-primary)",
      }}
    >
      <p
        className="eyebrow"
        style={{
          marginBottom: "20px",
          color: "var(--card-text-muted)",
        }}
      >
        Analytical Architecture
      </p>
      <div
        style={{
          display: "grid",
          gap: "12px",
          justifyItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "14px 16px",
            border: "1px solid #e5e5e5",
            borderRadius: "10px",
            background: "#fff",
            fontSize: "clamp(16px, 3.8vw, 18px)",
            lineHeight: 1.4,
            fontWeight: 500,
            color: "var(--card-text-primary)",
          }}
        >
          Structural Analysis
        </div>
        <div aria-hidden="true" style={{ fontSize: "24px", lineHeight: 1, color: "var(--text-muted)" }}>
          │
        </div>
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "14px 16px",
            border: "1px solid #e5e5e5",
            borderRadius: "10px",
            background: "#fff",
            fontSize: "clamp(16px, 3.8vw, 18px)",
            lineHeight: 1.4,
            fontWeight: 500,
            color: "var(--card-text-primary)",
          }}
        >
          Analytical Results
        </div>
        <div
          className="responsive-grid feature-grid"
          style={{
            width: "100%",
            gap: "12px",
            marginTop: "6px",
          }}
        >
          {["Visualisation", "AI Inspector", "AI Interpretation"].map((item) => (
            <div
              key={item}
              style={{
                padding: "14px 16px",
                border: "1px solid #e5e5e5",
                borderRadius: "10px",
                background: "#fff",
                fontSize: "clamp(15px, 3.6vw, 17px)",
                lineHeight: 1.4,
                fontWeight: 500,
                color: "var(--card-text-primary)",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <main
      className="page-shell"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "900px",
      }}
    >
      <section style={{ marginBottom: "64px" }}>
        <p className="eyebrow content-narrow">Architecture</p>
        <h1 className="page-title content-narrow" style={{ marginBottom: "18px" }}>
          Understanding the Analytical Foundation of Cascade Engine
        </h1>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)" }}
        >
          <p style={{ margin: 0 }}>
            Cascade Engine is a structural analysis engine designed to examine how combinations and sequences of decisions influence future execution conditions.
          </p>
          <p style={{ margin: 0 }}>
            Rather than estimating probabilities or forecasting future events, it characterises how structural relationships evolve as decisions interact over time. The analytical results describe how structural relationships change, where constraints emerge and how future execution flexibility is affected.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          Core Principle
        </h2>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)", marginBottom: "24px" }}
        >
          <p style={{ margin: 0 }}>
            Every implementation of Cascade Engine is built around a single analytical question:
          </p>
          <p
            className="body-xl"
            style={{ margin: 0, color: "var(--text-primary)", fontWeight: 600 }}
          >
            How do combinations and sequences of decisions change future execution flexibility?
          </p>
          <p style={{ margin: 0 }}>
            Rather than considering decisions in isolation, the analysis examines how multiple decisions interact structurally over time. Individually reasonable decisions may collectively reduce future execution flexibility by activating constraints, increasing structural dependencies or narrowing available execution paths.
          </p>
        </div>
        <VerticalFlowDiagram
          title="Analytical Principle"
          steps={[
            "Decisions",
            "Structural Relationships",
            "Future Execution Flexibility",
          ]}
        />
        <p
          className="body-large"
          style={{ marginTop: "24px", maxWidth: "760px", color: "var(--text-body)" }}
        >
          The purpose of the analysis is not to determine whether individual decisions are objectively correct or incorrect. Instead, it characterises how combinations of decisions influence the structural conditions under which future decisions must be made.
        </p>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          The Analytical Model
        </h2>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)", marginBottom: "24px" }}
        >
          <p style={{ margin: 0 }}>
            The analytical model describes how structural analysis is performed before analytical results are presented to the user.
          </p>
        </div>
        <VerticalFlowDiagram
          title="Analytical Flow"
          steps={[
            "Decisions",
            "Structural Relationships",
            "Structural Analysis",
            "Analytical Results",
            "Presentation",
          ]}
        />
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)", marginTop: "24px" }}
        >
          <p style={{ margin: 0 }}>Each stage has a distinct responsibility.</p>
          <p style={{ margin: 0 }}>
            Presentation components communicate completed analytical results but do not alter the structural analysis that produced them.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          Deterministic Foundation
        </h2>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)", marginBottom: "24px" }}
        >
          <p style={{ margin: 0 }}>
            Cascade Engine separates structural analysis from the presentation of analytical results.
          </p>
          <p style={{ margin: 0 }}>
            The structural analysis follows a deterministic analytical process. For identical analytical inputs and assumptions, it produces identical analytical results.
          </p>
          <p style={{ margin: 0 }}>
            The presentation of those results is performed by separate components that communicate the completed analysis to the user.
          </p>
          <p style={{ margin: 0 }}>
            The principal presentation categories are illustrated below. They represent analytical responsibilities rather than an exhaustive inventory of interface components.
          </p>
        </div>
        <ArchitectureDiagram />
        <p
          className="body-large"
          style={{ marginTop: "24px", maxWidth: "760px", color: "var(--text-body)" }}
        >
          These categories may be implemented through multiple visual, summary and explanatory interface components.
        </p>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          Analytical Scope
        </h2>
        <div
          className="body-large stack-lg"
          style={{ maxWidth: "760px", color: "var(--text-body)" }}
        >
          <p style={{ margin: 0 }}>
            Every analytical method is designed to answer a particular type of question.
          </p>
          <p style={{ margin: 0 }}>
            Cascade Engine is designed to analyse how combinations and sequences of decisions influence future execution conditions through their structural relationships.
          </p>
          <p style={{ margin: 0 }}>
            Its analytical scope is centred on the structural consequences of decision interaction rather than on predicting future events or estimating uncertainty.
          </p>
          <p style={{ margin: 0 }}>
            The analysis characterises how structural conditions change as decisions accumulate, allowing users to examine where constraints emerge, how dependencies develop and how future execution flexibility is affected.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: "64px" }}>
        <h2 className="section-title" style={{ marginBottom: "16px" }}>
          Capabilities
        </h2>
        <div
          className="surface-card"
          style={{
            border: "1px solid #e5e5e5",
            background: "#fafafa",
            color: "var(--card-text-primary)",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "620px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0 0 14px 0",
                    fontSize: "13px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--card-text-muted)",
                    verticalAlign: "top",
                  }}
                >
                  Designed to
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0 0 14px 24px",
                    fontSize: "13px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--card-text-muted)",
                    verticalAlign: "top",
                  }}
                >
                  Not Designed to
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Analyse structural relationships between decisions.",
                  "Predict future events.",
                ],
                [
                  "Characterise cumulative structural effects as decisions interact over time.",
                  "Estimate or simulate uncertainty.",
                ],
                [
                  "Compare alternative decision structures.",
                  "Determine objectively correct decisions.",
                ],
                [
                  "Show how decision structures influence future execution conditions.",
                  "Replace domain expertise.",
                ],
                [
                  "Produce consistent structural analyses from identical analytical inputs and assumptions.",
                  "Eliminate human judgement from decision-making.",
                ],
              ].map(([designedTo, notDesignedTo]) => (
                <tr key={designedTo}>
                  <td
                    style={{
                      padding: "14px 24px 14px 0",
                      borderTop: "1px solid #e5e5e5",
                      color: "var(--card-text-body)",
                      verticalAlign: "top",
                      fontSize: "16px",
                      lineHeight: 1.65,
                    }}
                  >
                    {designedTo}
                  </td>
                  <td
                    style={{
                      padding: "14px 0 14px 24px",
                      borderTop: "1px solid #e5e5e5",
                      color: "var(--card-text-body)",
                      verticalAlign: "top",
                      fontSize: "16px",
                      lineHeight: 1.65,
                    }}
                  >
                    {notDesignedTo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
