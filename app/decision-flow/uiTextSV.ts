// Swedish UI text for Decision Flow Sandbox
// This file contains only presentation strings - no logic or behavior

export const uiTextSV = {
  // Page title & navigation
  pageTitle: "Beslutsflöde – systemsimulering",
  backToIntro: "← Tillbaka till introduktion",
  whatAmISeeing: "Vad visas här?",
  
  // Helper panel
  helperTitle: "Om denna vy",
  helperParagraph1: "Denna vy visar hur ett antaget beslut samverkar med ett system över tid.",
  helperParagraph2: "Simuleringen synliggör effekter som inte alltid är tydliga vid själva beslutstillfället.",
  helperParagraph3: "Utfallet formas av systemets struktur, kapacitet och begränsningar – inte av beslutet isolerat.",
  
  // Presentation mode
  enterPresentationMode: "Aktivera presentationsläge",
  exitPresentationMode: "Avaktivera presentationsläge",
  
  // System update indicator
  systemStateUpdated: "Systemläge uppdaterat",
  
  // Section titles
  simulationInputs: "Scenario och förutsättningar",
  simulationInputsExplanation: "Detta är ett generiskt system. I kundpiloter ersätts detta med era faktiska scenarier.",
  simulationInputsPurpose: "Syftet med denna version är att visa hur systemet reagerar på olika förutsättningar, inte att representera ett specifikt fall.",
  decisionPolicy: "Antaget beslut",
  decisionFlow: "Översikt av simuleringen",
  visualResults: "Visuella resultat",
  consequencesOverTime: "Konsekvenser över tid",
  observedConsequences: "Observerade konsekvenser",
  decisionNarrative: "Beslutsnarrativ",
  systemImplications: "Systempåverkan",
  
  // Form labels
  currentSystemState: "Nuvarande systemläge",
  currentSystemStateDescription: "Hur belastat är systemet just nu?",
  externalChange: "Extern förändring",
  externalChangeDescription: "Vad ökar trycket på systemet?",
  responseFocus: "Fokus för respons",
  responseFocusDescription: "Vad är det primära fokuset för responsen?",
  
  // Form options - Current system state
  calmAndStable: "Lugnt och stabilt",
  manageable: "Hanterbart",
  strained: "Ansträngt",
  underHeavyPressure: "Under tung belastning",
  
  // Form options - External change
  increasingPressure: "Ökande tryck",
  lossOfCapacity: "Kapacitetsförlust",
  noMajorChange: "Ingen större förändring",
  
  // Form options - Response focus
  protectPeopleAndStability: "Skydda människor och stabilitet",
  balanceShortTermAndLongTerm: "Balansera korttidsbelastning och långsiktig hälsa",
  pushHardToMeetDemands: "Pressa hårt för att möta nuvarande krav",
  
  // Helper text
  pilotHelperText: "Denna pilot använder indexerade värden för att illustrera hur beslut påverkar ett system över tid. Fokus ligger på mönster, avvägningar och konsekvenser – inte exakta siffror.",
  
  // Buttons
  runSimulation: "Starta simulering",
  running: "Simuleringen körs…",
  
  // Policy labels (for dropdown)
  policyConservative: "Skydda människor och stabilitet",
  policyBalanced: "Balansera korttidsbelastning och långsiktig hälsa",
  policyAggressive: "Pressa hårt för att möta nuvarande krav",
  
  // Policy descriptions
  policyDescriptionGeneric: "Policyn beskriver hur systemet prioriterar vid belastning och begränsningar.",
  
  // Flow boxes
  flowBoxBaseline: "Utgångsläge",
  flowBoxBaselineDesc: "Initialt systemläge. Inga beslut tillämpade. Referenspunkt.",
  flowBoxLoad: "Belastning tillförs",
  flowBoxLoadDesc: "Externt tryck eller förändrade förhållanden. Inte ett beslut.",
  flowBoxDecision: "Beslutet tillämpas",
  flowBoxDecisionDesc: "Avsiktlig åtgärd tillämpad på systemet.",
  flowBoxTime: "Systemets respons",
  flowBoxTimeDesc: "Systemet utvecklas när tiden går.",
  flowBoxConsequences: "Konsekvenser",
  flowBoxConsequencesDesc: "Observerade effekter, avvägningar och uppkommande utfall.",
  flowBoxCompare: "Jämför med utgångsläge",
  flowBoxCompareDesc: "Skillnader mellan utfall och att inte göra något.",
  
  // Flow hint
  clickStepToFocus: "Klicka på ett steg för att fokusera på det",
  
  // Visual Results
  load: "Systembelastning",
  cost: "Kapacitetsutnyttjande",
  baseline: "Utgångsläge",
  final: "Slutligt",
  
  // Timeline headers
  time: "Tid",
  metric: "Mått",
  deltaChange: "Δ Förändring",
  value: "Värde",
  
  // Observed consequences
  accumulatedImpact: "Ackumulerad påverkan",
  accumulatedImpactText: "Små skillnader tidigt kan resultera i betydande långsiktiga effekter.",
  recovery: "Återhämtning",
  recoveryReturns: "Systemet återgår till utgångsläget inom den valda tidsramen.",
  recoveryNotReturns: "Systemet återhämtar sig inte inom den valda tidsramen.",
  systemState: "Systemläge",
  systemStateStable: "Stabilt",
  systemStateUnderPressure: "Under tryck",
  systemStateUnstable: "Instabilt",
  observedConsequencesDisclaimer: "Denna simulering visar konsekvenser – inte rekommendationer.",
  
  // Decision narrative
  decisionNarrativeSubtitle: "Hur olika val formar systemet över tid under samma förutsättningar.",
  alternativeResponse: "Alternativ respons",
  earlyResponse: "Tidig respons",
  accumulation: "Ackumulering",
  outcome: "Utfall",
  decisionNarrativeDisclaimer: "Detta narrativ visar hur beslut utvecklas över tid. Det ger inga rekommendationer eller optimerar utfall.",
  ifDifferentResponse: "Om en annan respons tillämpas under samma förutsättningar:",
  sameResponseNote: "Under samma förutsättningar leder valet av samma respons till en liknande bana. Meningsfull avvikelse skulle kräva annan timing, skala eller fokus i responsen.",
  
  // System implications
  systemImplicationsSubtitle: "Signaler som systemet avger under ihållande tryck, oavsett responsstrategi.",
  implication1: "Systemet visar ökad belastning över tid.",
  implication2: "Kapacitetsbegränsningar blir gradvis synliga.",
  implication3: "Systemets stabilitet påverkas när belastningen närmar sig dess gränser.",
  systemImplicationsDisclaimer: "Dessa implikationer beskriver systemnivåsignaler under de nuvarande förhållandena. De är inte kopplade till ett specifikt beslut och utgör inte rekommendationer.",
  
  // Presentation mode - hidden sections
  baselineData: "Utgångsläge",
  finalState: "Slutligt tillstånd",
  compareVsBaseline: "Jämför med utgångsläge",
  consequencesData: "Konsekvenser över tid",
  
  // Narrative generation strings (used in dynamic text generation)
  narrativeIntro: "Simuleringen visar hur systemet utvecklas när beslutet verkar över tid.",
  midPhaseNarrative: "Effekter ackumuleras gradvis i takt med att belastning och begränsningar samverkar.",
  latePhaseNarrative: "Små skillnader tidigt i förloppet ger förstärkta effekter senare.",
  
  // Narrative phase 1 strings
  narrativePhase1PressureRises: "Trycket stiger snabbt.",
  narrativePhase1SystemAbsorbs: "Systemet absorberar den initiala förändringen.",
  narrativePhase1SystemResponds: "Systemet svarar på den initiala förändringen.",
  narrativePhase1EarlyTradeoffs: " Tidiga avvägningar uppstår.",
  
  // Narrative phase 2 strings
  narrativePhase2SustainedPressure: "Ihållande tryck begränsar framtida alternativ. Systemets flexibilitet minskar när begränsningar blir mer etablerade.",
  narrativePhase2Oscillates: "Systemet svänger mellan stabilitet och belastning. Någon flexibilitet finns kvar, men upprepade obalanser skapar låsningseffekter.",
  narrativePhase2Stable: "Systemet behåller relativ stabilitet med minimal begränsningsbildning.",
  narrativePhase2ResourcesCommitted: " Resurser är förbundna, vilket minskar tillgänglig marginal för framtida justeringar.",
  narrativePhase2ResourceAllocation: " Resursfördelningen förskjuts, vilket påverkar systemets motståndskraft.",
  
  // Narrative phase 3 strings
  narrativePhase3Recovery: "Systemet når en ny jämvikt som stämmer överens med utgångsläget. Systemläget är",
  narrativePhase3CostAndLoad: "Systemet stabiliseras vid en ny jämvikt med högre ihållande kostnad och tryck. Flexibilitet och marginal är reducerade. Systemläget är",
  narrativePhase3CostOnly: "Systemet når en ny jämvikt med högre ihållande kostnad. Återhämtning är ofullständig, och tillgänglig marginal är minskad. Systemläget är",
  narrativePhase3LoadOnly: "Systemet stabiliseras med ihållande tryck över utgångsläget. Återhämtning är fördröjd, och operativ flexibilitet är begränsad. Systemläget är",
  narrativePhase3Other: "Systemet når en ny jämvikt som skiljer sig från utgångsläget. Återhämtning är ofullständig. Systemläget är",
  
  // Implications strings
  implicationsPressureElevated: "Förhöjt tryck signalerar ökad känslighet och sårbarhet för ytterligare störningar.",
  implicationsPressureIntermittent: "Intermittent tryck signalerar att systemet behåller viss adaptiv kapacitet, även om känslighet kvarstår.",
  implicationsCommitmentReduced: "Ihållande åtaganden signalerar minskad flexibilitet och reducerad marginal för framtida justeringar.",
  implicationsCommitmentPreserved: "Resursåtaganden förblir närmare utgångsläget, vilket signalerar bevarad flexibilitet.",
  implicationsRecoveryDependent: "Återhämtningssignaler beror på förändringar utanför det nuvarande responsmönstret, vilket indikerar strukturellt beroende av externa förhållanden.",
  implicationsRecoveryAbility: "Systemet signalerar förmågan att återanpassa sig till utgångsläget under nuvarande responsmönster.",
  
  // Policy B comparison strings
  policyBComparisonConservative: "Tryckreducering sker tidigare, men vägen till återhämtning förlängs. Systemet prioriterar stabilitet och bevarar flexibilitet, även om omedelbara kapacitetsvinster skjuts upp.",
  policyBComparisonAggressive: "Systemet svarar snabbare på omedelbara krav, vilket accelererar initial lättnad. Men ihållande tryck ackumuleras över tid, och långsiktig flexibilitet minskas. Korttidsstörning är lägre, men operativ marginal smalnar av.",
  policyBComparisonOther: "Banan divergerar i timing och avvägningsmönster. Systemet balanserar omedelbart svar med långsiktiga överväganden annorlunda, vilket påverkar när begränsningar bildas och hur flexibilitet bevaras eller minskas.",
  
  // General disclaimers
  simulationNotPrediction: "Detta är en simulering, inte en prognos.",
  noGuaranteedOutcomes: "Simuleringen garanterar inga verkliga utfall."
};

