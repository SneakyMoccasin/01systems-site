import React from "react";
import type { DomainKey } from "@/src/i18n/pulseLanguage";

type Props = Readonly<{
  language: "sv" | "en";
  value: DomainKey;
  labels: Readonly<Record<DomainKey, string>>;
  disabled?: boolean;
  onChange: (domain: DomainKey) => void;
  colors: Readonly<{
    background: string;
    text: string;
    border: string;
  }>;
}>;

export default function DomainSelector({
  language,
  value,
  labels,
  disabled = false,
  onChange,
  colors,
}: Props) {
  const label = language === "sv" ? "Domän" : "Domain";

  return (
    <label
      data-testid="primary-domain-control"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
    >
      <span>{`${label}:`}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as DomainKey)}
        style={{
          background: colors.background,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 13,
          minWidth: 158,
        }}
      >
        <option value="realEstate">{labels.realEstate}</option>
        <option value="municipal">{labels.municipal}</option>
        <option value="consulting">{labels.consulting}</option>
      </select>
    </label>
  );
}
