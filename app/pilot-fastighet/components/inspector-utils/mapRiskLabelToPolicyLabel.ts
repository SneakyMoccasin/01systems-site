const POLICY_LABEL_MAP: Record<
  string,
  { sv: string; en: string }
> = {
  accessibility: {
    sv: "Tillgänglighet",
    en: "Accessibility",
  },
  demandRisk: {
    sv: "Efterfrågan",
    en: "Demand",
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
  budget_pressure: {
    sv: "Budgettryck",
    en: "Budget pressure",
  },
  capacityPressure: {
    sv: "Kapacitetstryck",
    en: "Capacity pressure",
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
