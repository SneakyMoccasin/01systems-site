export default function HomePage() {
  return (
    <main
      style={{
        padding: 48,
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "system-ui, sans-serif",
        background: "#000",
        color: "#eaeaea",
        minHeight: "100vh"
      }}
    >
      <h1>Pulse Engine — Decision Flow Pilot</h1>

      <p style={{ marginTop: 16, fontSize: 18 }}>
        This is a pilot system for testing how decisions affect complex systems
        over time — before those decisions are made in the real world.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>What this pilot does</h2>
        <ul style={{ marginTop: 12, lineHeight: 1.6 }}>
          <li>Defines a clear baseline (reference scenario)</li>
          <li>Applies external pressure or change</li>
          <li>Applies a decision or policy</li>
          <li>Simulates consequences over time</li>
          <li>Compares outcomes against the baseline</li>
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Try it</h2>
        <p style={{ marginTop: 8 }}>
          You can explore the decision flow visually or run the simulation
          headlessly via an API.
        </p>

        <div style={{ marginTop: 16, display: "flex", gap: 16 }}>
          <a
            href="/decision-flow"
            style={{
              padding: "12px 16px",
              background: "#ffffff",
              color: "#000000",
              border: "2px solid #ffffff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600
            }}
          >
            Open Decision Flow (Visual)
          </a>

          <a
            href="/api/decision-flow"
            style={{
              padding: "12px 16px",
              background: "transparent",
              color: "#ffffff",
              border: "2px dashed rgba(255,255,255,0.8)",
              borderRadius: 8,
              textDecoration: "none"
            }}
          >
            Run via API (Headless)
          </a>
        </div>
      </section>

      <section style={{ marginTop: 48, opacity: 0.7 }}>
        <p>
          Pilot v1 — deterministic, headless-first, UI as presentation only.
        </p>
      </section>
    </main>
  );
}
