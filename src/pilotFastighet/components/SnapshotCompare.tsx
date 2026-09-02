import React from "react";

type Props = {
  baselineA: number;
  finalA: number;
  baselineB: number;
  finalB: number;
  structuralStatusA: string;
  structuralStatusB: string;
  deltaMargin: number;
  tippingStep: number | null;
  tippingLabel: string;
  noTippingText: string;
};

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("kollaps") || s.includes("collapse")) return "#DC2626";
  if (
    s.includes("marginell") ||
    s.includes("marginal") ||
    s.includes("exceedance") ||
    s.includes("dömd") ||
    s.includes("doomed") ||
    s.includes("pressad") ||
    s.includes("stressed")
  )
    return "#D97706";
  return "#059669";
}

export const SnapshotCompare: React.FC<Props> = ({
  baselineA,
  finalA,
  baselineB,
  finalB,
  structuralStatusA,
  structuralStatusB,
  deltaMargin,
  tippingStep,
  tippingLabel,
  noTippingText,
}) => {
  return (
    <div
      style={{
        marginTop: "0",
        padding: "24px",
        background: "var(--ce-surface-primary, #111827)",
        border: "1px solid var(--ce-border, #1F2937)",
        borderRadius: "6px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3
        style={{
          marginBottom: "20px",
          marginTop: 0,
          fontWeight: 600,
          fontSize: "15px",
          letterSpacing: "0.02em",
          color: "var(--ce-text-primary, #E5E7EB)",
        }}
      >
        Snapshot Compare
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "32px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            padding: "16px",
            background: "var(--ce-surface-subtle, rgba(31, 41, 55, 0.4))",
            borderRadius: "6px",
            border: "1px solid var(--ce-border, #1F2937)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "var(--ce-text-secondary, #9CA3AF)",
              marginBottom: "12px",
            }}
          >
            Current Strategy
          </div>
          <div style={{ fontSize: "12px", color: "var(--ce-text-secondary, #9CA3AF)", marginBottom: "4px" }}>
            Start
          </div>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--ce-text-primary, #F3F4F6)", marginBottom: "12px" }}>
            {baselineA.toFixed(2)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--ce-text-secondary, #9CA3AF)", marginBottom: "4px" }}>
            End
          </div>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--ce-text-primary, #F3F4F6)", marginBottom: "12px" }}>
            {finalA.toFixed(2)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--ce-text-secondary, #9CA3AF)", marginBottom: "4px" }}>
            Status
          </div>
          <div style={{ fontSize: "13px", color: "var(--ce-text-secondary, #9CA3AF)" }}>{structuralStatusA}</div>
        </div>

        <div
          style={{
            padding: "16px",
            background: "var(--ce-surface-subtle, rgba(31, 41, 55, 0.4))",
            borderRadius: "6px",
            border: "1px solid var(--ce-border, #1F2937)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "var(--ce-text-secondary, #9CA3AF)",
              marginBottom: "12px",
            }}
          >
            Alternative Strategy
          </div>
          <div style={{ fontSize: "12px", color: "var(--ce-text-secondary, #9CA3AF)", marginBottom: "4px" }}>
            Start
          </div>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--ce-text-primary, #F3F4F6)", marginBottom: "12px" }}>
            {baselineB.toFixed(2)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--ce-text-secondary, #9CA3AF)", marginBottom: "4px" }}>
            End
          </div>
          <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--ce-text-primary, #F3F4F6)", marginBottom: "12px" }}>
            {finalB.toFixed(2)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--ce-text-secondary, #9CA3AF)", marginBottom: "4px" }}>
            Status
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: getStatusColor(structuralStatusB) }}>
            {structuralStatusB}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "4px",
          paddingTop: "20px",
          borderTop: "1px solid var(--ce-border, #1F2937)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            background: "var(--ce-surface-subtle, rgba(31, 41, 55, 0.6))",
            borderRadius: "6px",
            borderLeft: "3px solid",
            borderLeftColor: deltaMargin < 0 ? "#DC2626" : deltaMargin > 0 ? "#059669" : "#6B7280",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--ce-text-secondary, #9CA3AF)", marginBottom: "4px" }}>
            Δ Margin
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: deltaMargin < 0 ? "#DC2626" : deltaMargin > 0 ? "#059669" : "#9CA3AF",
            }}
          >
            {deltaMargin >= 0 ? "+" : ""}
            {deltaMargin.toFixed(2)} p.p.
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11px", color: "var(--ce-text-secondary, #9CA3AF)", marginBottom: "4px" }}>
            {tippingLabel}
          </div>
          <div style={{ fontSize: "14px", color: "var(--ce-text-primary, #E5E7EB)" }}>
            {tippingStep ? "Tipping risk" : noTippingText}
          </div>
        </div>
      </div>
    </div>
  );
};
