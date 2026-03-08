import React from "react";

/**
 * AIInterpretationPanel
 * 
 * READ-ONLY UI component for displaying AI interpretation data.
 * This component is strictly read-only and does not modify any simulation state,
 * AI logic, or trigger any recomputation or side effects.
 * 
 * It only reads and displays data from a parsed ai_interpretation.json object.
 * This is UI-only and deterministic, and safe to remove without affecting the system.
 */

// UI-only help layer - does not affect data or behavior
interface HelpHintProps {
  text: string;
}

function HelpHint({ text }: HelpHintProps) {
  return (
    <span className="help-hint" style={{ position: "relative", display: "inline-block", marginLeft: 6, cursor: "help" }}>
      <span style={{ opacity: 0.6, fontSize: "0.85em" }}>ⓘ</span>
      <span
        className="help-tooltip"
        style={{
          display: "none",
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: 6,
          padding: "6px 10px",
          background: "#1a1a1a",
          color: "#e6edf3",
          fontSize: "12px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          zIndex: 1000,
          border: "1px solid #2f333a",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)"
        }}
      >
        {text}
      </span>
    </span>
  );
}

interface AIInterpretation {
  metadata: {
    inputSource: string;
    contractVersion: string;
    timestamp: string;
  };
  summary: {
    phase: string;
    risk_level: string;
    collapse_window: string | number;
  };
}

interface AIInterpretationPanelProps {
  data: AIInterpretation;
}

export default function AIInterpretationPanel({ data }: AIInterpretationPanelProps): React.ReactElement {
  return (
    <div className="ai-interpretation-panel">
      <style>{`
        .help-hint:hover .help-tooltip {
          display: block;
        }
      `}</style>
      {/* Header */}
      <div className="panel-section">
        <h3>AI Interpretation</h3>
        <p>Read-only system analysis</p>
      </div>

      {/* System Meta */}
      <div className="panel-section">
        <h3>
          System Meta
          <HelpHint text="Technical metadata describing the AI interpretation run." />
        </h3>
        <div>
          <div>Source: {data.metadata.inputSource}</div>
          <div>Contract version: {data.metadata.contractVersion}</div>
          <div>Timestamp: {data.metadata.timestamp}</div>
        </div>
      </div>

      {/* Summary */}
      <div className="panel-section">
        <h3>
          Summary
          <HelpHint text="High-level assessment of system behavior over time." />
        </h3>
        <div>
          <div>Phase: {data.summary.phase}</div>
          <div>Risk level: {data.summary.risk_level}</div>
          <div>Collapse window: {data.summary.collapse_window}</div>
        </div>
      </div>
    </div>
  );
}
