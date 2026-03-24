"use client";

// Demo-only Decision Flow controls
// Temporary implementation for walkthrough

type DecisionControlsProps = {
  inflow: number;
  onInflowChange: (value: number) => void;
};

export default function DecisionControls({ inflow, onInflowChange }: DecisionControlsProps) {
  return (
    <div style={{
      padding: 16,
      background: "#1a1a1a",
      border: "1px solid #2f333a",
      borderRadius: 8
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "#e6edf3" }}>
        Beslutsparametrar
      </h3>
      
      {/* Inflow slider */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: "block", 
          fontSize: 13, 
          marginBottom: 8, 
          color: "#9ca3af" 
        }}>
          Inflöde: {inflow.toFixed(2)}
        </label>
        <input
          type="range"
          min="1.0"
          max="1.6"
          step="0.05"
          value={inflow}
          onChange={(e) => onInflowChange(parseFloat(e.target.value))}
          style={{
            width: "100%",
            height: 8,
            outline: "none",
            cursor: "pointer"
          }}
        />
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          fontSize: 11, 
          color: "#6b7280",
          marginTop: 4
        }}>
          <span>1.0</span>
          <span>1.6</span>
        </div>
      </div>
    </div>
  );
}
