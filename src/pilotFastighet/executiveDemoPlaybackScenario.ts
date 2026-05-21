/**
 * Single curated playback state for Executive Demo Mode / demo recording only.
 * Does not alter engine rules — only supplies initial RiskState A vs B.
 */

import { defaultRiskState } from "@/src/pilotFastighet/presetRiskMapping";
import type { RiskLevel } from "@/src/pilotFastighet/impactContract";

export type RiskState = Record<string, RiskLevel>;

export const EXEC_DEMO_PLAYBACK_PRESET_ID = "exec-demo-transformation-overload-vs-phased";

/** Display title for recording UI (EN / SV). */
export function getExecutiveDemoPlaybackPresetTitle(lang: "sv" | "en"): string {
  return lang === "sv"
    ? "Transformationsöverlast mot fasad genomföring"
    : "Transformation overload vs phased execution";
}

function mergeBaseline(overrides: Partial<RiskState>): RiskState {
  return {
    ...(structuredClone(defaultRiskState) as RiskState),
    ...overrides,
  } as RiskState;
}

/**
 * Current track: deferred upkeep + compliance drag + busier operations — stress compounds through
 * operations and income-side multipliers without front-loading financing HIGHs.
 *
 * Alternative: phased delivery — stronger ops throughput, proactive maintenance, softer
 * tenant/income friction; same financing baseline so divergence reads as sequencing, not optics.
 */
export function getExecutiveDemoPlaybackRiskStates(): {
  riskStateA: RiskState;
  riskStateB: RiskState;
} {
  const riskStateA = mergeBaseline({
    demandRisk: "MODERATE",
    pricingPowerRisk: "MODERATE",
    tenantStabilityRisk: "MODERATE",
    maintenanceIntensityRisk: "HIGH",
    operationalEfficiencyRisk: "MODERATE",
    energyExposureRisk: "MODERATE",
    interestRateExposureRisk: "MODERATE",
    leverageLevelRisk: "MODERATE",
    refinancingRisk: "MODERATE",
    marketVolatilityRisk: "MODERATE",
    regulatoryPressureRisk: "HIGH",
    capitalCommitmentRigidityRisk: "MODERATE",
  });

  const riskStateB = mergeBaseline({
    demandRisk: "MODERATE",
    pricingPowerRisk: "MODERATE",
    tenantStabilityRisk: "LOW",
    maintenanceIntensityRisk: "LOW",
    operationalEfficiencyRisk: "LOW",
    energyExposureRisk: "MODERATE",
    interestRateExposureRisk: "MODERATE",
    leverageLevelRisk: "MODERATE",
    refinancingRisk: "MODERATE",
    marketVolatilityRisk: "MODERATE",
    regulatoryPressureRisk: "MODERATE",
    capitalCommitmentRigidityRisk: "MODERATE",
  });

  return { riskStateA, riskStateB };
}

/** Legacy hook — superseded by `getExecutiveDemoInspectorSignalBlocks`; kept for compatibility. */
export function getExecutiveDemoInspectorDecisionAnalytic(lang: "sv" | "en"): {
  heading: string;
  body: string;
} {
  const blocks = getExecutiveDemoInspectorSignalBlocks(lang);
  return {
    heading: blocks.map((b) => b.title).join(" · "),
    body: blocks.map((b) => `${b.title}: ${b.body}`).join(" "),
  };
}

/** Compact inspector lines for cinematic executive playback (video-first tone). */
export function getExecutiveDemoInspectorSignalBlocks(
  lang: "sv" | "en"
): { title: string; body: string }[] {
  if (lang === "sv") {
    return [
      {
        title: "Genomföringstryck",
        body: "Fler parallella initiativ delar på samma leveranskapacitet. Koordinationslasten tickar upp tidigt — ofta innan något spår ser “rött” ut.",
      },
      {
        title: "Tidig divergens",
        body: "Små val i sekvens (vad som flyttas fram eller bak) ger redan runt M2–M3 en tydlig skillnad i hur mycket som får köras samtidigt.",
      },
      {
        title: "Strukturell effekt",
        body: "När köer, uppföljning och daglig drift belastas samtidigt växer påfrestningen snabbare än utrymmet att hämta andan.",
      },
      {
        title: "Utsikt",
        body: "Handlingsutrymmet krymper månad för månad — inte som en chock, utan som mindre frihet att styra om.",
      },
    ];
  }
  return [
    {
      title: "Execution pressure",
      body: "More parallel initiatives share the same delivery capacity. Coordination load rises early — often before any one stream looks “red”.",
    },
    {
      title: "Early divergence",
      body: "Small sequencing choices (what moves up or slips) create a visible gap in how much you can run at once — often by M2–M3.",
    },
    {
      title: "Structural effect",
      body: "When queues, oversight, and day-to-day load hit together, strain builds faster than the slack you get back.",
    },
    {
      title: "Outlook",
      body: "Room to act tightens month by month — not a shock, just less freedom to reprioritize.",
    },
  ];
}
