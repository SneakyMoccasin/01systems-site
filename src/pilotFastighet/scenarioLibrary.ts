import { pulseLanguage } from "@/src/i18n/pulseLanguage";
import type { DomainKey } from "@/src/i18n/pulseLanguage";

export type ScenarioPreset = {
  id: string;
  label: string;
  description: string;
  prompt: string;
  group?: "core" | "transport";
  domain?: DomainKey;
  actionKeys?: string[];
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
      group: "core",
      domain: "realEstate",
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
      group: "core",
      domain: "realEstate",
      label: labels["energy-spike"] ?? "Energy Cost Spike",
      description:
        descriptions["energy-spike"] ?? "Operating costs increase due to energy prices.",
      prompt:
        prompts["energy-spike"] ?? "Operating costs increase due to rising energy prices.",
    },
    {
      id: "tenant-loss",
      group: "core",
      domain: "realEstate",
      label: labels["tenant-loss"] ?? "Tenant Loss",
      description:
        descriptions["tenant-loss"] ?? "Large tenant leaves the property.",
      prompt:
        prompts["tenant-loss"] ?? "A major tenant leaves causing demand reduction.",
    },
    {
      id: "maintenance-backlog",
      group: "core",
      domain: "realEstate",
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
      group: "core",
      domain: "realEstate",
      label: labels["refinancing-shock"] ?? "Refinancing Shock",
      description:
        descriptions["refinancing-shock"] ??
        "Interest rate pressure triggers refinancing stress which cascades through capital rigidity, maintenance pressure and tenant stability.",
      prompt:
        prompts["refinancing-shock"] ??
        "Interest rate exposure increases to HIGH.\nThis creates refinancing risk.\nRefinancing pressure increases capital commitment rigidity.\nCapital rigidity increases maintenance pressure.\nMaintenance pressure reduces tenant stability.\nTenant instability reduces demand.",
    },
    {
      id: "refinancing-window-sensitivity",
      group: "core",
      domain: "realEstate",
      label:
        language === "sv"
          ? "Refinansieringsfönster"
          : "Refinancing window sensitivity",
      description:
        language === "sv"
          ? "Ett tajtare refinansieringsfönster samverkar med belåning, hyresavtal och likviditetsbuffert och minskar portföljens strukturella flexibilitet."
          : "A tighter refinancing window interacts with leverage, lease quality, and liquidity headroom to reduce structural flexibility.",
      prompt:
        "Create a scenario where refinancing sensitivity propagates through leverage, liquidity pressure, capital rigidity, tenant stability, and demand resilience.",
    },
    {
      id: "active-maintenance-strategy",
      group: "core",
      domain: "realEstate",
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
      group: "core",
      domain: "realEstate",
      label: labels.parallelInvestmentStarts ?? "Parallel investment starts",
      description:
        descriptions.parallelInvestmentStarts ??
        "Several investment initiatives start in parallel and increase near-term coordination pressure.",
      prompt:
        prompts.parallelInvestmentStarts ??
        "Multiple investment programs are launched in parallel.\nCoordination pressure increases.\nExecution complexity increases before benefits are realized.",
      riskChanges: {
        capitalCommitmentRigidityRisk: "HIGH",
        refinancingRisk: "HIGH",
      },
    },
    {
      id: "delayedIntervention",
      group: "core",
      domain: "realEstate",
      label: labels.delayedIntervention ?? "Delayed intervention",
      description:
        descriptions.delayedIntervention ??
        "Interventions are postponed, allowing structural pressure to build before response.",
      prompt:
        prompts.delayedIntervention ??
        "Intervention decisions are delayed.\nStructural pressure accumulates before action is taken.\nSystem response starts later than planned.",
      riskChanges: {
        maintenanceIntensityRisk: "HIGH",
        operationalEfficiencyRisk: "LOW",
      },
    },
    {
      id: "limitedExecutionCapacity",
      group: "core",
      domain: "realEstate",
      label: labels.limitedExecutionCapacity ?? "Limited execution capacity",
      description:
        descriptions.limitedExecutionCapacity ??
        "Execution bandwidth is constrained, reducing implementation speed and follow-through.",
      prompt:
        prompts.limitedExecutionCapacity ??
        "Execution capacity is constrained.\nOperational follow-through is slower.\nImprovements are implemented gradually with higher delivery friction.",
      riskChanges: {
        operationalEfficiencyRisk: "LOW",
        capitalCommitmentRigidityRisk: "MODERATE",
      },
    },
    {
      id: "transport-baseline",
      group: "transport",
      domain: "municipal",
      label:
        language === "sv"
          ? "Transport: Baslinje"
          : "Transport: Baseline",
      description:
        language === "sv"
          ? "Ingen transportintervention aktiverad."
          : "No transport interventions activated.",
      prompt:
        language === "sv"
          ? "Transportbaslinje utan aktiva åtgärder."
          : "Transport baseline without active interventions.",
      actionKeys: [],
    },
    {
      id: "transport-scenario-a",
      group: "transport",
      domain: "municipal",
      label:
        language === "sv"
          ? "Transport A: Öka turtäthet"
          : "Transport A: Increase service frequency",
      description:
        language === "sv"
          ? "Öka kollektivtrafikens tillgänglighet via tätare trafik."
          : "Improve public transport accessibility with higher service frequency.",
      prompt:
        language === "sv"
          ? "Öka turtätheten i kollektivtrafiken."
          : "Increase public transport service frequency.",
      actionKeys: ["increase_service_frequency"],
    },
    {
      id: "transport-scenario-b",
      group: "transport",
      domain: "municipal",
      label:
        language === "sv"
          ? "Transport B: Turtäthet + restid"
          : "Transport B: Frequency + travel time",
      description:
        language === "sv"
          ? "Kombinerar ökad turtäthet med restidsförkortning."
          : "Combines higher service frequency with travel time reduction.",
      prompt:
        language === "sv"
          ? "Öka turtätheten och minska restiden."
          : "Increase service frequency and reduce travel time.",
      actionKeys: ["increase_service_frequency", "reduce_travel_time"],
    },
    {
      id: "transport-scenario-c",
      group: "transport",
      domain: "municipal",
      label:
        language === "sv"
          ? "Transport C: + signalprioritering"
          : "Transport C: + signal priority",
      description:
        language === "sv"
          ? "Lägger till signalprioritering för kollektivtrafik."
          : "Adds transit signal priority to the package.",
      prompt:
        language === "sv"
          ? "Öka turtäthet, minska restid och signalprioritera kollektivtrafik."
          : "Increase frequency, reduce travel time, and apply transit signal priority.",
      actionKeys: [
        "increase_service_frequency",
        "reduce_travel_time",
        "transit_signal_priority",
      ],
    },
    {
      id: "transport-scenario-d",
      group: "transport",
      domain: "municipal",
      label:
        language === "sv"
          ? "Transport D: + parkeringsreduktion"
          : "Transport D: + parking reduction",
      description:
        language === "sv"
          ? "Adderar parkeringsreduktion för ökad modal omställning."
          : "Adds parking reduction to support modal shift.",
      prompt:
        language === "sv"
          ? "Öka turtäthet, minska restid, signalprioritera och minska parkering."
          : "Increase frequency, reduce travel time, add signal priority, and reduce parking.",
      actionKeys: [
        "increase_service_frequency",
        "reduce_travel_time",
        "transit_signal_priority",
        "reduce_parking_supply",
      ],
    },
    {
      id: "transport-scenario-e",
      group: "transport",
      domain: "municipal",
      label:
        language === "sv"
          ? "Transport E: + korridorprioritering"
          : "Transport E: + corridor prioritization",
      description:
        language === "sv"
          ? "Korridorprioritering kräver separat interventionsnyckel (ej tillgänglig ännu)."
          : "Corridor prioritization requires a dedicated intervention key (not yet available).",
      prompt:
        language === "sv"
          ? "Scenario E inkluderar korridorprioritering när interventionsnyckeln finns."
          : "Scenario E includes corridor prioritization when intervention key is available.",
      actionKeys: [
        "increase_service_frequency",
        "reduce_travel_time",
        "transit_signal_priority",
        "reduce_parking_supply",
      ],
    },
  ];
}

export const scenarioLibrary: ScenarioPreset[] = getScenarioLibrary("en");
