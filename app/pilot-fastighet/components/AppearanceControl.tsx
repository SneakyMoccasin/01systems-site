"use client";

import type { CascadeAppearancePreference } from "@/src/pilotFastighet/appearancePreference";

export default function AppearanceControl({
  language,
  value,
  onChange,
}: {
  language: "sv" | "en";
  value: CascadeAppearancePreference;
  onChange: (value: CascadeAppearancePreference) => void;
}) {
  const copy = language === "sv"
    ? { label: "Utseende", system: "System", light: "Ljust", dark: "Mörkt" }
    : { label: "Appearance", system: "System", light: "Light", dark: "Dark" };
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ce-text-secondary)", fontSize: 11 }}>
      <span>{copy.label}</span>
      <select
        aria-label={copy.label}
        value={value}
        onChange={(event) => onChange(event.target.value as CascadeAppearancePreference)}
        style={{ padding: "5px 26px 5px 8px", borderRadius: 5, border: "1px solid var(--ce-border)", background: "var(--ce-control-bg)", color: "var(--ce-text-primary)", fontSize: 11, cursor: "pointer", outlineColor: "var(--ce-focus-ring)" }}
      >
        <option value="system">{copy.system}</option>
        <option value="light">{copy.light}</option>
        <option value="dark">{copy.dark}</option>
      </select>
    </label>
  );
}
