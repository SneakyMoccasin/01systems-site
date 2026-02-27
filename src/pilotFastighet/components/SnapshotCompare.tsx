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
        padding: "20px",
        background: "#111827",
        border: "1px solid #1F2937",
        borderRadius: "6px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3
        style={{
          marginBottom: "20px",
          fontWeight: 500,
          color: "#E5E7EB",
          fontSize: "16px",
        }}
      >
        Snapshot Compare
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          marginBottom: "24px",
        }}
      >
        <div>
          <strong
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "13px",
              letterSpacing: "0.5px",
              color: "#9CA3AF",
            }}
          >
            Scenario A
          </strong>
          <div
            style={{ fontSize: "15px", color: "#F3F4F6", marginBottom: "4px" }}
          >
            Baseline: {baselineA.toFixed(2)}
          </div>
          <div
            style={{ fontSize: "15px", color: "#F3F4F6", marginBottom: "4px" }}
          >
            Final: {finalA.toFixed(2)}
          </div>
          <div
            style={{
              marginTop: "8px",
              fontSize: "13px",
              color: "#9CA3AF",
            }}
          >
            Status: {structuralStatusA}
          </div>
        </div>

        <div>
          <strong
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "13px",
              letterSpacing: "0.5px",
              color: "#9CA3AF",
            }}
          >
            Scenario B
          </strong>
          <div
            style={{ fontSize: "15px", color: "#F3F4F6", marginBottom: "4px" }}
          >
            Baseline: {baselineB.toFixed(2)}
          </div>
          <div
            style={{ fontSize: "15px", color: "#F3F4F6", marginBottom: "4px" }}
          >
            Final: {finalB.toFixed(2)}
          </div>
          <div
            style={{
              marginTop: "8px",
              fontSize: "13px",
              color: structuralStatusB.includes("kollaps")
                ? "#F87171"
                : "#10B981",
            }}
          >
            Status: {structuralStatusB}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid #1F2937",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: 500,
            color: deltaMargin < 0 ? "#F87171" : "#10B981",
            marginBottom: "8px",
          }}
        >
          Δ Margin: {deltaMargin.toFixed(2)} p.p.
        </div>
        <div style={{ fontSize: "13px", color: "#9CA3AF" }}>
          {tippingLabel}:{" "}
          {tippingStep ? `Q${tippingStep}` : noTippingText}
        </div>
      </div>
    </div>
  );
};

