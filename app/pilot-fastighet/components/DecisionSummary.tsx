import React from "react";

type Props = {
  interestBefore: string;
  interestAfter: string;
  refinancingBefore: string;
  refinancingAfter: string;
  externalBefore: string;
  externalAfter: string;
};

export function DecisionSummary({
  interestBefore,
  interestAfter,
  refinancingBefore,
  refinancingAfter,
  externalBefore,
  externalAfter,
}: Props) {
  return (
    <div
      style={{
        background: "rgba(17, 24, 39, 0.9)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "10px",
        padding: "14px",
        maxWidth: "360px",
        minWidth: "300px",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#9CA3AF",
          marginBottom: "8px",
        }}
      >
        Decision Tested
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "#e5e7eb" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#9CA3AF" }}>Interest exposure</span>
          <span style={{ whiteSpace: "nowrap" }}>
            {interestBefore}
            <span style={{ color: "#9CA3AF" }}> → </span>
            {interestAfter}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#9CA3AF" }}>Refinancing pressure</span>
          <span style={{ whiteSpace: "nowrap" }}>
            {refinancingBefore}
            <span style={{ color: "#9CA3AF" }}> → </span>
            {refinancingAfter}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#9CA3AF" }}>External pressure</span>
          <span style={{ whiteSpace: "nowrap" }}>
            {externalBefore}
            <span style={{ color: "#9CA3AF" }}> → </span>
            {externalAfter}
          </span>
        </div>
      </div>
    </div>
  );
}

