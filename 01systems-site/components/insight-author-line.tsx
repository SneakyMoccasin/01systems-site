"use client";

import { useLanguage } from "@/components/language-context";

type Props = {
  compact?: boolean;
  style?: React.CSSProperties;
};

export function InsightAuthorLine({ compact = false, style }: Props) {
  const { lang } = useLanguage();

  return (
    <p
      style={{
        color: "var(--text-muted)",
        fontSize: compact ? "14px" : "15px",
        lineHeight: compact ? 1.5 : 1.55,
        margin: 0,
        ...style,
      }}
    >
      {lang === "sv"
        ? "Skriven av Christian Strandek"
        : "Written by Christian Strandek"}
    </p>
  );
}
