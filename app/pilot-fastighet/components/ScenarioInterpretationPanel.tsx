import React from "react";
import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import type { ScenarioChange } from "@/lib/scenarioParser";
import type { RiskLevel } from "@/lib/scenarioParser";

type Language = "sv" | "en";

const PARAM_TO_RISK_KEY: Record<string, string> = {
  "Tenant Stability": "tenantStabilityRisk",
  "Energy Exposure": "energyExposureRisk",
  "Interest Rate Exposure": "interestRateExposureRisk",
  "Maintenance Intensity": "maintenanceIntensityRisk",
  "Refinancing Risk": "refinancingRisk",
  "Demand Risk": "demandRisk",
  "Pricing Power Risk": "pricingPowerRisk",
  "Operational Efficiency Risk": "operationalEfficiencyRisk",
  "Market Volatility Risk": "marketVolatilityRisk",
  "Regulatory Pressure Risk": "regulatoryPressureRisk",
  "Capital Commitment Rigidity Risk": "capitalCommitmentRigidityRisk",
  "Leverage Level Risk": "leverageLevelRisk",
};

const SEVERITY_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  SEVERE: 3,
};

function isIncrease(change: ScenarioChange): boolean {
  return SEVERITY_ORDER[change.to] > SEVERITY_ORDER[change.from];
}

type Props = {
  parsedScenarioEffectsA: ScenarioChange[];
  parsedScenarioEffectsB: ScenarioChange[];
  scenarioTextA?: string | null;
  scenarioTextB?: string | null;
  language?: Language;
};

function EffectList({
  effects,
  language,
}: {
  effects: ScenarioChange[];
  language: Language;
}) {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const riskLabels = (t as any).riskLabels ?? {};
  const getRiskLabel = (key: string) => riskLabels[key] ?? key;

  if (effects.length === 0) return null;
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {effects.map((change, idx) => {
        const driverKey = PARAM_TO_RISK_KEY[change.parameter];
        const riskKey = driverKey ?? change.parameter;
        const label =
          PARAM_TO_RISK_KEY[riskKey]
            ? getRiskLabel(PARAM_TO_RISK_KEY[riskKey])
            : getRiskLabel(riskKey);
        const arrow = isIncrease(change) ? "↑" : "↓";
        return (
          <li key={`${change.parameter}-${idx}`} style={{ fontSize: "12px", color: "var(--ce-text-primary)", marginBottom: "4px", overflowWrap: "anywhere" }}>
            {label} {arrow}
          </li>
        );
      })}
    </ul>
  );
}

const ScenarioInterpretationPanel: React.FC<Props> = ({
  parsedScenarioEffectsA,
  parsedScenarioEffectsB,
  scenarioTextA,
  scenarioTextB,
  language = "en",
}) => {
  const uiLanguage = language;
  const t = pulseLanguage[uiLanguage];
  const hasAny = parsedScenarioEffectsA.length > 0 || parsedScenarioEffectsB.length > 0;
  const hasScenarioText = (scenarioTextA != null && scenarioTextA !== "") || (scenarioTextB != null && scenarioTextB !== "");

  return (
    <div
      style={{
        background: "var(--ce-surface-subtle)",
        border: "1px solid var(--ce-border)",
        borderRadius: "6px",
        padding: "10px",
        marginTop: "16px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--ce-text-primary)",
          marginBottom: "8px",
        }}
      >
        {t.scenarioInterpretationTitle}
      </div>
      {hasScenarioText && (
        <>
          <div
            style={{
              fontSize: "12px",
              color: "var(--ce-text-secondary)",
              marginBottom: "4px",
              fontStyle: "italic",
            }}
          >
            Scenario A: {scenarioTextA ?? "—"}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--ce-text-secondary)",
              marginBottom: "8px",
              fontStyle: "italic",
            }}
          >
            Scenario B: {scenarioTextB ?? "—"}
          </div>
        </>
      )}
      <div style={{ fontSize: "12px", marginBottom: "4px", fontWeight: 600, color: "var(--ce-text-primary)" }}>
        {t.detectedDrivers}
      </div>
      {!hasAny ? (
        <div style={{ fontSize: "12px", color: "var(--ce-text-muted)" }}>
          {t.noDriversDetected}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "11px", color: "var(--ce-text-secondary)", marginBottom: "4px" }}>
              Scenario A
            </div>
            {parsedScenarioEffectsA.length === 0 ? (
              <div style={{ fontSize: "12px", color: "var(--ce-text-muted)" }}>
                {t.noDriversDetected}
              </div>
            ) : (
              <EffectList effects={parsedScenarioEffectsA} language={language} />
            )}
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--ce-text-secondary)", marginBottom: "4px" }}>
              Scenario B
            </div>
            {parsedScenarioEffectsB.length === 0 ? (
              <div style={{ fontSize: "12px", color: "var(--ce-text-muted)" }}>
                {t.noDriversDetected}
              </div>
            ) : (
              <EffectList effects={parsedScenarioEffectsB} language={language} />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ScenarioInterpretationPanel;
