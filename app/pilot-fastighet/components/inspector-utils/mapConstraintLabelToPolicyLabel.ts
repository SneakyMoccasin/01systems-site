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

export function mapConstraintLabelToPolicyLabel(
  constraintType: string,
  language: "sv" | "en"
): string {
  const mapped = CONSTRAINT_LABEL_MAP[constraintType];
  if (!mapped) return language === "sv" ? "Begränsning" : "Constraint";
  return mapped[language];
}
