export type Language = "sv" | "en";

export const UI_TEXT = {
  sv: {
    sections: {
      systemStatus: "SYSTEMSTATUS",
      effectOfDecision: "EFFEKT AV BESLUT",
      tippingRisk: "TIPPING-RISK",
      capacityUnderPressure: "KAPACITET UNDER TRYCK",
      strategicInterpretation: "Strategisk tolkning",
      scenarioNarrative: "Scenario Narrative",
    },

    structuralStatus: {
      stable: "Stabil",
      functioning_but_doomed: "Fungerande men dömd",
      marginal_exceedance: "Marginell överskridelse",
      structural_breakdown: "Strukturell erosion",
      structural_collapse: "Strukturell kollaps",
    },

    tippingLabels: {
      reversible: "Återkallelig",
      irreversible: "Irreversibel",
    },

    riskLevels: {
      low: "LÅG",
      moderate: "MEDEL",
      high: "HÖG",
    },

    common: {
      avgMarginChangeLabel: "Genomsnittlig marginalförändring",
      bufferLossLabel: "Buffertförlust under perioden",
      compressionLabel: "Compression",
      tippingWithin: "Tipping:",
      noTipping: "Ingen tipping inom horisonten",
      tippingPrefix: "Tipping",
      narrative: {
        withTipping: (delta: string, status: string, tippingQ: string) =>
          `Om Scenario B implementeras innebär det en genomsnittlig marginalförändring på ${delta} p.p. jämfört med Scenario A. Systemets strukturella status klassificeras som "${status}". Tipping inträffar vid ${tippingQ}, vilket indikerar en förhöjd riskprofil inom horisonten.`,
        noTipping: (delta: string, status: string) =>
          `Om Scenario B implementeras innebär det en genomsnittlig marginalförändring på ${delta} p.p. jämfört med Scenario A. Systemets strukturella status klassificeras som "${status}". Ingen tipping identifieras inom horisonten, vilket indikerar en mer robust utveckling under antagandena.`,
      },
      interpretation: {
        stable: (delta: string) =>
          `Marginalerna är stabila och ligger över definierade tröskelnivåer. ${delta}`,
        functioning_but_doomed: (delta: string) =>
          `Systemet fungerar i nuläget men visar en nedåtgående trend över tid. ${delta}`,
        marginal_exceedance: (delta: string) =>
          `Marginalerna understiger uthålliga nivåer vid flera tidpunkter. Portföljen är känslig för vidare påfrestningar. ${delta}`,
        structural_collapse: (delta: string) =>
          `Marginalerna ligger på eller under nivån för strukturell kollaps. Situationen kräver omedelbar omprövning av kapital- och riskprofil. ${delta}`,
      },
      deltaSentence: (delta: number) =>
        delta < 0
          ? "Scenario B innebär en försämring av genomsnittlig marginal jämfört med Scenario A."
          : delta > 0
          ? "Scenario B innebär en förbättring av genomsnittlig marginal jämfört med Scenario A."
          : "Genomsnittlig marginal är oförändrad mellan scenarierna.",
      legend: {
        scenarioA: "Scenario A (Baseline)",
        scenarioB: "Scenario B (Decision)",
        sustain: "Sustain threshold",
        zeroLine: "0-line",
        grid: "Grid (reference)",
      },
      tippingRiskLevel: {
        low: "Låg",
        moderate: "Måttlig",
        high: "Hög",
        irreversible: "Oåterkallelig",
      },
    },
  },

  en: {
    sections: {
      systemStatus: "SYSTEM STATUS",
      effectOfDecision: "IMPACT OF DECISION",
      tippingRisk: "TIPPING RISK",
      capacityUnderPressure: "CAPACITY UNDER PRESSURE",
      strategicInterpretation: "Strategic Interpretation",
      scenarioNarrative: "Scenario Narrative",
    },

    structuralStatus: {
      stable: "Stable",
      functioning_but_doomed: "Functioning but doomed",
      marginal_exceedance: "Marginal exceedance",
      structural_breakdown: "Structural breakdown",
      structural_collapse: "Structural collapse",
    },

    tippingLabels: {
      reversible: "Reversible",
      irreversible: "Irreversible",
    },

    riskLevels: {
      low: "LOW",
      moderate: "MODERATE",
      high: "HIGH",
    },

    common: {
      avgMarginChangeLabel: "Average margin change",
      bufferLossLabel: "Buffer loss over period",
      compressionLabel: "Compression",
      tippingWithin: "Tipping:",
      noTipping: "No tipping within horizon",
      tippingPrefix: "Tipping",
      narrative: {
        withTipping: (delta: string, status: string, tippingQ: string) =>
          `If Scenario B is implemented, the average margin changes by ${delta} p.p. compared to Scenario A. The system's structural status is classified as "${status}". Tipping occurs at ${tippingQ}, indicating elevated risk within the horizon.`,
        noTipping: (delta: string, status: string) =>
          `If Scenario B is implemented, the average margin changes by ${delta} p.p. compared to Scenario A. The system's structural status is classified as "${status}". No tipping is identified within the horizon, indicating a more robust trajectory under the assumptions.`,
      },
      interpretation: {
        stable: (delta: string) =>
          `Margins are stable and remain above defined thresholds. ${delta}`,
        functioning_but_doomed: (delta: string) =>
          `The system is functioning but shows a downward trend over time. ${delta}`,
        marginal_exceedance: (delta: string) =>
          `Margins fall below sustainable levels at multiple points. The portfolio is sensitive to further stress. ${delta}`,
        structural_collapse: (delta: string) =>
          `Margins are at or below the structural collapse threshold. Immediate reassessment of capital and risk profile is required. ${delta}`,
      },
      deltaSentence: (delta: number) =>
        delta < 0
          ? "Scenario B reduces the average margin compared to Scenario A."
          : delta > 0
          ? "Scenario B improves the average margin compared to Scenario A."
          : "Average margin is unchanged between scenarios.",
      legend: {
        scenarioA: "Scenario A (Baseline)",
        scenarioB: "Scenario B (Decision)",
        sustain: "Sustain threshold",
        zeroLine: "0-line",
        grid: "Grid (reference)",
      },
      tippingRiskLevel: {
        low: "Low",
        moderate: "Moderate",
        high: "High",
        irreversible: "Irreversible",
      },
    },
  },
} as const;
