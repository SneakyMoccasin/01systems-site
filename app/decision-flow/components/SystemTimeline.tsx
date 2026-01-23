"use client";

import BevisTimeline from "./BevisTimeline";
import DecisionTimeline from "./DecisionTimeline";

// System timeline component
// Shows Bevis timeline in Bevis mode, Decision timeline in Decision mode

type SystemTimelineProps = {
  mode: "decision" | "bevis";
  planAData?: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>;
  planBData?: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>;
  breakpoint?: number;
  decisionTimelineData?: Array<{ time: number; belastning: number; kapacitet: number; aterhamtning: number }>;
};

export default function SystemTimeline({ mode, planAData, planBData, breakpoint, decisionTimelineData }: SystemTimelineProps) {
  if (mode === "bevis" && planAData && planBData) {
    return <BevisTimeline planAData={planAData} planBData={planBData} breakpoint={breakpoint} />;
  }

  // Decision mode timeline
  if (mode === "decision" && decisionTimelineData) {
    return <DecisionTimeline timelineData={decisionTimelineData} />;
  }

  // Fallback placeholder
  return (
    <div style={{
      padding: 16,
      background: "#1a1a1a",
      border: "1px solid #2f333a",
      borderRadius: 8,
      minHeight: 400
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#e6edf3" }}>
        System Timeline
      </h3>
      <p style={{ fontSize: 12, color: "#9ca3af" }}>
        Loading timeline...
      </p>
    </div>
  );
}
