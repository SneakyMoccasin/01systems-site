"use client";

type Props = {
  compact?: boolean;
  style?: React.CSSProperties;
};

export function InsightAuthorLine({ compact = false, style }: Props) {
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
      Written by Christian Strandek
    </p>
  );
}
