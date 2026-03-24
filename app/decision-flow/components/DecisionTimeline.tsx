// Timeline graph for Decision Flow mode
// Simple, exploratory visualization without breakpoints or verdicts

type DecisionTimelineProps = {
  timelineData: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>;
};

export default function DecisionTimeline({ timelineData }: DecisionTimelineProps) {
  const chartHeight = 300;
  const chartWidth = 600;
  
  // Calculate max values for scaling
  const maxTime = Math.max(...timelineData.map(d => d.time));
  const maxValue = Math.max(
    ...timelineData.map(d => d.belastning),
    ...timelineData.map(d => d.kapacitet),
    ...timelineData.map(d => d.aterhamtning)
  );

  // Sharp transitions - no smoothing
  const getPath = (data: typeof timelineData, metric: "belastning" | "kapacitet" | "aterhamtning") => {
    return data.map((point, i) => {
      const x = (point.time / maxTime) * chartWidth;
      const y = chartHeight - (point[metric] / maxValue) * chartHeight;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(" ");
  };

  return (
    <div style={{
      background: "#1a1a1a",
      border: "1px solid #2f333a",
      borderRadius: 8,
      padding: 20
    }}>
      <div style={{ marginBottom: 16, display: "flex", gap: 16, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 2, background: "#ef4444" }}></div>
          <span style={{ color: "#9ca3af" }}>Belastning</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 2, background: "#3b82f6" }}></div>
          <span style={{ color: "#9ca3af" }}>Kapacitet</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 2, background: "#10b981" }}></div>
          <span style={{ color: "#9ca3af" }}>Återhämtning</span>
        </div>
      </div>

      <svg width={chartWidth} height={chartHeight} style={{ display: "block" }}>
        {/* Belastning */}
        <path
          d={getPath(timelineData, "belastning")}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Kapacitet */}
        <path
          d={getPath(timelineData, "kapacitet")}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Återhämtning */}
        <path
          d={getPath(timelineData, "aterhamtning")}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
