import { getLanguage } from "./languageStore";

type Translations = {
  // Decision Flow v2
  decisionFlow: {
    title: string;
    subtitle: string;
    currentSystemState: string;
    currentSystemStateDescription: string;
    systemLoadState: string;
    externalPressure: string;
    externalPressureDescription: string;
    externalPressureTrend: string;
    selectedResponse: string;
    responseStrategy: string;
    responseStrategyDescription: string;
    primaryResponseStrategy: string;
    runSimulation: string;
    helperText: string;
    selectPlaceholder: string;
    // Options
    loadStateStable: string;
    loadStateManaging: string;
    loadStatePressure: string;
    loadStateNearCapacity: string;
    pressureIncreasing: string;
    pressureFluctuating: string;
    pressureStable: string;
    pressureDecreasing: string;
    responseProtect: string;
    responseBalance: string;
    responsePush: string;
  };
  // Bevis v2
  bevis: {
    title: string;
    subtitle: string;
    backToDecisionFlow: string;
    expertAnalysis: string;
    viewExpertAnalysis: string;
    systemJourney: {
      baseline: string;
      pressure: string;
      response: string;
      outcome: string;
      description: string;
    };
    systemStatus: string;
    systemStatusDescription: string;
    load: string;
    capacityMargin: string;
    recovery: string;
    stateAtDecision: string;
    initialSystemState: string;
    initialSystemStateText: string;
    externalFactor: string;
    appliedPressureOverTime: string;
    appliedPressureText: string;
    decisionApplied: string;
    selectedResponse: string;
    selectedResponseText: string;
    systemDynamics: string;
    systemResponse: string;
    systemResponseText: string;
    observedChange: string;
    observedOutcome: string;
    observedOutcomeText: string;
    consequences: string;
    consequencesText: string;
    disclaimer: string;
    noSimulation: string;
    // Status values
    increased: string;
    decreased: string;
    stable: string;
    reduced: string;
    expanded: string;
    maintained: string;
    strained: string;
    enhanced: string;
    preserved: string;
    loadDiffers: string;
    recoveryDiffers: string;
    stateChanged: string;
  };
  // Expert UI
  expert: {
    backToBevis: string;
    backToDecisionFlow: string;
    systemOverview: string;
    systemOverviewDescription: string;
    snapshotAvailable: string;
    snapshotNotAvailable: string;
    coreDynamics: string;
    coreDynamicsDescription: string;
    assumptionsConstraints: string;
    assumptionsConstraintsDescription: string;
    assumptionsText: string;
    eventPhaseLog: string;
    eventPhaseLogDescription: string;
    rawEventLog: string;
    noDataAvailable: string;
    footer: string;
  };
};

const translations: Record<"EN" | "SV", Translations> = {
  EN: {
    decisionFlow: {
      title: "Decision Flow",
      subtitle: "Define the situation before committing to a simulation.",
      currentSystemState: "Current system state",
      currentSystemStateDescription: "Describe how the system is operating at this moment.\nThis represents the baseline against which all consequences will be measured.\n\nThis is not an objective truth.\nIt is the agreed operational assessment.",
      systemLoadState: "System load state",
      externalPressure: "External pressure",
      externalPressureDescription: "Identify ongoing or increasing pressure acting on the system.\nThis pressure exists independently of the decision being considered.\n\nThe system must respond within these conditions.",
      externalPressureTrend: "External pressure trend",
      selectedResponse: "Selected Response",
      responseStrategy: "Response strategy",
      responseStrategyDescription: "Select how the system will respond to the combined baseline state and external pressure.\n\nThe response influences how pressure is absorbed, deferred, or accumulated.\nIt does not remove external conditions.",
      primaryResponseStrategy: "Primary response strategy",
      runSimulation: "Run simulation",
      helperText: "This action executes a single simulation run.\nThe outcome cannot be altered.",
      selectPlaceholder: "Select...",
      loadStateStable: "Stable",
      loadStateManaging: "Managing strain",
      loadStatePressure: "Under sustained pressure",
      loadStateNearCapacity: "Near capacity",
      pressureIncreasing: "Increasing",
      pressureFluctuating: "Fluctuating",
      pressureStable: "Stable",
      pressureDecreasing: "Decreasing",
      responseProtect: "Protect stability and people",
      responseBalance: "Balance short-term load and long-term health",
      responsePush: "Push hard to meet current demand",
    },
    bevis: {
      title: "Bevis",
      subtitle: "Explanation of system behavior",
      backToDecisionFlow: "← Decision Flow",
      expertAnalysis: "Expert Analysis →",
      viewExpertAnalysis: "View Expert Analysis →",
      systemJourney: {
        baseline: "Baseline",
        pressure: "Pressure",
        response: "Response",
        outcome: "Outcome",
        description: "You are viewing the final outcome of a completed simulation.",
      },
      systemStatus: "System Status",
      systemStatusDescription: "The system remains operational.\nMargins have narrowed under sustained load.",
      load: "Load",
      capacityMargin: "Capacity margin",
      recovery: "Recovery",
      stateAtDecision: "State at decision",
      initialSystemState: "Initial System State",
      initialSystemStateText: "At the moment the decision was taken, the system was operating at a baseline state. The baseline load represented the operational pressure already present. The system's capacity defined its sustainable limit before degradation begins, not the point of total failure. Recovery capacity indicated the system's ability to absorb temporary strain and return toward baseline over time.",
      externalFactor: "External factor",
      appliedPressureOverTime: "Applied Pressure Over Time",
      appliedPressureText: "External pressure acted on the system throughout the simulation period. This pressure was independent of decisions made within the system. The pressure accumulated or evolved over time, affecting how the system's baseline state interacted with its capacity and recovery mechanisms.",
      decisionApplied: "Decision applied",
      selectedResponse: "Selected Response",
      selectedResponseText: "A response strategy was applied to the system. This response defined how the system would react to the combination of its baseline state and ongoing external pressure. The response operated within the system's constraints and available margin. This response did not remove external pressure from the system.",
      systemDynamics: "System dynamics",
      systemResponse: "System Response",
      systemResponseText: "Over time, the system reacted to the applied pressure and selected response. The interaction between load, capacity, and recovery produced gradual changes in system state. These changes accumulated as the simulation progressed, creating consequences that reflected the system's dynamics.",
      observedChange: "Observed Change",
      observedOutcome: "Observed Outcome",
      observedOutcomeText: "The simulation produced a final system state that differs from the initial baseline.\nThis outcome reflects how the system evolved under the given conditions.\n\nThe result is descriptive, not evaluative.\nIt does not indicate success or failure.",
      consequences: "Consequences",
      consequencesText: "The simulation resulted in a final system state that differed from the initial baseline. This final state reflects how the system's dynamics evolved given the initial conditions, applied pressure, and selected response. The consequences represent the system's behavior over the simulated time period. This outcome is not framed as success or failure.",
      disclaimer: "This view explains the consequences of a completed simulation. It does not provide recommendations or judge outcomes as good or bad.",
      noSimulation: "No completed simulation is available.",
      increased: "Increased",
      decreased: "Decreased",
      stable: "Stable",
      reduced: "Reduced",
      expanded: "Expanded",
      maintained: "Maintained",
      strained: "Strained",
      enhanced: "Enhanced",
      preserved: "Preserved",
      loadDiffers: "Load differs from baseline",
      recoveryDiffers: "Recovery capacity differs from baseline",
      stateChanged: "System state changed over time",
    },
    expert: {
      backToBevis: "← Back to Bevis",
      backToDecisionFlow: "← Back to Decision Flow",
      systemOverview: "System Overview",
      systemOverviewDescription: "Operational snapshot after simulation execution.",
      snapshotAvailable: "AVAILABLE",
      snapshotNotAvailable: "NOT AVAILABLE",
      coreDynamics: "Core Dynamics",
      coreDynamicsDescription: "Observed system behavior across baseline, response, and outcome.",
      assumptionsConstraints: "Assumptions & Constraints",
      assumptionsConstraintsDescription: "Declared boundaries under which the simulation was executed.",
      assumptionsText: "Declared system assumptions (non-exhaustive)",
      eventPhaseLog: "Event & Phase Log",
      eventPhaseLogDescription: "Chronological record of system changes.",
      rawEventLog: "RAW EVENT LOG",
      noDataAvailable: "— no data available —",
      footer: "Global time axis · Simulation / Interpretation / Human decision layers",
    },
  },
  SV: {
    decisionFlow: {
      title: "Beslutsflöde",
      subtitle: "Definiera situationen innan du genomför en simulering.",
      currentSystemState: "Nuvarande systemläge",
      currentSystemStateDescription: "Beskriv hur systemet fungerar i detta ögonblick.\nDetta utgör referenspunkten för alla efterföljande konsekvenser.\n\nDetta är inte en objektiv sanning.\nDet är en gemensam operativ bedömning.",
      systemLoadState: "Systemets belastningstillstånd",
      externalPressure: "Externt tryck",
      externalPressureDescription: "Identifiera pågående eller ökande tryck som verkar på systemet.\nDetta tryck existerar oberoende av det beslut som övervägs.\n\nSystemet måste agera inom dessa förutsättningar.",
      externalPressureTrend: "Trend för externt tryck",
      selectedResponse: "Vald respons",
      responseStrategy: "Responsstrategi",
      responseStrategyDescription: "Välj hur systemet ska svara på kombinationen av nuläge och externt tryck.\n\nResponsen påverkar hur trycket hanteras, skjuts upp eller ackumuleras.\nDen eliminerar inte de yttre förutsättningarna.",
      primaryResponseStrategy: "Primär responsstrategi",
      runSimulation: "Kör simulering",
      helperText: "Denna åtgärd genomför en enskild simulering.\nUtfallet kan inte ändras.",
      selectPlaceholder: "Välj...",
      loadStateStable: "Stabilt",
      loadStateManaging: "Hanterar belastning",
      loadStatePressure: "Under ihållande tryck",
      loadStateNearCapacity: "Nära kapacitet",
      pressureIncreasing: "Ökande",
      pressureFluctuating: "Fluktuerande",
      pressureStable: "Stabilt",
      pressureDecreasing: "Minskande",
      responseProtect: "Skydda stabilitet och människor",
      responseBalance: "Balansera korttidsbelastning och långsiktig hälsa",
      responsePush: "Pressa hårt för att möta nuvarande krav",
    },
    bevis: {
      title: "Bevis",
      subtitle: "Förklaring av systembeteende",
      backToDecisionFlow: "← Beslutsflöde",
      expertAnalysis: "Expertanalys →",
      viewExpertAnalysis: "Visa expertanalys →",
      systemJourney: {
        baseline: "Utgångsläge",
        pressure: "Tryck",
        response: "Respons",
        outcome: "Utfall",
        description: "Du tittar på det slutliga utfallet av en genomförd simulering.",
      },
      systemStatus: "Systemstatus",
      systemStatusDescription: "Systemet är fortsatt fungerande.\nMarginalerna har minskat under ihållande belastning.",
      load: "Belastning",
      capacityMargin: "Kapacitetsmarginal",
      recovery: "Återhämtning",
      stateAtDecision: "Tillstånd vid beslut",
      initialSystemState: "Initialt systemläge",
      initialSystemStateText: "I det ögonblick beslutet togs opererade systemet i ett utgångsläge. Basbelastningen representerade det operativa trycket som redan fanns. Systemets kapacitet definierade dess hållbara gräns innan försämring börjar, inte punkten för totalt sammanbrott. Återhämtningskapaciteten indikerade systemets förmåga att absorbera tillfällig belastning och återgå mot utgångsläget över tid.",
      externalFactor: "Extern faktor",
      appliedPressureOverTime: "Tillämpat tryck över tid",
      appliedPressureText: "Externt tryck verkade på systemet under hela simuleringsperioden. Detta tryck var oberoende av beslut som fattades inom systemet. Trycket ackumulerades eller utvecklades över tid och påverkade hur systemets utgångsläge interagerade med dess kapacitet och återhämtningsmekanismer.",
      decisionApplied: "Beslut tillämpat",
      selectedResponse: "Vald respons",
      selectedResponseText: "En responsstrategi tillämpades på systemet. Denna respons definierade hur systemet skulle reagera på kombinationen av dess utgångsläge och pågående externt tryck. Responsen opererade inom systemets begränsningar och tillgänglig marginal. Denna respons tog inte bort externt tryck från systemet.",
      systemDynamics: "Systemdynamik",
      systemResponse: "Systemrespons",
      systemResponseText: "Över tid reagerade systemet på det tillämpade trycket och den valda responsen. Interaktionen mellan belastning, kapacitet och återhämtning producerade gradvisa förändringar i systemtillståndet. Dessa förändringar ackumulerades när simuleringen fortskred och skapade konsekvenser som återspeglade systemets dynamik.",
      observedChange: "Observerad förändring",
      observedOutcome: "Observerat utfall",
      observedOutcomeText: "Simuleringen resulterade i ett slutligt systemtillstånd som skiljer sig från utgångsläget.\nUtfallet beskriver hur systemet utvecklades under givna förutsättningar.\n\nResultatet är beskrivande, inte värderande.\nDet anger varken framgång eller misslyckande.",
      consequences: "Konsekvenser",
      consequencesText: "Simuleringen resulterade i ett slutligt systemtillstånd som skiljde sig från det initiala utgångsläget. Detta slutliga tillstånd återspeglar hur systemets dynamik utvecklades givet de initiala förhållandena, det tillämpade trycket och den valda responsen. Konsekvenserna representerar systemets beteende under den simulerade tidsperioden. Detta utfall är inte ramat som framgång eller misslyckande.",
      disclaimer: "Denna vy förklarar konsekvenserna av en genomförd simulering. Den ger inga rekommendationer eller bedömer utfall som bra eller dåliga.",
      noSimulation: "Ingen genomförd simulering är tillgänglig.",
      increased: "Ökad",
      decreased: "Minskad",
      stable: "Stabilt",
      reduced: "Reducerad",
      expanded: "Utökad",
      maintained: "Bibehållen",
      strained: "Ansträngd",
      enhanced: "Förbättrad",
      preserved: "Bevarad",
      loadDiffers: "Belastning skiljer sig från utgångsläge",
      recoveryDiffers: "Återhämtningskapacitet skiljer sig från utgångsläge",
      stateChanged: "Systemtillstånd förändrades över tid",
    },
    expert: {
      backToBevis: "← Tillbaka till Bevis",
      backToDecisionFlow: "← Tillbaka till Beslutsflöde",
      systemOverview: "Systemöversikt",
      systemOverviewDescription: "Operativ ögonblicksbild efter genomförd simulering.",
      snapshotAvailable: "TILLGÄNGLIG",
      snapshotNotAvailable: "INTE TILLGÄNGLIG",
      coreDynamics: "Kärndynamik",
      coreDynamicsDescription: "Observerat systembeteende genom utgångsläge, respons och utfall.",
      assumptionsConstraints: "Antaganden och begränsningar",
      assumptionsConstraintsDescription: "Deklarerade ramar för simuleringens genomförande.",
      assumptionsText: "Deklarerade systemantaganden (icke-uttömmande)",
      eventPhaseLog: "Händelse- och faslogg",
      eventPhaseLogDescription: "Kronologisk logg över systemförändringar.",
      rawEventLog: "RÅ HÄNDELSELOGG",
      noDataAvailable: "— ingen data tillgänglig —",
      footer: "Global tidsaxel · Simulering / Tolkning / Mänskliga beslutsnivåer",
    },
  },
};

export function t(): Translations {
  const lang = getLanguage();
  return translations[lang];
}
