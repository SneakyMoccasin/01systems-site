"use client";

import React, { type ReactNode } from "react";

type Props = {
  appearance: "light" | "dark";
  title: string;
  subtitle: string;
  closeLabel: string;
  onClose: () => void;
  children?: ReactNode;
};

export default function ExpertModeSurface({
  appearance,
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
}: Props) {
  return (
    <aside
      data-expert-mode
      data-expert-appearance={appearance}
      aria-label={title}
      style={{
        position: "fixed",
        insetBlock: 0,
        right: 0,
        width: "clamp(360px, 38vw, 620px)",
        maxWidth: "calc(100vw - 24px)",
        zIndex: 1000,
        boxSizing: "border-box",
        padding: "24px",
        color: "var(--ce-text-primary)",
        background: "var(--ce-surface-elevated)",
        borderLeft: "1px solid var(--ce-border)",
        boxShadow: "-10px 0 28px var(--ce-shadow)",
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehavior: "contain",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: -24,
          zIndex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          margin: "-24px -24px 28px",
          padding: "24px 24px 20px",
          background: "var(--ce-surface-elevated)",
          borderBottom: "1px solid var(--ce-border)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--ce-text-primary)", overflowWrap: "anywhere" }}>
            {title}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--ce-text-secondary)", lineHeight: 1.45, overflowWrap: "anywhere" }}>
            {subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          style={{
            flexShrink: 0,
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            background: "var(--ce-control-bg)",
            border: "1px solid var(--ce-border)",
            borderRadius: "6px",
            color: "var(--ce-text-secondary)",
            fontSize: "16px",
            cursor: "pointer",
            lineHeight: 1,
            outlineColor: "var(--ce-focus-ring)",
          }}
        >
          ×
        </button>
      </header>
      <div style={{ minWidth: 0 }}>{children}</div>
    </aside>
  );
}
