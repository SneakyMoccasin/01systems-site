export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";

export type ScenarioChange = {
  parameter: string;
  from: RiskLevel;
  to: RiskLevel;
};

const STRONG_WORDS = [
  "kraftigt",
  "chock",
  "dramatiskt",
  "kraftig",
  "spike",
  "surge",
  "shock",
  "collapse",
] as const;

const CASCADE_WORDS = [
  "creates",
  "causes",
  "leads to",
  "results in",
  "drives",
  "triggers",
  "propagates to",
] as const;

function detectStrength(text: string): boolean {
  return STRONG_WORDS.some((word) => text.includes(word));
}

const RISK_RULES = [
  {
    parameter: "Interest Rate Exposure",
    keywords: [
      "interest rate",
      "rate hike",
      "interest exposure",
      "interest",
    ],
  },
  {
    parameter: "Energy Exposure",
    keywords: [
      "energi",
      "energipris",
      "energipriser",
      "energy",
      "energy price",
    ],
  },
  {
    parameter: "Tenant Stability",
    keywords: [
      "tenant",
      "tenant stability",
      "tenant instability",
    ],
  },
  {
    parameter: "Maintenance Intensity",
    keywords: [
      "maintenance",
      "maintenance pressure",
      "maintenance backlog",
      "maintenance pressure",
    ],
  },
  {
    parameter: "Refinancing Risk",
    keywords: [
      "refinancing",
      "refinancing risk",
      "refinance",
    ],
  },
  {
    parameter: "Demand Risk",
    keywords: [
      "demand",
      "demand drop",
      "demand reduction",
      "reduces demand",
    ],
  },
  {
    parameter: "Pricing Power Risk",
    keywords: [
      "pris",
      "prispress",
      "pricing",
      "price pressure",
    ],
  },
  {
    parameter: "Operational Efficiency Risk",
    keywords: [
      "effektivitet",
      "efficiency",
      "driftproblem",
    ],
  },
  {
    parameter: "Market Volatility Risk",
    keywords: [
      "volatil",
      "volatility",
      "osäker marknad",
    ],
  },
  {
    parameter: "Regulatory Pressure Risk",
    keywords: [
      "regler",
      "reglering",
      "regulation",
      "regulatory",
    ],
  },
  {
    parameter: "Capital Commitment Rigidity Risk",
    keywords: [
      "capital rigidity",
      "capital commitment",
      "capital locked",
      "capital commitment rigidity",
    ],
  },
  {
    parameter: "Leverage Level Risk",
    keywords: [
      "belåning",
      "skuldsättning",
      "leverage",
      "debt",
    ],
  },
] as const;

function increaseRisk(level: RiskLevel): RiskLevel {
  switch (level) {
    case "LOW":
      return "MODERATE";
    case "MODERATE":
      return "HIGH";
    case "HIGH":
      return "SEVERE";
    case "SEVERE":
      return "SEVERE";
  }
}

function increaseRiskStrong(level: RiskLevel): RiskLevel {
  switch (level) {
    case "LOW":
      return "HIGH";
    case "MODERATE":
      return "SEVERE";
    case "HIGH":
      return "SEVERE";
    case "SEVERE":
      return "SEVERE";
  }
}

export function parseScenario(
  text: string,
  currentState: Record<string, RiskLevel>
): ScenarioChange[] {
  const t = text.toLowerCase();

  const changes: ScenarioChange[] = [];

  const strong = detectStrength(t);
  const hasCascadeLanguage = CASCADE_WORDS.some((word) => t.includes(word));

  const appliedParameters = new Set<string>();

  function apply(parameter: string, strong = false) {
    const from = currentState[parameter];

    if (!from) return;

    const to = strong ? increaseRiskStrong(from) : increaseRisk(from);

    if (from !== to) {
      changes.push({ parameter, from, to });
    }
  }

  for (const rule of RISK_RULES) {
    if (rule.keywords.some((k) => t.includes(k.toLowerCase()))) {
      apply(rule.parameter, strong);
      break;
    }
  }

  return changes;
}

