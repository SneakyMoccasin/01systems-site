/**
 * Presentation copy for Executive Demo Mode only (no simulation changes).
 */

export type ExecutiveDemoLang = "sv" | "en";

export function getExecutiveDemoHero(lang: ExecutiveDemoLang) {
  return {
    eyebrow: lang === "sv" ? "Demonstrationsläge" : "Demonstration",
    title:
      lang === "sv"
        ? "Samma åtgärder, olika ordning"
        : "Same actions, different order",
    subtitle:
      lang === "sv"
        ? "Stabilisering först jämfört med belastning först."
        : "Mitigation-first versus adverse-first sequencing.",
    /** One sentence: what CE is doing in this view */
    valueLine:
      lang === "sv"
        ? "Samma startvillkor och samma åtgärder, genomförda vid olika tidpunkter och i olika ordning."
        : "The same starting conditions and the same actions, executed at different times and in a different order.",
    /** Recording / demo problem statement (top of page) */
    problemStatement:
      lang === "sv"
        ? "Sekvensen med tidiga stabiliserande åtgärder bevarar den strukturella marginalen längre och förskjuter den synliga begränsningsaktiveringen från M2 till M21. Efter att den uppskjutna underhållsåtgärden har fortplantats konvergerar båda förloppen mot samma terminala marginal."
        : "The mitigation-first sequence preserves structural margin longer and shifts visible constraint activation from M2 to M21. After the maintenance deferral has propagated, both paths converge to the same terminal margin.",
  };
}

export function getExecutiveDemoGraphTimelineMarkers(lang: ExecutiveDemoLang): {
  monthIndex: number;
  label: string;
}[] {
  void lang;
  return [];
}

export function getExecutiveDemoScenarioComparisonStrip(lang: ExecutiveDemoLang) {
  return {
    current: {
      heading: lang === "sv" ? "Belastning först" : "Adverse first",
      bullets:
        lang === "sv"
          ? [
              "Underhåll skjuts upp vid M1",
              "Stabiliserande åtgärder genomförs vid M9 och M18",
            ]
          : [
              "Maintenance is deferred at M1",
              "Stabilizing actions execute at M9 and M18",
            ],
    },
    alternative: {
      heading: lang === "sv" ? "Stabilisering först" : "Mitigation first",
      bullets:
        lang === "sv"
          ? [
              "Stabiliserande åtgärder genomförs vid M1 och M3",
              "Underhåll skjuts upp vid M18",
            ]
          : [
              "Stabilizing actions execute at M1 and M3",
              "Maintenance is deferred at M18",
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
        ? "Kurvan visar hur den strukturella marginalen utvecklas månad för månad i varje sekvens."
        : "This chart shows how structural margin develops month by month in each sequence.",
    lead:
      lang === "sv"
        ? "Orange = stabilisering först · Blått = belastning först."
        : "Orange = mitigation first · Blue = adverse first.",
    /** Explicit non-optimization framing for recording */
    nonOptimization:
      lang === "sv"
        ? "Jämförelsen visar skillnader mellan två konfigurerade förlopp, inte en rekommendation eller prognos."
        : "The comparison shows differences between two configured paths, not a recommendation or forecast.",
  };
}

export function getExecutiveDemoMarginStripLabels(lang: ExecutiveDemoLang) {
  return {
    scenarioA:
      lang === "sv"
        ? "Belastning först — strukturell marginal"
        : "Adverse first — structural margin",
    scenarioB:
      lang === "sv"
        ? "Stabilisering först — strukturell marginal"
        : "Mitigation first — structural margin",
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
    ? "Identiska startvillkor och samma tre åtgärder."
    : "Identical starting conditions and the same three actions.";
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
    tippingRiskPeriodAround: (period: number) =>
      lang === "sv" ? `Tryckperiod runt M${period}` : `Pressure period around M${period}`,
    tippingRiskWindow: (start: number, end: number) =>
      lang === "sv"
        ? `Tryckperiod: M${start}–M${end}`
        : `Pressure period: M${start}–M${end}`,
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
