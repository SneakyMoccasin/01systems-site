const POLICY_LABEL_MAP: Record<
  string,
  { sv: string; en: string }
> = {
  accessibility: {
    sv: "Tillgänglighet i nätverket",
    en: "Accessibility",
  },
  demandRisk: {
    sv: "Efterfrågan",
    en: "Demand",
  },
  demand: {
    sv: "Efterfrågetryck i transportsystemet",
    en: "Transport demand pressure",
  },
  maintenanceIntensityRisk: {
    sv: "Underhållstryck",
    en: "Maintenance pressure",
  },
  tenantStabilityRisk: {
    sv: "Hyresgäststabilitet",
    en: "Tenant stability",
  },
  capitalCommitmentRigidityRisk: {
    sv: "Kapitalbindning",
    en: "Capital commitment rigidity",
  },
  interestRateExposureRisk: {
    sv: "Ränteexponering",
    en: "Interest-rate exposure",
  },
  refinancingRisk: {
    sv: "Refinansieringsrisk",
    en: "Refinancing risk",
  },
  leverageLevelRisk: {
    sv: "Belåningsnivå",
    en: "Leverage level",
  },
  liquidityPressure: {
    sv: "Likviditetspress",
    en: "Liquidity pressure",
  },
  liquidityPressureRisk: {
    sv: "Likviditetspress",
    en: "Liquidity pressure",
  },
  budget_pressure: {
    sv: "Budgettryck",
    en: "Budget pressure",
  },
  budgetPressure: {
    sv: "Budgettryck i genomförandet",
    en: "Budget pressure in implementation",
  },
  capacityPressure: {
    sv: "Kapacitetstryck i nätverket",
    en: "Network capacity pressure",
  },
  implementationPacing: {
    sv: "Genomförandetakt",
    en: "Implementation pacing",
  },
};

/** Executive Demo (real-estate presentation): neutralize finance wording; keys unchanged. */
const EXECUTIVE_DEMO_POLICY_LABEL_MAP: Partial<
  Record<keyof typeof POLICY_LABEL_MAP, { sv: string; en: string }>
> = {
  capitalCommitmentRigidityRisk: {
    sv: "Resurslåsning",
    en: "Resource lock-in",
  },
  interestRateExposureRisk: {
    sv: "Tryck på genomföringskostnad",
    en: "Execution cost pressure",
  },
  refinancingRisk: {
    sv: "Sekvens- och beroendetryck",
    en: "Dependency sequencing pressure",
  },
  leverageLevelRisk: {
    sv: "Samordningstryck",
    en: "Coordination pressure",
  },
  liquidityPressure: {
    sv: "Belastning på operativ flexibilitet",
    en: "Operational flexibility strain",
  },
  liquidityPressureRisk: {
    sv: "Belastning på operativ flexibilitet",
    en: "Operational flexibility strain",
  },
  maintenanceIntensityRisk: {
    sv: "Underhållsbelastning i leverans",
    en: "Operational upkeep strain",
  },
  capacityPressure: {
    sv: "Delad genomföringsbelastning",
    en: "Shared execution strain",
  },
};

export type MapRiskLabelOptions = {
  executiveDemo?: boolean;
};

export function mapRiskLabelToPolicyLabel(
  label: string | null | undefined,
  language: "sv" | "en",
  options?: MapRiskLabelOptions
): string {
  if (label == null || label === "") {
    return "";
  }
  if (options?.executiveDemo) {
    const execMapped = EXECUTIVE_DEMO_POLICY_LABEL_MAP[label as keyof typeof POLICY_LABEL_MAP];
    if (execMapped) return execMapped[language] ?? label;
  }
  const mapped = POLICY_LABEL_MAP[label];
  if (!mapped) return label;
  return mapped[language] ?? label;
}

/** Dominant portfolio constraint keys ("capital" | "capacity" | …) → policy risk keys for display. */
export function mapDominantPortfolioConstraintKeyToPolicyLabel(
  constraintKey: string,
  language: "sv" | "en",
  options?: MapRiskLabelOptions
): string {
  switch (constraintKey) {
    case "capital":
      return mapRiskLabelToPolicyLabel("budget_pressure", language, options);
    case "capacity":
      return mapRiskLabelToPolicyLabel("capacityPressure", language, options);
    case "covenant":
      return mapRiskLabelToPolicyLabel("implementationPacing", language, options);
    default:
      return mapRiskLabelToPolicyLabel(constraintKey, language, options);
  }
}
