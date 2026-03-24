// KPI Comparison UI for Bevis mode
// Words only, no numbers

type BevisKPIComparisonProps = {
  planA: {
    belastning: string;
    kapacitet: string;
    aterhamtning: string;
  };
  planB: {
    belastning: string;
    kapacitet: string;
    aterhamtning: string;
  };
};

export default function BevisKPIComparison({ planA, planB }: BevisKPIComparisonProps) {
  return (
    <div style={{
      background: "#1a1a1a",
      border: "1px solid #2f333a",
      borderRadius: 8,
      padding: 20,
      marginBottom: 24
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 16,
        fontSize: 13
      }}>
        <div style={{ fontWeight: 600, color: "#e6edf3" }}></div>
        <div style={{ fontWeight: 600, color: "#e6edf3", textAlign: "center" }}>
          Nuvarande plan
        </div>
        <div style={{ fontWeight: 600, color: "#e6edf3", textAlign: "center" }}>
          Alternativ
        </div>

        <div style={{ color: "#9ca3af" }}>Belastning</div>
        <div style={{ textAlign: "center", color: "#e6edf3" }}>{planA.belastning}</div>
        <div style={{ textAlign: "center", color: "#e6edf3" }}>{planB.belastning}</div>

        <div style={{ color: "#9ca3af" }}>Kapacitet</div>
        <div style={{ textAlign: "center", color: "#e6edf3" }}>{planA.kapacitet}</div>
        <div style={{ textAlign: "center", color: "#e6edf3" }}>{planB.kapacitet}</div>

        <div style={{ color: "#9ca3af" }}>Återhämtning</div>
        <div style={{ textAlign: "center", color: "#e6edf3" }}>{planA.aterhamtning}</div>
        <div style={{ textAlign: "center", color: "#e6edf3" }}>{planB.aterhamtning}</div>
      </div>
    </div>
  );
}
