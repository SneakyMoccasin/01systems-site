"use client";

import { BEVIS_CASES_V1 } from "./bevisCases";

// Read-only component for Bevis mode right panel
// Shows consequence text in 3 blocks

type BevisLeadershipNarrativeProps = {
  selectedCaseId?: string;
};

export default function BevisLeadershipNarrative({ selectedCaseId = "1" }: BevisLeadershipNarrativeProps) {
  const currentCase = BEVIS_CASES_V1.find(c => c.id === selectedCaseId) || BEVIS_CASES_V1[0];

  return (
    <div>
      {/* Block 1: Vad som händer */}
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #2f333a",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#e6edf3" }}>
          Vad som händer
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#e6edf3", margin: 0 }}>
          {currentCase.consequence.vadSomHander}
        </p>
      </div>

      {/* Block 2: Varför */}
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #2f333a",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#e6edf3" }}>
          Varför
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#e6edf3", margin: 0 }}>
          {currentCase.consequence.varfor}
        </p>
      </div>

      {/* Block 3: Vad det innebär i praktiken */}
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #2f333a",
        borderRadius: 8,
        padding: 16
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#e6edf3" }}>
          Vad det innebär i praktiken
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#e6edf3", margin: 0 }}>
          {currentCase.consequence.vadDetInnebar}
        </p>
      </div>
    </div>
  );
}
