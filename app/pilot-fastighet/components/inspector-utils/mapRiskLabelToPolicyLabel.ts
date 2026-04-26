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

export function mapRiskLabelToPolicyLabel(
  label: string,
  language: "sv" | "en"
): string {
  const mapped = POLICY_LABEL_MAP[label];
  if (!mapped) return label;
  return mapped[language];
}
