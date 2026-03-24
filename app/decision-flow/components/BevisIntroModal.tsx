"use client";

import { useState, useEffect } from "react";

export default function BevisIntroModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if intro has been shown in this session
    const hasSeenIntro = sessionStorage.getItem("bevisIntroShown");
    if (!hasSeenIntro) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("bevisIntroShown", "true");
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #2f333a",
          borderRadius: 8,
          padding: 32,
          maxWidth: 500,
          color: "#e6edf3"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
          Bevis – Ledningsvy
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
          Här visas konsekvenser av beslut över tid.
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Jämför nuvarande plan med ett alternativ för att förstå hur verksamheten utvecklas.
        </p>
        <button
          onClick={handleDismiss}
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
          Förstått
        </button>
      </div>
    </div>
  );
}
