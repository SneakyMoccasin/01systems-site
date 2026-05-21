const CONSTRAINT_LABEL_MAP: Record<
  string,
  { sv: string; en: string }
> = {
  CapitalConstraint: {
    sv: "Kapitalbegränsning",
    en: "Capital constraint",
  },
  LiquidityConstraint: {
    sv: "Likviditetsbegränsning",
    en: "Liquidity constraint",
  },
  RefinancingConstraint: {
    sv: "Refinansieringsbegränsning",
    en: "Refinancing constraint",
  },
  MaintenanceConstraint: {
    sv: "Underhållsbegränsning",
    en: "Maintenance constraint",
  },
};

const EXECUTIVE_DEMO_CONSTRAINT_LABEL_MAP: Record<
  string,
  { sv: string; en: string }
> = {
  CapitalConstraint: {
    sv: "Begränsning i resursbindning",
    en: "Resource commitment constraint",
  },
  LiquidityConstraint: {
    sv: "Begränsning i operativ flexibilitet",
    en: "Operational flexibility constraint",
  },
  RefinancingConstraint: {
    sv: "Sekvens- och beroendebegränsning",
    en: "Dependency sequencing constraint",
  },
  MaintenanceConstraint: {
    sv: "Leveranskapacitetsbegränsning",
    en: "Delivery capacity constraint",
  },
};

export type MapConstraintLabelOptions = {
  executiveDemo?: boolean;
};

export function mapConstraintLabelToPolicyLabel(
  constraintType: string,
  language: "sv" | "en",
  options?: MapConstraintLabelOptions
): string {
  if (options?.executiveDemo && EXECUTIVE_DEMO_CONSTRAINT_LABEL_MAP[constraintType]) {
    return EXECUTIVE_DEMO_CONSTRAINT_LABEL_MAP[constraintType][language];
  }
  const mapped = CONSTRAINT_LABEL_MAP[constraintType];
  if (!mapped) return language === "sv" ? "Begränsning" : "Constraint";
  return mapped[language];
}
