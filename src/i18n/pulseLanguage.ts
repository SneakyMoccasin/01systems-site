export const domainDrivers = {
  realEstate: {
    tenantStability: "Tenant stability",
    energyCost: "Energy cost",
    financingCost: "Financing cost",
    maintenanceBacklog: "Maintenance backlog",
  },
  municipal: {
    tenantStability: "Service capacity",
    energyCost: "Infrastructure load",
    financingCost: "Budget pressure",
    maintenanceBacklog: "Maintenance backlog",
  },
  consulting: {
    tenantStability: "Project stability",
    energyCost: "Resource strain",
    financingCost: "Budget exposure",
    maintenanceBacklog: "Delivery backlog",
  },
} as const;

export type DomainKey = keyof typeof domainDrivers;

let activeDomainValue: DomainKey = "realEstate";

export const activeDomain = activeDomainValue;

export function setActiveDomain(domain: DomainKey): void {
  activeDomainValue = domain;
}

export function getDomainLabel(key: string): string {
  const domain = domainDrivers[activeDomainValue];
  return (domain as Record<string, string>)?.[key] ?? key;
}

export const pulseLanguage = {
  en: {
    executiveQuestion: "Executive Question",
    ask: "Ask",
    executiveSummary: "Executive Summary",
    structuralAnalysis: "Structural Analysis",
    cascadeDynamics: "Cascade Dynamics",
    forwardOutlook: "Forward Outlook",
    systemPressure: "System Pressure",
    structuralBreach: "Structural Breach",
    primaryDriver: "Primary Driver",
    cascade: "Cascade",
    marginTrend: "Margin Trend",
    robust: "Robust",
    sustainable: "Sustainable",
    structuralErosion: "Structural erosion",
    collapseZone: "Collapse zone",
    erosion: "Structural erosion",
    collapse: "Collapse",
    tippingRisk: "Tipping risk",
    systemStatus: "System Status",
    decisionFlow: "Decision Flow",
    aiInterpretation: "AI Interpretation",
    aiSummary: "Summary",
    aiStructuralAnalysis: "Structural analysis",
    aiCascadeDynamics: "How cascade effects spread",
    aiOutlook: "Outlook",
    compact: "Compact",
    detailed: "Detailed",
    compactDetailedLabel: "Compact / Detailed:",
    aiAnalysing: "AI analysing scenario trace...",
    askPlaceholder: "Ask a question about the system...",
    answering: "Answering...",
    noResponse: "No response.",
    unableToAnswer: "Unable to get an answer.",
    estimatedStructuralBreach: "Estimated Structural Breach:",
    customScenarioTitle: "Custom Scenario",
    customScenarioHelper: "Describe your own scenario (e.g. energy prices increase sharply).",
    scenarioInterpretationTitle: "Scenario Interpretation",
    detectedDrivers: "Detected drivers",
    noDriversDetected: "No structural drivers detected.",
    driverLabels: {
      tenantStability: "Tenant stability",
      energyCost: "Energy cost",
      financingCost: "Financing cost",
      maintenanceBacklog: "Maintenance backlog",
      capitalCommitmentRigidityRisk: "Capital commitment rigidity",
      maintenanceIntensityRisk: "Maintenance intensity",
      tenantStabilityRisk: "Tenant stability",
      demandRisk: "Demand",
      interestRateExposureRisk: "Interest-rate exposure",
      refinancingRisk: "Refinancing risk",
      leverageLevelRisk: "Leverage level",
      operationalEfficiencyRisk: "Operational efficiency",
    } as Record<string, string>,
    riskLabels: {
      interestRateExposureRisk: "Interest rate exposure",
      refinancingRisk: "Refinancing risk",
      leverageLevelRisk: "Leverage level",
      capitalCommitmentRigidityRisk: "Capital commitment rigidity",
      maintenanceIntensityRisk: "Maintenance pressure",
      operationalEfficiencyRisk: "Operational efficiency",
      pricingPowerRisk: "Pricing power",
      marketVolatilityRisk: "Market volatility",
      regulatoryPressureRisk: "Regulatory pressure",
      tenantStabilityRisk: "Tenant stability",
      demandRisk: "Demand risk",
      energyExposureRisk: "Energy cost exposure",
    } as Record<string, string>,
    domainLabels: {
      interestRateExposureRisk: "Interest rate exposure",
      refinancingRisk: "Refinancing risk",
      leverageLevelRisk: "Leverage level",
      capitalCommitmentRigidityRisk: "Capital commitment rigidity",
      maintenanceIntensityRisk: "Maintenance pressure",
      tenantStabilityRisk: "Tenant stability",
      demandRisk: "Demand risk",
      energyExposureRisk: "Energy cost exposure",
    } as Record<string, string>,
    scenarioLabels: {
      "interest-shock": "Interest Rate Shock",
      "energy-spike": "Energy Cost Spike",
      "tenant-loss": "Tenant Loss",
      "maintenance-backlog": "Maintenance Backlog",
      "refinancing-shock": "Refinancing Shock",
      "active-maintenance-strategy": "Active maintenance strategy",
      parallelInvestmentStarts: "Parallel investment starts",
      delayedIntervention: "Delayed intervention",
      limitedExecutionCapacity: "Limited execution capacity",
    } as Record<string, string>,
    scenarioDescriptions: {
      "interest-shock": "Sharp increase in financing costs.",
      "energy-spike": "Operating costs increase due to energy prices.",
      "tenant-loss": "Large tenant leaves the property.",
      "maintenance-backlog": "Maintenance is deferred to reduce short term cost.",
      "refinancing-shock":
        "Interest rate pressure triggers refinancing stress which cascades through capital rigidity, maintenance pressure and tenant stability.",
      "active-maintenance-strategy":
        "Targeted maintenance investments reduce operational pressure, improve tenant stability and restore structural flexibility.",
      parallelInvestmentStarts:
        "Several investment initiatives start in parallel and increase near-term coordination pressure.",
      delayedIntervention:
        "Interventions are postponed, allowing structural pressure to build before response.",
      limitedExecutionCapacity:
        "Execution bandwidth is constrained, reducing implementation speed and follow-through.",
    } as Record<string, string>,
    scenarioPrompts: {
      "interest-shock": `
Interest rate exposure increases to HIGH.
This increases refinancing risk.
Refinancing pressure increases leverage level risk.
Higher leverage increases capital commitment rigidity.
Capital rigidity increases maintenance pressure.
Maintenance pressure reduces tenant stability.
Tenant instability reduces demand.
`,
      "energy-spike": "Operating costs increase due to rising energy prices.",
      "tenant-loss": "A major tenant leaves causing demand reduction.",
      "maintenance-backlog": "Maintenance is deferred causing gradual property degradation.",
      "refinancing-shock": `
Interest rate exposure increases to HIGH.
This creates refinancing risk.
Refinancing pressure increases capital commitment rigidity.
Capital rigidity increases maintenance pressure.
Maintenance pressure reduces tenant stability.
Tenant instability reduces demand.
`,
      "active-maintenance-strategy": `
Maintenance intensity risk decreases significantly.
Tenant stability risk decreases.
Capital commitment rigidity risk decreases.
Demand risk decreases.
`,
      parallelInvestmentStarts: `
Multiple investment programs are launched in parallel.
Coordination pressure increases.
Execution complexity increases before benefits are realized.
`,
      delayedIntervention: `
Intervention decisions are delayed.
Structural pressure accumulates before action is taken.
System response starts later than planned.
`,
      limitedExecutionCapacity: `
Execution capacity is constrained.
Operational follow-through is slower.
Improvements are implemented gradually with higher delivery friction.
`,
    } as Record<string, string>,
    graphLegend: {
      strategyA: "Baseline",
      strategyB: "Goal strategy",
      markerBaseline: "Baseline",
      markerSelected: "Selected point",
      markerConstraint: "Constraint active",
      markerTipping: "Tipping point",
      robust: "Robust",
      sustainable: "Sustainable",
      erosion: "Erosion",
      collapse: "Collapse",
    } as Record<string, string>,
    systemDrivers: "System Drivers",
    cascadeStatus: "Cascade",
    estimatedBreach: "Estimated breach",
    cascadeDetected: "Detected",
    cascadeNone: "None",
    estimatedBreachNotEstimated: "Not estimated",
    marginTrendDeclining: "Declining",
    marginTrendStable: "Stable",
    marginTrendImproving: "Improving",
    decisionExplanation: "Decision Explanation",
    driverChange: "Driver change",
    cascadePropagation: "Cascade propagation",
    pressureResponse: "System pressure",
    aiInspector: "AI Inspector",
    events: "Events",
    impact: "Impact",
    caseLabel: "Case:",
    noAnalysisActive: "No analysis active",
    noActiveDriver: "No active driver",
    tippingRiskPeriodLabel: "Tipping risk period",
    margins: "Margins",
    scenarioPreview: "Scenario preview",
    proposedChanges: "Proposed changes",
    runSimulation: "Run simulation",
    cancel: "Cancel",
    baseline: "Baseline",
    selectedTimePoint: "Decision point",
    tippingPoint: "Tipping point",
    reset: "Reset",
    scenarioLibrary: "Try a scenario",
    applyTo: "Apply scenario to:",
    currentStrategy: "Baseline",
    alternativeStrategy: "Goal strategy",
    noRecognizedScenarioFactors: "No recognized scenario factors.",
    scenarioAChanges: "Scenario A changes",
    scenarioBChanges: "Scenario B changes",
    decisionTimeline: "Decision timeline",
    action: "Action",
    riskDecision: "Risk decision",
    systemEvent: "System event",
    noDecisionEvents: "No decision events",
    systemInterpretationHelper: "Summarized system explanation based on the scenario trace.",
    riskBegins: "Risk begins",
    scenarioOutcomeTitle: "Scenario Outcome",
    noBreachInHorizon: "No breach in horizon",
    structuralBreakExpectedAround: (n: number) =>
      `Structural break expected around M${n}`,
    noStructuralBreakWithinHorizon:
      "No structural break within simulation horizon",
    estimatedBreachExpectedAround: (n: number) => `Expected around M${n}`,
    finalMargin: "Final margin",
    resultLabel: "Result",
    marginImprovementLabel: "Margin improvement",
    scenarioBDelaysCollapse: (n: number) =>
      `Scenario B delays collapse by ${n} quarter${n !== 1 ? "s" : ""}.`,
    previewImpact: "Analyze scenario",
    previewImpactHelper: "Applies the scenario and analyzes how the system evolves over time.",
    recentScenarios: "Recent scenarios",
    autoScaleOn: "Auto-scale: ON",
    autoScaleOff: "Auto-scale: OFF",
    viewLabel: "View:",
    simulationNeedsUpdate: "Simulation needs update — press Start to rerun",
    actionNeedsStart: "New action selected — press Start to simulate.",
    viewChangeFromBaseline: "Change from baseline",
    viewSystemLevel: "System level",
    both: "Both",
    scenarioAStatus: "Scenario A status:",
    scenarioBStatus: "Scenario B status:",
    scenarioAMargin: "Scenario A margin:",
    scenarioBMargin: "Scenario B margin:",
    scenarioBDoesNotDelayBreach: "Scenario B does not delay structural breach.",
    scenarioBDelaysBreachBy: (n: number) =>
      `Scenario B delays structural breach by ${n} quarter${n !== 1 ? "s" : ""}.`,
    whyPanelTitle: "Why Scenario B performs differently",
    scenarioBSlowsDecline: (x: string) => `Scenario B slows margin decline by ${x}`,
    scenarioBDelaysBreachWhy: (n: number) =>
      `Scenario B delays structural breach by ${n} quarter${n !== 1 ? "s" : ""}.`,
    systemImpactLabel: "System impact",
    outcomeLabel: "Outcome",
    capitalConstraint: "Capital constraint",
    active: "ACTIVE",
    inactive: "INACTIVE",
    helpTitle: "Help",
    helpStep1: "Adjust risk levels on the left or choose a scenario.",
    helpStep2: "Click Start to simulate system development over time.",
    helpStep3:
      "The graph shows how structural stability evolves for current and alternative strategies.",
    helpZonesTitle: "Zone meaning:",
    helpZoneRobust: "Robust — stable development",
    helpZoneSustainable: "Sustainable — within safe range",
    helpZoneErosion: "Erosion — structural weakening",
    helpZoneCollapse: "Collapse — system breakdown",
    helpStep5: "Freeze saves a snapshot so scenarios can be compared.",
    helpStep6:
      "Simulation Horizon (12M / 36M / 60M) controls simulation length.",
    expertMode: "Expert Mode",
    executiveMode: "Executive Mode",
    structuralInspectionLayer:
      "Structural inspection layer — engine diagnostics",
    structuralMetrics: "Structural Metrics",
    constraintView: "Constraint View",
    simulationMonths: "Simulation months",
    tippingStep: "Tipping step",
    pilotDomainTitle: {
      realEstate: "Real Estate Portfolio",
      municipal: "Transport System",
      consulting: "Decision Environment",
    },
    pilotPageTitleSuffix: "Cascade Engine",
    pilotSimulationHorizonLabel: "Simulation horizon",
    pilotCustomHorizonLabel: "Custom horizon",
    transportScenarioPresetPanelTitle: "Scenario",
    transportScenarioPresetLabels: {
      increase_accessibility: "Improve accessibility",
      increase_modal_attractiveness: "Increase public transport attractiveness",
      reduce_capacity_pressure: "Reduce capacity pressure",
      margin_stability: "Stabilize margins",
      avoid_tipping: "Avoid tipping",
    },
    transportGraphSectionTitle: "Structural decision space over time",
    transportGraphFocusPrefix: "Focus:",
    transportGraphFocusRealEstate:
      "How refinancing, capital lock-in, occupancy, and cash flow affect portfolio room to act",
    transportGraphFocusTransport: {
      avoid_tipping: "Tipping risk and structural divergence points",
      stabilize_margin: "Structural margin level over time",
      reduce_capacity_pressure: "How capacity pressure affects the system's decision space",
      increase_modal_attractiveness: "Attractiveness-driven propagation in the transport system",
      default: "Accessibility-driven structural development",
    },
    transportGraphDescriptionRealEstate:
      "The graph shows how portfolio room to act changes over time as refinancing, capital lock-in, cash flow, occupancy, and maintenance strategy evolve together.",
    transportGraphDescriptionTransport:
      "The graph shows how the system's structural decision space changes over time depending on which decisions are combined. It does not show an optimal solution, but how decisions affect stability, constraints, and tipping risk over time.",
    showEarlyInfluencePoints: "Show early influence points",
    hideEarlyInfluencePoints: "Hide early influence points",
    showDriverActivations: "Show driver activations",
    hideDriverActivations: "Hide driver activations",
    expertCloseAriaLabel: "Return to Executive Mode",
    executiveDemoPresentation: "Executive Demo",
    executiveDemoPresentationExit: "Exit demo",
  },
  sv: {
    executiveQuestion: "Fråga till systemet",
    ask: "Fråga",
    executiveSummary: "Sammanfattning",
    structuralAnalysis: "Strukturell analys",
    cascadeDynamics: "Kaskaddynamik",
    forwardOutlook: "Framåtblick",
    systemPressure: "Systemtryck",
    structuralBreach: "Strukturellt brott",
    primaryDriver: "Primär drivare",
    cascade: "Kaskad",
    marginTrend: "Marginaltrend",
    robust: "Robust",
    sustainable: "Hållbar",
    structuralErosion: "Strukturell erosion",
    collapseZone: "Kollapszon",
    erosion: "Erosion",
    collapse: "Kollaps",
    tippingRisk: "Tipping risk",
    systemStatus: "Systemstatus",
    decisionFlow: "Beslutsflöde",
    aiInterpretation: "AI-tolkning",
    aiSummary: "Sammanfattning",
    aiStructuralAnalysis: "Strukturell analys",
    aiCascadeDynamics: "Hur kaskadeffekter sprider sig",
    aiOutlook: "Framtidsblick",
    compact: "Kort",
    detailed: "Detaljerad",
    compactDetailedLabel: "Kort / Detaljerad:",
    aiAnalysing: "AI analyserar scenariospår...",
    askPlaceholder: "Ställ en fråga om systemet...",
    answering: "Svarar...",
    noResponse: "Inget svar.",
    unableToAnswer: "Kunde inte få svar.",
    estimatedStructuralBreach: "Uppskattat strukturellt brott:",
    customScenarioTitle: "Eget scenario",
    customScenarioHelper: "Beskriv ett eget scenario (t.ex. energipriser stiger kraftigt).",
    scenarioInterpretationTitle: "Scenario tolkning",
    detectedDrivers: "Identifierade drivare",
    noDriversDetected: "Inga strukturella drivare identifierade.",
    driverLabels: {
      tenantStability: "Hyresgäststabilitet",
      energyCost: "Energikostnad",
      financingCost: "Finansieringskostnad",
      maintenanceBacklog: "Underhållsskuld",
      capitalCommitmentRigidityRisk: "Kapitalbindning",
      maintenanceIntensityRisk: "Underhållstryck",
      tenantStabilityRisk: "Hyresgäststabilitet",
      demandRisk: "Efterfrågan",
      interestRateExposureRisk: "Ränteexponering",
      refinancingRisk: "Refinansieringsrisk",
      leverageLevelRisk: "Belåningsnivå",
      liquidityPressure: "Likviditetspress",
      operationalEfficiencyRisk: "Drifteffektivitet",
    } as Record<string, string>,
    riskLabels: {
      interestRateExposureRisk: "Ränteexponering",
      refinancingRisk: "Refinansieringsrisk",
      leverageLevelRisk: "Belåningsnivå",
      liquidityPressure: "Likviditetspress",
      capitalCommitmentRigidityRisk: "Kapitalbindning",
      maintenanceIntensityRisk: "Underhållstryck",
      operationalEfficiencyRisk: "Drifteffektivitet",
      pricingPowerRisk: "Prissättningskraft",
      marketVolatilityRisk: "Marknadsvolatilitet",
      regulatoryPressureRisk: "Regulatoriskt tryck",
      tenantStabilityRisk: "Hyresgäststabilitet",
      demandRisk: "Efterfrågerisk",
      energyExposureRisk: "Energikostnadsexponering",
    } as Record<string, string>,
    domainLabels: {
      interestRateExposureRisk: "Ränteexponering",
      refinancingRisk: "Refinansieringsrisk",
      leverageLevelRisk: "Belåningsnivå",
      liquidityPressure: "Likviditetspress",
      capitalCommitmentRigidityRisk: "Kapitalbindning",
      maintenanceIntensityRisk: "Underhållstryck",
      tenantStabilityRisk: "Hyresgäststabilitet",
      demandRisk: "Efterfrågerisk",
      energyExposureRisk: "Energikostnadsexponering",
    } as Record<string, string>,
    scenarioLabels: {
      "interest-shock": "Räntechock",
      "energy-spike": "Energikostnadsspike",
      "tenant-loss": "Hyresgästbortfall",
      "maintenance-backlog": "Uppskjutet underhåll",
      "refinancing-shock": "Refinansieringschock",
      "active-maintenance-strategy": "Aktiv underhållsstrategi",
      parallelInvestmentStarts: "Parallella investeringsstarter",
      delayedIntervention: "Fördröjd intervention",
      limitedExecutionCapacity: "Begränsad genomförandekapacitet",
    } as Record<string, string>,
    scenarioDescriptions: {
      "interest-shock": "Kraftig ökning av finansieringskostnader.",
      "energy-spike": "Driftskostnader ökar på grund av energipriser.",
      "tenant-loss": "Stor hyresgäst lämnar objektet.",
      "maintenance-backlog": "Underhåll skjuts upp för att sänka kortsiktig kostnad.",
      "refinancing-shock":
        "Räntepress skapar refinansieringsstress som sprider sig via kapitalbindning, underhållstryck och hyresgäststabilitet.",
      "active-maintenance-strategy":
        "Riktade underhållsinvesteringar minskar operativt tryck, förbättrar hyresgäststabilitet och återställer strukturell flexibilitet.",
      parallelInvestmentStarts:
        "Flera investeringsinitiativ startar parallellt och ökar samordningstrycket på kort sikt.",
      delayedIntervention:
        "Interventioner skjuts upp, vilket gör att strukturellt tryck byggs upp innan respons.",
      limitedExecutionCapacity:
        "Genomförandekapaciteten är begränsad och minskar implementeringstakten.",
    } as Record<string, string>,
    scenarioPrompts: {
      "interest-shock": `
Ränteexponeringen ökar till HÖG.
Detta ökar refinansieringsrisken.
Refinansieringstryck ökar risken i belåningsnivån.
Högre belåning ökar kapitalbindningsrisken.
Kapitalbindning ökar underhållstrycket.
Underhållstryck minskar hyresgäststabiliteten.
Hyresgästinstabilitet minskar efterfrågan.
`,
      "energy-spike": "Driftskostnader ökar på grund av stigande energipriser.",
      "tenant-loss": "En större hyresgäst lämnar och orsakar minskad efterfrågan.",
      "maintenance-backlog":
        "Underhåll skjuts upp vilket orsakar gradvis fastighetsförsämring.",
      "refinancing-shock": `
Ränteexponeringen ökar till HÖG.
Detta skapar refinansieringsrisk.
Refinansieringstryck ökar kapitalbindningsrisken.
Kapitalbindning ökar underhållstrycket.
Underhållstryck minskar hyresgäststabiliteten.
Hyresgästinstabilitet minskar efterfrågan.
`,
      "active-maintenance-strategy": `
Underhållsintensitetsrisken minskar betydligt.
Hyresgäststabilitetsrisken minskar.
Kapitalbindningsrisken minskar.
Efterfrågerisken minskar.
`,
      parallelInvestmentStarts: `
Flera investeringsprogram startar samtidigt.
Samordningstrycket ökar.
Genomförandekomplexiteten ökar innan effekterna realiseras.
`,
      delayedIntervention: `
Interventionsbeslut fördröjs.
Strukturellt tryck byggs upp innan åtgärd.
Systemresponsen startar senare än planerat.
`,
      limitedExecutionCapacity: `
Genomförandekapaciteten är begränsad.
Operativ uppföljning går långsammare.
Förbättringar införs gradvis med högre leveransfriktion.
`,
    } as Record<string, string>,
    graphLegend: {
      strategyA: "Nuvarande strategi",
      strategyB: "Alternativ strategi",
      markerBaseline: "Baslinje",
      markerSelected: "Vald tidpunkt",
      markerConstraint: "Begränsning aktiveras",
      markerTipping: "Tippingpunkt",
      robust: "Robust",
      sustainable: "Hållbar",
      erosion: "Erosion",
      collapse: "Kollaps",
    } as Record<string, string>,
    systemDrivers: "Systemdrivare",
    cascadeStatus: "Kaskad",
    estimatedBreach: "Uppskattat brott",
    cascadeDetected: "Detekterad",
    cascadeNone: "Ingen",
    estimatedBreachNotEstimated: "Ej uppskattat",
    marginTrendDeclining: "Nedåtgående",
    marginTrendStable: "Stabil",
    marginTrendImproving: "Uppåtgående",
    decisionExplanation: "Beslutsförklaring",
    driverChange: "Drivarförändring",
    cascadePropagation: "Kaskadspridning",
    pressureResponse: "Systemtryck",
    aiInspector: "AI-inspektör",
    events: "Händelser",
    impact: "Påverkan",
    caseLabel: "Fall:",
    noAnalysisActive: "Ingen analys aktiv",
    noActiveDriver: "Ingen aktiv drivare",
    tippingRiskPeriodLabel: "Tipping risk period",
    margins: "Marginaler",
    scenarioPreview: "Scenariovisning",
    proposedChanges: "Föreslagna förändringar",
    runSimulation: "Kör simulering",
    cancel: "Avbryt",
    baseline: "Baslinje",
    selectedTimePoint: "Vald tidpunkt",
    tippingPoint: "Tippingpunkt",
    reset: "Återställ",
    scenarioLibrary: "Testa ett scenario",
    applyTo: "Applicera scenario på:",
    currentStrategy: "Nuvarande strategi",
    alternativeStrategy: "Alternativ strategi",
    noRecognizedScenarioFactors: "Inga identifierade scenariofaktorer.",
    scenarioAChanges: "Scenario A – förändringar",
    scenarioBChanges: "Scenario B – förändringar",
    decisionTimeline: "Beslutstidslinje",
    action: "Åtgärd",
    riskDecision: "Riskbeslut",
    systemEvent: "Systemhändelse",
    noDecisionEvents: "Inga besluthändelser",
    systemInterpretationHelper: "Sammanfattad systemförklaring baserad på scenariospåret.",
    riskBegins: "Risk börjar",
    scenarioOutcomeTitle: "Scenarioresultat",
    noBreachInHorizon: "Inget brott inom horisonten",
    structuralBreakExpectedAround: (n: number) =>
      `Strukturellt brott väntas kring M${n}`,
    noStructuralBreakWithinHorizon:
      "Inget strukturellt brott inom simuleringshorisonten",
    estimatedBreachExpectedAround: (n: number) => `Väntas kring M${n}`,
    finalMargin: "Slutmarginal",
    resultLabel: "Resultat",
    marginImprovementLabel: "Marginalförbättring",
    scenarioBDelaysCollapse: (n: number) =>
      `Scenario B fördröjer kollaps med ${n} kvartal.`,
    previewImpact: "Analysera scenario",
    previewImpactHelper: "Applicerar scenariot och analyserar hur systemet reagerar över tid.",
    recentScenarios: "Senaste scenarier",
    autoScaleOn: "Autoskalning: PÅ",
    autoScaleOff: "Autoskalning: AV",
    viewLabel: "Vy:",
    simulationNeedsUpdate: "Simuleringen behöver uppdateras — tryck Start",
    actionNeedsStart: "Ny åtgärd vald — tryck Start för att simulera.",
    viewChangeFromBaseline: "Förändring från nuläge",
    viewSystemLevel: "Systemnivå",
    both: "Båda",
    scenarioAStatus: "Scenario A status:",
    scenarioBStatus: "Scenario B status:",
    scenarioAMargin: "Scenario A marginal:",
    scenarioBMargin: "Scenario B marginal:",
    scenarioBDoesNotDelayBreach: "Scenario B fördröjer inte strukturellt brott.",
    scenarioBDelaysBreachBy: (n: number) =>
      `Scenario B fördröjer strukturellt brott med ${n} kvartal.`,
    whyPanelTitle: "Varför Scenario B skiljer sig från Scenario A",
    scenarioBSlowsDecline: (x: string) => `Scenario B saktar marginalförlust med ${x}`,
    scenarioBDelaysBreachWhy: (n: number) =>
      `Scenario B försenar strukturellt brott med ${n} kvartal.`,
    systemImpactLabel: "Systempåverkan",
    outcomeLabel: "Utfall",
    capitalConstraint: "Kapitalbegränsning",
    active: "AKTIV",
    inactive: "INAKTIV",
    helpTitle: "Help",
    helpStep1: "Justera risknivåer till vänster eller välj ett scenario.",
    helpStep2: "Klicka Start för att simulera systemets utveckling över tid.",
    helpStep3:
      "Grafen visar hur systemets strukturella stabilitet utvecklas för nuvarande och alternativ strategi.",
    helpZonesTitle: "Zonernas betydelse:",
    helpZoneRobust: "Robust — stabil utveckling",
    helpZoneSustainable: "Hållbar — inom säker nivå",
    helpZoneErosion: "Erosion — strukturell försvagning",
    helpZoneCollapse: "Kollaps — systemet bryter samman",
    helpStep5: "Freeze sparar ett snapshot så scenarier kan jämföras.",
    helpStep6:
      "Simulation Horizon (12M / 36M / 60M) styr hur långt simuleringen körs.",
    expertMode: "Expertläge",
    executiveMode: "Executivt läge",
    structuralInspectionLayer:
      "Strukturellt inspektionslager — motordiagnostik",
    structuralMetrics: "Strukturella mått",
    constraintView: "Begränsningsvy",
    simulationMonths: "Simuleringsmånader",
    tippingStep: "Tipping-steg",
    pilotDomainTitle: {
      realEstate: "Fastighetsportfölj",
      municipal: "Transportsystem",
      consulting: "Besluts- och scenariomiljö",
    },
    pilotPageTitleSuffix: "Simulering av beslutspåverkan",
    pilotSimulationHorizonLabel: "Simuleringshorisont",
    pilotCustomHorizonLabel: "Anpassad horisont",
    transportScenarioPresetPanelTitle: "Scenario",
    transportScenarioPresetLabels: {
      increase_accessibility: "Förbättra tillgänglighet",
      increase_modal_attractiveness: "Öka kollektivtrafikens attraktivitet",
      reduce_capacity_pressure: "Minska kapacitetstryck",
      margin_stability: "Stabilisera marginaler",
      avoid_tipping: "Undvik tipping",
    },
    transportGraphSectionTitle: "Strukturellt handlingsutrymme över tid",
    transportGraphFocusPrefix: "Fokus:",
    transportGraphFocusRealEstate:
      "Hur refinansiering, kapitalbindning, beläggning och kassaflöde påverkar portföljens handlingsutrymme",
    transportGraphFocusTransport: {
      avoid_tipping: "Tipping-risk och strukturella divergenspunkter",
      stabilize_margin: "Strukturell marginalnivå över tid",
      reduce_capacity_pressure: "Kapacitetstryckets påverkan på systemets handlingsutrymme",
      increase_modal_attractiveness: "Attraktivitetsdriven spridning i transportsystemet",
      default: "Tillgänglighetsdriven strukturell utveckling",
    },
    transportGraphDescriptionRealEstate:
      "Grafen visar hur portföljens handlingsutrymme förändras över tid när refinansiering, kapitalbindning, kassaflöde, beläggning och underhållsstrategi utvecklas tillsammans.",
    transportGraphDescriptionTransport:
      "Grafen visar hur systemets strukturella handlingsutrymme förändras över tid beroende på vilka beslut som kombineras. Den visar inte optimal lösning — utan hur beslut påverkar stabilitet, begränsningar och risk för tipping över tid.",
    showEarlyInfluencePoints: "Visa tidiga påverkanspunkter",
    hideEarlyInfluencePoints: "Dölj tidiga påverkanspunkter",
    showDriverActivations: "Visa driveraktiveringar",
    hideDriverActivations: "Dölj driveraktiveringar",
    expertCloseAriaLabel: "Återgå till executivt läge",
    executiveDemoPresentation: "Executive Demo",
    executiveDemoPresentationExit: "Avsluta demo",
  },
} as const;

export type PulseLanguageKey = keyof (typeof pulseLanguage)["en"];
