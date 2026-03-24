import { pulseLanguage } from "@/src/i18n/pulseLanguage";

export type ScenarioPreset = {
  id: string;
  label: string;
  description: string;
  prompt: string;
  riskChanges?: Record<string, string>;
};

export type ScenarioLanguage = "sv" | "en";

export function getScenarioLibrary(language: ScenarioLanguage = "en"): ScenarioPreset[] {
  const t = pulseLanguage[language];
  const labels = t.scenarioLabels ?? {};
  const descriptions = t.scenarioDescriptions ?? {};
  const prompts = t.scenarioPrompts ?? {};

  return [
    {
      id: "interest-shock",
      label: labels["interest-shock"] ?? "Interest Rate Shock",
      description:
        descriptions["interest-shock"] ?? "Sharp increase in financing costs.",
      prompt:
        prompts["interest-shock"] ?? "Financing cost increases significantly over the next quarters.",
      riskChanges: {
        interestRateExposureRisk: "HIGH",
        refinancingRisk: "HIGH",
        leverageLevelRisk: "HIGH",
      },
    },
    {
      id: "energy-spike",
      label: labels["energy-spike"] ?? "Energy Cost Spike",
      description:
        descriptions["energy-spike"] ?? "Operating costs increase due to energy prices.",
      prompt:
        prompts["energy-spike"] ?? "Operating costs increase due to rising energy prices.",
    },
    {
      id: "tenant-loss",
      label: labels["tenant-loss"] ?? "Tenant Loss",
      description:
        descriptions["tenant-loss"] ?? "Large tenant leaves the property.",
      prompt:
        prompts["tenant-loss"] ?? "A major tenant leaves causing demand reduction.",
    },
    {
      id: "maintenance-backlog",
      label: labels["maintenance-backlog"] ?? "Maintenance Backlog",
      description:
        descriptions["maintenance-backlog"] ??
        "Maintenance is deferred to reduce short term cost.",
      prompt:
        prompts["maintenance-backlog"] ??
        "Maintenance is deferred causing gradual property degradation.",
    },
    {
      id: "refinancing-shock",
      label: labels["refinancing-shock"] ?? "Refinancing Shock",
      description:
        descriptions["refinancing-shock"] ??
        "Interest rate pressure triggers refinancing stress which cascades through capital rigidity, maintenance pressure and tenant stability.",
      prompt:
        prompts["refinancing-shock"] ??
        "Interest rate exposure increases to HIGH.\nThis creates refinancing risk.\nRefinancing pressure increases capital commitment rigidity.\nCapital rigidity increases maintenance pressure.\nMaintenance pressure reduces tenant stability.\nTenant instability reduces demand.",
    },
    {
      id: "active-maintenance-strategy",
      label: labels["active-maintenance-strategy"] ?? "Active maintenance strategy",
      description:
        descriptions["active-maintenance-strategy"] ??
        "Targeted maintenance investments reduce operational pressure, improve tenant stability and restore structural flexibility.",
      prompt:
        prompts["active-maintenance-strategy"] ??
        "Maintenance intensity risk decreases significantly.\nTenant stability risk decreases.\nCapital commitment rigidity risk decreases.\nDemand risk decreases.",
    },
    {
      id: "parallelInvestmentStarts",
      label: labels.parallelInvestmentStarts ?? "Parallel investment starts",
      description:
        descriptions.parallelInvestmentStarts ??
        "Several investment initiatives start in parallel and increase near-term coordination pressure.",
      prompt:
        prompts.parallelInvestmentStarts ??
        "Multiple investment programs are launched in parallel.\nCoordination pressure increases.\nExecution complexity increases before benefits are realized.",
      impact: {
        capitalCommitmentRigidity: "HIGH",
        refinancingRisk: "HIGH",
      },
    },
    {
      id: "delayedIntervention",
      label: labels.delayedIntervention ?? "Delayed intervention",
      description:
        descriptions.delayedIntervention ??
        "Interventions are postponed, allowing structural pressure to build before response.",
      prompt:
        prompts.delayedIntervention ??
        "Intervention decisions are delayed.\nStructural pressure accumulates before action is taken.\nSystem response starts later than planned.",
      impact: {
        maintenanceIntensity: "HIGH",
        operationalEfficiency: "LOW",
      },
    },
    {
      id: "limitedExecutionCapacity",
      label: labels.limitedExecutionCapacity ?? "Limited execution capacity",
      description:
        descriptions.limitedExecutionCapacity ??
        "Execution bandwidth is constrained, reducing implementation speed and follow-through.",
      prompt:
        prompts.limitedExecutionCapacity ??
        "Execution capacity is constrained.\nOperational follow-through is slower.\nImprovements are implemented gradually with higher delivery friction.",
      impact: {
        operationalEfficiency: "LOW",
        capitalCommitmentRigidity: "MODERATE",
      },
    },
  ];
}

export const scenarioLibrary: ScenarioPreset[] = getScenarioLibrary("en");
