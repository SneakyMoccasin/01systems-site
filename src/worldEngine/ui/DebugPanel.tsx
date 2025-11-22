"use client";

import { useWorld } from "../core/worldState";

export default function DebugPanel() {
  const { addEntity, clearEntities } = useWorld();

  const leftButtonStyle: React.CSSProperties = {
    width: "130px",
    padding: "10px 12px",
    marginBottom: "8px",
    borderRadius: "10px",
    backdropFilter: "blur(12px)",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid #00e5ff",
    color: "#e8ffff",
    boxShadow: "0 0 0px rgba(0,229,255,0.0)",
    transition: "all 0.25s ease",
    animation: "none",        // ← ensure no pulse normally
    fontWeight: 500,
    fontSize: "14px",
    cursor: "pointer",
    pointerEvents: "auto",
  };

  const leftButtonHoverStyle: React.CSSProperties = {
    border: "1px solid #00e5ff",
    transform: "scale(1.03)",
    boxShadow: "0 0 10px rgba(0,229,255,0.65), 0 0 20px rgba(0,229,255,0.25)",
    animation: "buttonPulse 1.3s infinite ease-in-out", // ← pulse ONLY on hover
  };

  function createRipple(e: React.MouseEvent<HTMLElement>) {
    const button = e.currentTarget;
    
    // Remove any existing ripple
    const old = button.querySelector(".ripple-effect");
    if (old) old.remove();

    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple-effect";
    
    const size = Math.max(rect.width, rect.height) * 1.8;
    ripple.style.width = ripple.style.height = `${size}px`;

    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);
  }

  return (
    <>
      <style jsx>{`
        @keyframes buttonPulse {
          0% { box-shadow: 0 0 6px rgba(0,229,255,0.25); }
          50% { box-shadow: 0 0 12px rgba(0,229,255,0.55); }
          100% { box-shadow: 0 0 6px rgba(0,229,255,0.25); }
        }
        .ripple-effect {
          position: absolute;
          border-radius: 50%;
          background: rgba(0,229,255,0.45);
          transform: scale(0);
          animation: rippleAnim 0.45s ease-out forwards;
          pointer-events: none;
        }
        @keyframes rippleAnim {
          from {
            transform: scale(0);
            opacity: 0.8;
          }
          to {
            transform: scale(3.2);
            opacity: 0;
          }
        }
      `}</style>
    <div
      style={{
        position: "absolute",
        top: "40px",
        left: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      <button
        onClick={(e) => {
          createRipple(e);
          addEntity({
            type: "unit",
            role: "generic",
            x: Math.random() * 400,
            y: Math.random() * 300,
          });
        }}
        style={{ position: "relative", overflow: "hidden", ...leftButtonStyle }}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, leftButtonHoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, leftButtonStyle);
        }}
      >
        Spawn Unit
      </button>

      <button
        onClick={(e) => {
          createRipple(e);
          addEntity({
            type: "prop",
            role: "generic",
            x: Math.random() * 400,
            y: Math.random() * 300,
          });
        }}
        style={{ position: "relative", overflow: "hidden", ...leftButtonStyle }}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, leftButtonHoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, leftButtonStyle);
        }}
      >
        Spawn Prop
      </button>

      <button
        onClick={(e) => {
          createRipple(e);
          addEntity({
            type: "marker",
            role: "generic",
            x: Math.random() * 400,
            y: Math.random() * 300,
          });
        }}
        style={{ position: "relative", overflow: "hidden", ...leftButtonStyle }}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, leftButtonHoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, leftButtonStyle);
        }}
      >
        Spawn Marker
      </button>

      <button
        onClick={(e) => {
          createRipple(e);
          addEntity({
            type: "effect",
            role: "signal",
            x: Math.random() * 400,
            y: Math.random() * 300,
          });
        }}
        style={{ position: "relative", overflow: "hidden", ...leftButtonStyle }}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, leftButtonHoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, leftButtonStyle);
        }}
      >
        Spawn Effect
      </button>

      <button
        onClick={(e) => {
          createRipple(e);
          clearEntities();
        }}
        style={{ position: "relative", overflow: "hidden", ...leftButtonStyle }}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, leftButtonHoverStyle);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, leftButtonStyle);
        }}
      >
        Clear All
      </button>
    </div>
    </>
  );
}
