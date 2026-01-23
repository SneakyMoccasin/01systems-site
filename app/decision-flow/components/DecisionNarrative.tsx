"use client";

// Demo-only Decision Flow narrative
// Temporary implementation for walkthrough

type DecisionNarrativeProps = {
  inflow: number;
};

export default function DecisionNarrative({ inflow }: DecisionNarrativeProps) {
  const narrativeText = inflow <= 1.1
    ? "Systemet förblir stabilt över tid."
    : "Belastningen byggs gradvis upp utan att vara omedelbart synlig.";

  return (
    <div style={{
      padding: 16,
      background: "#1a1a1a",
      border: "1px solid #2f333a",
      borderRadius: 8
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#e6edf3" }}>
        Konsekvens
      </h3>
      <p style={{ fontSize: 13, color: "#e6edf3", lineHeight: 1.6 }}>
        {narrativeText}
      </p>
    </div>
  );
}
