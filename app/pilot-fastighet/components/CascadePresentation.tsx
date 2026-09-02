import React from "react";
import {
  CASCADE_PRESENTATION,
  getCascadePresentationCopy,
  getCascadeScenarioPresentation,
  type CascadePresentationLanguage,
  type CascadeScenarioId,
} from "@/src/pilotFastighet/cascadePresentation";

export function CascadeGraphHeading({
  language,
  context,
  compact = false,
  textColor = CASCADE_PRESENTATION.text.primary,
  mutedColor = CASCADE_PRESENTATION.text.secondary,
}: {
  language: CascadePresentationLanguage;
  context?: string;
  compact?: boolean;
  textColor?: string;
  mutedColor?: string;
}) {
  const copy = getCascadePresentationCopy(language);
  return (
    <div style={{ marginBottom: compact ? 3 : 6 }}>
      <div
        style={{
          color: textColor,
          fontSize: compact ? 11 : CASCADE_PRESENTATION.typography.sectionTitleSize,
          fontWeight: CASCADE_PRESENTATION.typography.titleWeight,
          lineHeight: 1.2,
        }}
      >
        {copy.structuralMargin}
      </div>
      {context && (
        <div
          style={{
            color: mutedColor,
            fontSize: compact ? 9 : CASCADE_PRESENTATION.typography.bodySize,
            lineHeight: 1.35,
            marginTop: 2,
          }}
        >
          {context}
        </div>
      )}
    </div>
  );
}

export function CascadeModelPeriodKey({
  language,
  compact = false,
}: {
  language: CascadePresentationLanguage;
  compact?: boolean;
}) {
  const copy = getCascadePresentationCopy(language);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        border: `1px solid ${CASCADE_PRESENTATION.borders.emphasis}`,
        borderRadius: CASCADE_PRESENTATION.radii.pill,
        padding: compact ? "2px 6px" : "3px 8px",
        color: CASCADE_PRESENTATION.text.secondary,
        background: "rgba(15, 23, 42, 0.62)",
        fontSize: compact ? 8.5 : 10,
        fontWeight: 650,
        letterSpacing: "0.02em",
      }}
    >
      {copy.modelPeriod}
    </span>
  );
}

export function CascadeScenarioIdentity({
  scenario,
  label,
  compact = false,
}: {
  scenario: CascadeScenarioId;
  label?: string;
  compact?: boolean;
}) {
  const presentation = getCascadeScenarioPresentation(scenario);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 4 : 6,
        minWidth: 0,
        color: presentation.color,
        fontSize: compact ? 10 : 11,
        fontWeight: 700,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: compact ? 12 : 16,
          borderTop: `2px ${presentation.lineDash ? "dashed" : "solid"} ${presentation.color}`,
          flexShrink: 0,
        }}
      />
      <span>{scenario}</span>
      {label && <span style={{ color: CASCADE_PRESENTATION.text.secondary, fontWeight: 500 }}>{label}</span>}
    </span>
  );
}

export function CascadeHumanJudgementBoundary({
  language,
  compact = false,
}: {
  language: CascadePresentationLanguage;
  compact?: boolean;
}) {
  const copy = getCascadePresentationCopy(language);
  return (
    <div
      role="note"
      style={{
        width: "fit-content",
        borderLeft: `2px solid ${CASCADE_PRESENTATION.constraints.neutral}`,
        padding: compact ? "3px 7px" : "5px 9px",
        color: compact ? "#BAE6FD" : CASCADE_PRESENTATION.text.secondary,
        background: "rgba(15, 23, 42, 0.42)",
        fontSize: compact ? 9 : 11,
        fontWeight: 650,
        lineHeight: 1.35,
      }}
    >
      {copy.comparisonBoundary}
    </div>
  );
}
