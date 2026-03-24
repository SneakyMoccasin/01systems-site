"use client";

import React, { useState } from "react";

const DRIVERS = [
  "Interest exposure",
  "Refinancing pressure",
  "External pressure",
  "Operational efficiency",
  "Capital buffer",
  "Strategic decisions",
] as const;

export function DriverPanel() {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  return (
    <div
      style={{
        background: "#0f1115",
        padding: "16px",
        borderRadius: "6px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          letterSpacing: "0.08em",
          color: "#9ca3af",
          marginBottom: "12px",
        }}
      >
        DRIVERS
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {DRIVERS.map((driver, index) => {
          const isSelected = selectedDriver === driver;
          return (
            <React.Fragment key={driver}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDriver(driver)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedDriver(driver);
                  }
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 6px",
                  cursor: "pointer",
                  color: isSelected ? "#e5e7eb" : "rgba(229, 231, 235, 0.7)",
                  background: isSelected ? "#1e232b" : undefined,
                  borderLeft: isSelected ? "3px solid #60a5fa" : "3px solid transparent",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#151a20";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "";
                  }
                }}
              >
                <span>{driver}</span>
                <span style={{ color: "#9ca3af", fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>
                  —
                </span>
              </div>
              {index < DRIVERS.length - 1 && (
                <div
                  style={{
                    height: "1px",
                    background: "rgba(255, 255, 255, 0.06)",
                    marginLeft: "6px",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
