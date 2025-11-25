"use client";

import { useState, useEffect } from "react";
import { useWorld } from "../core/worldState";
import { findDynamicSpreadPosition } from "../core/poissonHelper";

export default function DebugPanel() {
  const { addEntity, clearEntities, uiVisible } = useWorld();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [clickedButton, setClickedButton] = useState<string | null>(null);
  const [shimmerButton, setShimmerButton] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [pulseTime, setPulseTime] = useState(0);

  const leftButtonStyle: React.CSSProperties = {
    width: "130px",
    height: "34px",
    padding: "0 14px",
    lineHeight: "34px",
    marginBottom: "8px",
    borderRadius: "8px",
    backdropFilter: "blur(12px)",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(0,255,255,0.25)",
    color: "#e8ffff",
    boxShadow: "inset 0 0 6px rgba(255,255,255,0.09)",
    fontWeight: 500,
    fontSize: "14px",
    cursor: "pointer",
    pointerEvents: "auto",
    transition: "background 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
  };

  const leftButtonHoverStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.45)",
    border: "1px solid rgba(0,255,255,0.35)",
    boxShadow: "0 0 12px rgba(0,255,255,0.25)",
  };

  const leftButtonClickStyle: React.CSSProperties = {
    transform: "scale(1.03)",
    boxShadow: "0 0 14px rgba(0,255,255,0.22)",
  };

  const shimmerStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    background: "linear-gradient(120deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.10) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.10) 55%, rgba(255,255,255,0.0) 100%)",
    opacity: 0,
    transform: "translateX(-62%)",
    transition: "opacity 180ms ease, transform 220ms ease",
  };

  const shimmerActiveStyle: React.CSSProperties = {
    opacity: 1,
    transform: "translateX(38%)",
  };

  const tooltipBaseStyle: React.CSSProperties = {
    position: "absolute",
    left: "calc(100% + 12px)",
    top: "50%",
    transform: "translateY(-50%)",
    padding: "4px 8px",
    minWidth: "auto",
    maxWidth: "160px",
    width: "max-content",
    background: "rgba(0,0,0,0.30)",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(0,255,255,0.20)",
    borderRadius: "6px",
    boxShadow: "0 0 6px rgba(0,255,255,0.08)",
    color: "#7FF7FF",
    fontSize: "13px",
    whiteSpace: "nowrap",
    opacity: 0,
    transition: "opacity 120ms ease",
    pointerEvents: "none",
    zIndex: 10,
  };

  const tooltipVisibleStyle: React.CSSProperties = {
    opacity: 1,
  };

  useEffect(() => {
    if (!uiVisible) return;

    const id = setInterval(() => {
      setPulseTime((t) => t + 0.06); // smooth pulse
    }, 16); // ~60fps

    return () => clearInterval(id);
  }, [uiVisible]);

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
        @keyframes tooltipUnderlinePulse {
          0%   { opacity: 0.4; transform: scaleX(0.7); }
          50%  { opacity: 1.0; transform: scaleX(1.0); }
          100% { opacity: 0.4; transform: scaleX(0.7); }
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
        @keyframes hudGlowPulse {
          0% {
            box-shadow: 0 0 14px rgba(0,255,255,0.05);
            border-color: rgba(0,255,255,0.08);
          }
          50% {
            box-shadow: 0 0 22px rgba(0,255,255,0.15);
            border-color: rgba(0,255,255,0.16);
          }
          100% {
            box-shadow: 0 0 14px rgba(0,255,255,0.05);
            border-color: rgba(0,255,255,0.08);
          }
        }
        @keyframes hudActivationWave {
          0% {
            opacity: 0.0;
            box-shadow: 0 0 0px rgba(0,255,255,0.0);
            background: rgba(0,255,255,0.0);
          }
          40% {
            opacity: 0.22;
            box-shadow: 0 0 22px rgba(0,255,255,0.35);
            background: rgba(0,255,255,0.15);
          }
          100% {
            opacity: 0.0;
            box-shadow: 0 0 0px rgba(0,255,255,0.0);
            background: rgba(0,255,255,0.0);
          }
        }
        .activation-wave {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          animation: hudActivationWave 0.65s ease-out forwards;
        }
      `}</style>
    <div
      className="hudPanel"
      style={{
        position: "absolute",
        bottom: "22px",
        left: "22px",
        width: "fit-content",
        padding: "14px 16px",
        background: "rgba(0,0,0,0.22)",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(0,255,255,0.10)",
        borderRadius: "14px",
        boxShadow: "0 0 18px rgba(0,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "auto",
        zIndex: 5,
        transition: "box-shadow 2.0s ease, border-color 2.0s ease",
        animation: uiVisible ? "hudGlowPulse 4s ease-in-out infinite" : "none",
      }}
    >
      <div style={{ position: "relative" }}>
        {uiVisible && <div className="activation-wave" />}
        {/* --- AI PULSE HUD HEADER BAR --- */}
        <div
        style={{
          position: "absolute",
          top: "-2px",
          left: "4px",
          right: "4px",
          height: "2px",
          // Color shifts: cyan → blue-green → cyan
          background: `linear-gradient(
            90deg,
            rgba(0,255,255,${0.25 + Math.sin(pulseTime) * 0.15}) 0%,
            rgba(0,180,255,${0.20 + Math.sin(pulseTime + 1.2) * 0.10}) 50%,
            rgba(0,255,255,${0.25 + Math.sin(pulseTime + 2.1) * 0.15}) 100%
          )`,
          borderRadius: "2px",
          boxShadow: `0 0 ${6 + Math.sin(pulseTime) * 2}px rgba(0,255,255,0.25)`,
          // Smooth visual performance
          transition: "background 120ms ease",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-5px",
          left: "4px",
          right: "4px",
          height: "12px",
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0.0) 100%)",
          filter: "blur(8px)",
          pointerEvents: "none",
          zIndex: -1,
          opacity: 0.40,
        }}
      />
      <div style={{ position: "relative" }}>
        <button
          onClick={(e) => {
            createRipple(e);
            const type = "unit";
            const role = "generic";
            const pos = findDynamicSpreadPosition(type);
            addEntity({
              type,
              role,
              x: pos.x,
              y: pos.y,
            });
            setClickedButton("unit");
            setTimeout(() => setClickedButton(null), 120);
          }}
          style={{ 
            position: "relative", 
            overflow: "hidden", 
            ...leftButtonStyle,
            ...(hoveredButton === "unit" ? leftButtonHoverStyle : {}),
            ...(clickedButton === "unit" ? leftButtonClickStyle : {})
          }}
          onMouseEnter={() => {
            setHoveredButton("unit");
            setShimmerButton("unit");
            setActiveTooltip("unit");
            setTimeout(() => setShimmerButton(null), 220);
          }}
          onMouseLeave={() => {
            setHoveredButton(null);
            setActiveTooltip(null);
          }}
        >
          Spawn Unit
          <div style={{
            ...shimmerStyle,
            ...(shimmerButton === "unit" ? shimmerActiveStyle : {})
          }} />
        </button>
        {uiVisible && activeTooltip === "unit" && (
          <div style={{ ...tooltipBaseStyle, ...tooltipVisibleStyle }}>
            Spawn Unit
            <div style={{
              marginTop: "3px",
              height: "2px",
              width: "70%",
              background: "rgba(0,255,255,0.35)",
              animation: "tooltipUnderlinePulse 1.6s ease-in-out infinite",
            }} />
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button
          onClick={(e) => {
            createRipple(e);
            const type = "prop";
            const role = "generic";
            const pos = findDynamicSpreadPosition(type);
            addEntity({
              type,
              role,
              x: pos.x,
              y: pos.y,
            });
            setClickedButton("prop");
            setTimeout(() => setClickedButton(null), 120);
          }}
          style={{ 
            position: "relative", 
            overflow: "hidden", 
            ...leftButtonStyle,
            ...(hoveredButton === "prop" ? leftButtonHoverStyle : {}),
            ...(clickedButton === "prop" ? leftButtonClickStyle : {})
          }}
          onMouseEnter={() => {
            setHoveredButton("prop");
            setShimmerButton("prop");
            setActiveTooltip("prop");
            setTimeout(() => setShimmerButton(null), 220);
          }}
          onMouseLeave={() => {
            setHoveredButton(null);
            setActiveTooltip(null);
          }}
        >
          Spawn Prop
          <div style={{
            ...shimmerStyle,
            ...(shimmerButton === "prop" ? shimmerActiveStyle : {})
          }} />
        </button>
        {uiVisible && activeTooltip === "prop" && (
          <div style={{ ...tooltipBaseStyle, ...tooltipVisibleStyle }}>
            Spawn Prop
            <div style={{
              marginTop: "3px",
              height: "2px",
              width: "70%",
              background: "rgba(0,255,255,0.35)",
              animation: "tooltipUnderlinePulse 1.6s ease-in-out infinite",
            }} />
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button
          onClick={(e) => {
            createRipple(e);
            const type = "marker";
            const role = "generic";
            const pos = findDynamicSpreadPosition(type);
            addEntity({
              type,
              role,
              x: pos.x,
              y: pos.y,
            });
            setClickedButton("marker");
            setTimeout(() => setClickedButton(null), 120);
          }}
          style={{ 
            position: "relative", 
            overflow: "hidden", 
            ...leftButtonStyle,
            ...(hoveredButton === "marker" ? leftButtonHoverStyle : {}),
            ...(clickedButton === "marker" ? leftButtonClickStyle : {})
          }}
          onMouseEnter={() => {
            setHoveredButton("marker");
            setShimmerButton("marker");
            setActiveTooltip("marker");
            setTimeout(() => setShimmerButton(null), 220);
          }}
          onMouseLeave={() => {
            setHoveredButton(null);
            setActiveTooltip(null);
          }}
        >
          Spawn Marker
          <div style={{
            ...shimmerStyle,
            ...(shimmerButton === "marker" ? shimmerActiveStyle : {})
          }} />
        </button>
        {uiVisible && activeTooltip === "marker" && (
          <div style={{ ...tooltipBaseStyle, ...tooltipVisibleStyle }}>
            Spawn Marker
            <div style={{
              marginTop: "3px",
              height: "2px",
              width: "70%",
              background: "rgba(0,255,255,0.35)",
              animation: "tooltipUnderlinePulse 1.6s ease-in-out infinite",
            }} />
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button
          onClick={(e) => {
            createRipple(e);
            const type = "effect";
            const role = "signal";
            const pos = findDynamicSpreadPosition(type);
            addEntity({
              type,
              role,
              x: pos.x,
              y: pos.y,
            });
            setClickedButton("effect");
            setTimeout(() => setClickedButton(null), 120);
          }}
          style={{ 
            position: "relative", 
            overflow: "hidden", 
            ...leftButtonStyle,
            ...(hoveredButton === "effect" ? leftButtonHoverStyle : {}),
            ...(clickedButton === "effect" ? leftButtonClickStyle : {})
          }}
          onMouseEnter={() => {
            setHoveredButton("effect");
            setShimmerButton("effect");
            setActiveTooltip("effect");
            setTimeout(() => setShimmerButton(null), 220);
          }}
          onMouseLeave={() => {
            setHoveredButton(null);
            setActiveTooltip(null);
          }}
        >
          Spawn Effect
          <div style={{
            ...shimmerStyle,
            ...(shimmerButton === "effect" ? shimmerActiveStyle : {})
          }} />
        </button>
        {uiVisible && activeTooltip === "effect" && (
          <div style={{ ...tooltipBaseStyle, ...tooltipVisibleStyle }}>
            Spawn Effect
            <div style={{
              marginTop: "3px",
              height: "2px",
              width: "70%",
              background: "rgba(0,255,255,0.35)",
              animation: "tooltipUnderlinePulse 1.6s ease-in-out infinite",
            }} />
          </div>
        )}
      </div>

      <div style={{ position: "relative" }}>
        <button
          onClick={(e) => {
            createRipple(e);
            clearEntities();
            setClickedButton("clear");
            setTimeout(() => setClickedButton(null), 120);
          }}
          style={{ 
            position: "relative", 
            overflow: "hidden", 
            ...leftButtonStyle,
            ...(hoveredButton === "clear" ? leftButtonHoverStyle : {}),
            ...(clickedButton === "clear" ? leftButtonClickStyle : {})
          }}
          onMouseEnter={() => {
            setHoveredButton("clear");
            setShimmerButton("clear");
            setActiveTooltip("clear");
            setTimeout(() => setShimmerButton(null), 220);
          }}
          onMouseLeave={() => {
            setHoveredButton(null);
            setActiveTooltip(null);
          }}
        >
          Clear All
          <div style={{
            ...shimmerStyle,
            ...(shimmerButton === "clear" ? shimmerActiveStyle : {})
          }} />
        </button>
        {uiVisible && activeTooltip === "clear" && (
          <div style={{ ...tooltipBaseStyle, ...tooltipVisibleStyle }}>
            Clear All
            <div style={{
              marginTop: "3px",
              height: "2px",
              width: "70%",
              background: "rgba(0,255,255,0.35)",
              animation: "tooltipUnderlinePulse 1.6s ease-in-out infinite",
            }} />
          </div>
        )}
      </div>
      </div>
    </div>
    </>
  );
}
