"use client";

type UnifiedHeaderProps = {
  mode: "decision" | "bevis";
  onModeChange: (mode: "decision" | "bevis") => void;
  onPrimaryAction: () => void;
};

export default function UnifiedHeader({ mode, onModeChange, onPrimaryAction }: UnifiedHeaderProps) {
  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "#0e1117",
      borderBottom: "1px solid #2f333a",
      padding: "16px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 24
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#e6edf3", margin: 0 }}>
          Pulse — Operativ ledning
        </h1>
        
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => onModeChange("decision")}
            style={{
              padding: "6px 12px",
              background: mode === "decision" ? "#2563eb" : "transparent",
              border: `1px solid ${mode === "decision" ? "#2563eb" : "#2f333a"}`,
              borderRadius: 4,
              color: mode === "decision" ? "#ffffff" : "#9ca3af",
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            Decision (Arbeta)
          </button>
          <button
            onClick={() => onModeChange("bevis")}
            style={{
              padding: "6px 12px",
              background: mode === "bevis" ? "#2563eb" : "transparent",
              border: `1px solid ${mode === "bevis" ? "#2563eb" : "#2f333a"}`,
              borderRadius: 4,
              color: mode === "bevis" ? "#ffffff" : "#9ca3af",
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            Bevis (Ledningsvy)
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Case selector placeholder */}
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          TODO: Case selector
        </div>
        
        {/* Run status placeholder */}
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          TODO: Run status
        </div>
        
        {/* Primary button - only show in Decision mode (Bevis is read-only) */}
        {mode === "decision" && (
          <button
            onClick={onPrimaryAction}
            style={{
              padding: "8px 16px",
              background: "#2563eb",
              border: "none",
              borderRadius: 4,
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Simulera
          </button>
        )}
      </div>
    </header>
  );
}
