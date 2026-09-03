import React from "react";
import { CASCADE_PRESENTATION } from "@/src/pilotFastighet/cascadePresentation";
import { getOrderedScenarioSchedule } from "@/src/pilotFastighet/analysis/manualScheduledExecution";
import type {
  ScenarioExecutionProvenance,
  ScenarioSchedules,
} from "@/src/pilotFastighet/analysis/reactScheduledAnalysisBoundary";

type Props = Readonly<{
  language: "sv" | "en";
  schedules: ScenarioSchedules;
  revealedProvenance: ScenarioExecutionProvenance;
  actionLabel: (actionId: string, language: "sv" | "en") => string;
  colors: Readonly<{
    text: string;
    secondaryText: string;
    border: string;
    surface: string;
  }>;
}>;

export default function CompactScheduleSummary({
  language,
  schedules,
  revealedProvenance,
  actionLabel,
  colors,
}: Props) {
  const hasScheduledEvidence = schedules.A.length > 0 || schedules.B.length > 0;
  if (!hasScheduledEvidence) return null;

  return (
    <section
      data-testid="compact-schedule-summary"
      aria-label={language === "sv" ? "Åtgärdsschema" : "Action schedule"}
      style={{
        display: "flex",
        alignItems: "baseline",
        flexWrap: "wrap",
        gap: "7px 14px",
        marginBottom: 10,
        padding: "7px 0",
        borderBottom: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      <strong style={{ fontWeight: 650 }}>
        {language === "sv" ? "Tidsatta åtgärder" : "Scheduled actions"}
      </strong>
      {(["A", "B"] as const).map((scenario) => {
        const planned = getOrderedScenarioSchedule(schedules, scenario);
        if (planned.length === 0) return null;
        const executed = revealedProvenance[scenario];
        const scenarioColor = CASCADE_PRESENTATION.scenarios[scenario].color;
        return (
          <span
            key={scenario}
            data-scenario={scenario}
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              gap: "3px 6px",
              minWidth: 0,
              borderLeft: `2px ${scenario === "A" ? "solid" : "dashed"} ${scenarioColor}`,
              paddingLeft: 7,
            }}
          >
            <strong>{`Scenario ${scenario}`}</strong>
            {planned.map((entry) => {
              const execution = executed.find((item) => item.actionId === entry.actionId);
              const actual = execution
                ? ` · ${language === "sv" ? "utförd" : "executed"} M${execution.actualExecutionStep}`
                : "";
              return (
                <span key={entry.actionId} style={{ color: colors.secondaryText, overflowWrap: "anywhere" }}>
                  {`${actionLabel(entry.actionId, language)} — M${entry.executionStep}${actual}`}
                </span>
              );
            })}
          </span>
        );
      })}
    </section>
  );
}
