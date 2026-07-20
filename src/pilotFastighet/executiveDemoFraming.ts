/**
 * Presentation copy for Executive Demo Mode only (no simulation changes).
 */

export type ExecutiveDemoLang = "sv" | "en";

export function getExecutiveDemoHero(lang: ExecutiveDemoLang) {
  return {
    eyebrow: lang === "sv" ? "Demonstrationsläge" : "Demonstration",
    title:
      lang === "sv"
        ? "Hur beslut förändrar framtidens möjligheter."
        : "How decisions change future possibilities.",
    subtitle:
      lang === "sv"
        ? "Samma mål—annan turordning. Prioriteringar konkurrerar om kapacitet; handlingsutrymmet skiljer sig tyst."
        : "Same goals—different sequencing. Priorities compete for capacity; room to act diverges quietly.",
    /** One sentence: what CE is doing in this view */
    valueLine:
      lang === "sv"
        ? "Nedan: förändring i handlingsutrymme månad för månad per spår (inte en prognos)."
        : "Below: month-by-month change in room to act on each path (not a forecast).",
    /** Recording / demo problem statement (top of page) */
    problemStatement:
      lang === "sv"
        ? "När tryck och belastning byggs långsamt märks det först i marginalen — inte i en dramatisk händelse."
        : "When pressure builds slowly, the warning shows up in runway first — not in a single dramatic event. That is what the curves make visible.",
  };
}

export function getExecutiveDemoGraphTimelineMarkers(lang: ExecutiveDemoLang): {
  monthIndex: number;
  label: string;
}[] {
  /** `monthIndex` is 0-based along the plotted series (M{n} aligns with timeline label n). */
  if (lang === "sv") {
    return [
      { monthIndex: 1, label: "M2 — Delad belastning stiger" },
      { monthIndex: 4, label: "M5 — Sekvenskonflikter syns tydligare" },
      { monthIndex: 7, label: "M8 — Flexibilitet börjar smalna" },
      { monthIndex: 11, label: "M12 — Tydligare separation" },
    ];
  }
  return [
    { monthIndex: 1, label: "M2 — Shared execution load ramps" },
    { monthIndex: 4, label: "M5 — Sequencing conflicts surface" },
    { monthIndex: 7, label: "M8 — Execution flexibility narrows" },
    { monthIndex: 11, label: "M12 — Paths visibly separate" },
  ];
}

export function getExecutiveDemoScenarioComparisonStrip(lang: ExecutiveDemoLang) {
  return {
    current: {
      heading: lang === "sv" ? "Nuvarande spår" : "Current path",
      bullets:
        lang === "sv"
          ? [
              "Parallella arbetsspår · kostnadstryck · tunnare operativ slack",
              "Underhåll och compliance hopar sig i kö med transformation",
            ]
          : [
              "Parallel tracks · cost pressure · thinner operational slack",
              "Maintenance + compliance queued behind transformation work",
            ],
    },
    alternative: {
      heading: lang === "sv" ? "Hur spåren separeras över tid" : "How the paths diverge",
      bullets:
        lang === "sv"
          ? [
              "Samma mål över tid med skyddad genomföringskapacitet",
              "Aktivt underhåll · stabilare leveranskö · mindre konkurrens om samma folk",
            ]
          : [
              "Same objectives over time with protected throughput",
              "Active upkeep · steadier queue · fewer teams fighting over the same people",
            ],
    },
  };
}

export function getExecutiveDemoGraphFraming(lang: ExecutiveDemoLang) {
  return {
    title:
      lang === "sv"
        ? "Handlingsutrymme — två genomförandevägar"
        : "Room to act — two execution paths",
    /** One line: instant “what am I looking at?” for executives */
    purposeLine:
      lang === "sv"
        ? "Kurvan visar hur mycket frihet ni behåller när tryck hopar sig — månad för månad, per spår."
        : "This chart shows how much flexibility you keep as pressure accumulates — month by month, for each path.",
    lead:
      lang === "sv"
        ? "Orange = fasad körning · Blått = mer parallella spår och köad underhåll."
        : "Orange = phased run · Blue = heavier parallel loading + backlog built into the calendar.",
    /** Explicit non-optimization framing for recording */
    nonOptimization:
      lang === "sv"
        ? "Ingen jämfört optimallösning — bara vad som händer med handlingsmarginal över månaderna."
        : "Not benchmarking an optimum — just the shift in room to steer month by month.",
  };
}

export function getExecutiveDemoMarginStripLabels(lang: ExecutiveDemoLang) {
  return {
    scenarioA:
      lang === "sv"
        ? "Nuvarande strategi — beslutsmarginal"
        : "Baseline — decision margin",
    scenarioB:
      lang === "sv"
        ? "Alternativ strategi — beslutsmarginal"
        : "Goal strategy — decision margin",
    delta: lang === "sv" ? "Skillnad" : "Delta",
    period: lang === "sv" ? "Simulerad horisont" : "Simulated horizon",
  };
}

export function getExecutiveDemoGoalPickerLabel(lang: ExecutiveDemoLang) {
  return lang === "sv" ? "Analysfokus:" : "Analysis focus:";
}

/** Shown when Executive Demo Mode hides the interactive ActionPanel */
export function getExecutiveDemoPlaybackInitiativesNote(lang: ExecutiveDemoLang) {
  return lang === "sv"
    ? "Förhandsladdade spår för inspelning — inga toggles krävs."
    : "Pre-loaded lanes for filming — toggles skipped.";
}

/** Section labels + periods on ExecutiveSummaryCard (Executive Demo only). */
export function getExecutiveDemoSummaryCardCopy(lang: ExecutiveDemoLang) {
  return {
    tippingRisk:
      lang === "sv" ? "TRYCKKONCENTRATION" : "PRESSURE CONCENTRATION",
    capacityUnderPressure:
      lang === "sv"
        ? "GENOMFÖRINGSKAPACITET UNDER TRYCK"
        : "EXECUTION CAPACITY STRAIN",
    strategicInterpretation:
      lang === "sv" ? "Strukturell tolkning" : "Structural read",
    tippingRiskPeriod:
      lang === "sv" ? "Period med koncentrerat tryck" : "Period of concentrated pressure",
    tippingRiskPeriodAround: (q: number) =>
      lang === "sv" ? `Tryckperiod runt Q${q}` : `Pressure period around Q${q}`,
    tippingRiskWindow: (start: number, end: number) =>
      lang === "sv"
        ? `Tryckperiod: Q${start}–Q${end}`
        : `Pressure period: Q${start}–Q${end}`,
    tippingRiskLevel: {
      low: lang === "sv" ? "Begränsad spridning" : "Contained",
      moderate: lang === "sv" ? "Börjar koncentreras" : "Concentrating",
      high: lang === "sv" ? "Förhöjd" : "Elevated",
      irreversible: lang === "sv" ? "Strukturell inlåsning" : "Structural lock-in",
    },
  };
}

export function getExecutiveDemoGoalOptionLabel(
  goal:
    | "accessibility"
    | "congestion"
    | "margin_stability"
    | "avoid_tipping",
  lang: ExecutiveDemoLang
): string {
  const m = {
    sv: {
      accessibility: "Genomföringsbarhet över funktioner",
      congestion: "Samordnings- och implementeringslast",
      margin_stability: "Bevara leveransflexibilitet",
      avoid_tipping: "Begränsa risk för strukturell brytpunkt",
    },
    en: {
      accessibility: "Cross-functional executability",
      congestion: "Coordination and implementation load",
      margin_stability: "Preserve delivery flexibility",
      avoid_tipping: "Limit structural tipping risk",
    },
  } as const;
  return m[lang][goal];
}
