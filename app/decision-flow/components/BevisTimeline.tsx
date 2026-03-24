// Timeline graph for Bevis mode
// Overlaid A and B, no interaction
// This timeline represents a frozen snapshot of Decision Flow simulation output,
// rendered in Bevis mode for presentation purposes only.
// This Bevis timeline intentionally renders only Belastning to ensure
// at-a-glance clarity in leadership presentations. Kapacitet and
// Återhämtning are represented via KPI cards and narrative text.

type BevisTimelineProps = {
  planAData: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>;
  planBData: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>;
  breakpoint?: number; // Critical point where behavior changes
};

export default function BevisTimeline({ planAData, planBData, breakpoint }: BevisTimelineProps) {
  const chartHeight = 300;
  const chartWidth = 600;
  
  // Calculate max values for scaling (Belastning only)
  // DO NOT normalize - preserve full range to show differences
  const maxTime = Math.max(
    ...planAData.map(d => d.time),
    ...planBData.map(d => d.time)
  );
  const maxValue = Math.max(
    ...planAData.map(d => d.belastning),
    ...planBData.map(d => d.belastning)
  );

  // Sharp transitions - no smoothing, use straight line segments
  const getPath = (data: typeof planAData) => {
    return data.map((point, i) => {
      const x = (point.time / maxTime) * chartWidth;
      const y = chartHeight - (point.belastning / maxValue) * chartHeight;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(" ");
  };

  // Render breakpoint marker if provided
  // Rendered AFTER curves to ensure visibility above lines
  const renderBreakpoint = () => {
    if (breakpoint === undefined) return null;
    const x = (breakpoint / maxTime) * chartWidth;
    return (
      <g>
        {/* Vertical line at breakpoint - brighter and thicker for visibility */}
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={chartHeight}
          stroke="#fbbf24"
          strokeWidth={3}
          strokeDasharray="6 4"
          opacity={0.9}
        />
        {/* Circle marker - larger and brighter */}
        <circle
          cx={x}
          cy={chartHeight / 2}
          r={8}
          fill="#fbbf24"
          opacity={1}
        />
        {/* Label indicating irreversible point */}
        <text
          x={x}
          y={20}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize="11"
          fontWeight="600"
          style={{ pointerEvents: "none" }}
        >
          Oåterkallelig punkt
        </text>
      </g>
    );
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
          <div style={{ width: 14, height: 3, background: "#dc2626" }}></div>
          <span style={{ color: "#e6edf3", fontWeight: 500 }}>Nuvarande plan</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 3, background: "#2563eb" }}></div>
          <span style={{ color: "#e6edf3", fontWeight: 500 }}>Alternativ</span>
        </div>
      </div>

      <svg width={chartWidth} height={chartHeight} style={{ display: "block" }}>
        {/* Belastning - Nuvarande plan (brighter red for higher contrast) */}
        <path
          d={getPath(planAData)}
          fill="none"
          stroke="#dc2626"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Belastning - Alternativ (brighter blue for higher contrast) */}
        <path
          d={getPath(planBData)}
          fill="none"
          stroke="#2563eb"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Breakpoint marker (rendered LAST to appear above curves) */}
        {renderBreakpoint()}
      </svg>
    </div>
  );
}
