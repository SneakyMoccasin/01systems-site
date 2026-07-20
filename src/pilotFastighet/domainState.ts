import type { DomainKey } from "@/src/i18n/pulseLanguage";
import { buildDriverScoreState, type DriverScoreState } from "./driverScoreState";
import { defaultRiskState } from "./presetRiskMapping";
import type { RiskLevel } from "./impactContract";

export type DomainScenarioState = {
  domain: DomainKey;
  baseRiskStateA: Record<string, RiskLevel>;
  baseRiskStateB: Record<string, RiskLevel>;
  riskStateA: Record<string, RiskLevel>;
  riskStateB: Record<string, RiskLevel>;
  driverScoresA: DriverScoreState;
  driverScoresB: DriverScoreState;
  selectedActionsA: string[];
  selectedActionsB: string[];
  selectedPilotCaseId: string;
  scenarioPromptA: string;
  scenarioPromptB: string;
  scenarioALabel: string;
  scenarioBLabel: string;
  appliedScenarioAId: string | null;
  appliedScenarioBId: string | null;
};

export function createFreshDomainScenarioState(
  domain: DomainKey
): DomainScenarioState {
  const baseA = structuredClone(defaultRiskState);
  const baseB = structuredClone(defaultRiskState);

  return {
    domain,
    baseRiskStateA: baseA,
    baseRiskStateB: baseB,
    riskStateA: structuredClone(baseA),
    riskStateB: structuredClone(baseB),
    driverScoresA: buildDriverScoreState(baseA),
    driverScoresB: buildDriverScoreState(baseB),
    selectedActionsA: [],
    selectedActionsB: [],
    selectedPilotCaseId: "",
    scenarioPromptA: "",
    scenarioPromptB: "",
    scenarioALabel: "",
    scenarioBLabel: "",
    appliedScenarioAId: null,
    appliedScenarioBId: null,
  };
}
