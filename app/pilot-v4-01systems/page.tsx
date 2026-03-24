"use client";

import { useState } from "react";
import Link from "next/link";

type PolicyKey = "balanced" | "aggressive" | "conservative";

// Bar component for visual results (reused from v3 pattern)
type BarProps = {
  label: string;
  value: number;
  max: number;
};

function Bar({ label, value, max }: BarProps) {
  const widthPct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>{label}: {value.toFixed(2)}</div>
      <div style={{ background: "#1f2937", borderRadius: 4, height: 12 }}>
        <div
          style={{
            width: `${widthPct}%`,
            height: "100%",
            background: "#60a5fa",
            borderRadius: 4
          }}
        />
      </div>
    </div>
  );
}

const COLORS = {
  pageBg: "#0e1117",
  pageText: "#e6edf3",
  cardBg: "#1a1f2e",
  cardBorder: "#2f333a",
  buttonPrimary: "#2563eb",
  buttonSecondary: "#2f333a"
};

type ScenarioKey = "A" | "B" | "C" | null;

// Scenario A parameter mapping to engine inputs (same structure as v3)
const SCENARIO_A_MAPPING = {
  baseline: {
    load: 2,  // strained/heavy-pressure baseline
    cost: 20
  },
  externalChange: {
    load: 3,  // increasing-pressure
    cost: 2
  },
  policy: "balanced" as PolicyKey,
  steps: 3
};

// Scenario B parameter mapping to engine inputs (same structure as v3)
const SCENARIO_B_MAPPING = {
  baseline: {
    load: 1,  // improved but still pressured
    cost: 22  // slightly higher cost capacity
  },
  externalChange: {
    load: 2,  // positive demand signal (moderate increase)
    cost: 1
  },
  policy: "aggressive" as PolicyKey,  // press to capture momentum
  steps: 3
};

// Scenario C parameter mapping to engine inputs (same structure as v3)
const SCENARIO_C_MAPPING = {
  baseline: {
    load: 3,  // already strained system with low flexibility
    cost: 24
  },
  externalChange: {
    load: 3,  // negative pressure (loss of capital / funding constraint)
    cost: 0
  },
  policy: "conservative" as PolicyKey,  // protect stability, slow down
  steps: 3
};

const SCENARIOS = {
  A: {
    title: "A. Fortsätter som nu",
    description: "Låg marginal, hög belastning, extern osäkerhet.",
    baseline: "Systemet befinner sig i ett ansträngt läge med begränsad kapacitet och hög belastning.",
    externalChange: "Externa faktorer förblir osäkra och varierar, vilket skapar ytterligare tryck på systemet.",
    response: "Systemet fortsätter med nuvarande strategi utan större justeringar."
  },
  B: {
    title: "B. Pilot slår igenom",
    description: "Första intäkter, högre tempo, ökad efterfrågan.",
    baseline: "Systemet har initiala framgångar med pilotprojektet och ser positiva signaler.",
    externalChange: "Efterfrågan ökar snabbt när piloten visar resultat, vilket skapar både möjligheter och utmaningar.",
    response: "Systemet skalas upp för att möta ökad efterfrågan medan kvalitet och stabilitet bibehålls."
  },
  C: {
    title: "C. Kapital uteblir",
    description: "Ansträngt läge, låg flexibilitet, överlevnadsfokus.",
    baseline: "Systemet befinner sig i en kritiskt ansträngd situation med mycket begränsade resurser.",
    externalChange: "Externa finansieringskällor uteblir eller försenas, vilket skapar akut resursbrist.",
    response: "Systemet fokuserar på överlevnad med minimala åtgärder och prioriterar kritiska funktioner."
  }
};

// Scenario-specific narrative text (presentation only)
const SCENARIO_NARRATIVES = {
  A: {
    phase1: "Trycket i systemet ökar gradvis när verksamheten fortsätter utan större förändringar. Tidiga avvägningar krävs för att hantera belastningen.",
    phase2: "När trycket kvarstår binds resurser successivt upp i löpande arbete. Handlingsutrymmet minskar, och systemets flexibilitet reduceras över tid.",
    phase3: "Systemet stabiliseras på en nivå med högre belastning och begränsad marginal. Verksamheten fungerar, men med ökad instabilitet och minskad motståndskraft mot nya påfrestningar."
  },
  B: {
    phase1: "Systemet absorberar den initiala ökningen i aktivitet när piloten slår igenom. Verksamheten svarar snabbt för att möta efterfrågan.",
    phase2: "Det ökade tempot binds upp i löpande leverans och åtaganden. Systemet förblir relativt stabilt, men tillgänglig marginal minskar successivt.",
    phase3: "Systemet når ett stabilt läge med högre kostnadsnivå och reducerat handlingsutrymme. Verksamheten fungerar väl, men med begränsad flexibilitet för framtida anpassningar."
  },
  C: {
    phase1: "Trycket i systemet ökar snabbt när extern finansiering uteblir. Tidiga avvägningar krävs för att hålla verksamheten igång.",
    phase2: "När trycket kvarstår binds resurser successivt upp i grundläggande drift. Handlingsutrymmet minskar, och möjligheten att anpassa verksamheten över tid blir allt mer begränsad.",
    phase3: "Systemet når ett överlevnadsläge med fortsatt högt tryck och små marginaler. Verksamheten fungerar, men med ökad sårbarhet och låg flexibilitet."
  }
};

// Scenario-specific system implications text (presentation only)
const SCENARIO_IMPLICATIONS = {
  A: {
    pressure: "Det ökade trycket gör systemet mer känsligt för ytterligare störningar.",
    commitment: "Resurser binds i befintliga åtaganden, vilket reducerar flexibiliteten.",
    recovery: "Återhämtning kräver förändringar utanför nuvarande arbetssätt."
  },
  B: {
    pressure: "Stabilitet uppnås genom ökade åtaganden snarare än frigjord kapacitet.",
    commitment: "Flexibiliteten minskar när resurser binds i löpande drift.",
    recovery: "Långsiktig återhämtning förutsätter att belastningen inte fortsätter att öka."
  },
  C: {
    pressure: "Det förhöjda trycket gör systemet känsligt för nya störningar.",
    commitment: "Resurser binds i nödvändiga åtaganden, vilket reducerar framtida handlingsfrihet.",
    recovery: "Återhämtning förutsätter förändringar utanför nuvarande förutsättningar."
  }
};

export default function PilotV401SystemsPage() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>(null);
  const [simulationRun, setSimulationRun] = useState(false);
  const [scenariosRun, setScenariosRun] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleScenarioSelect = (scenario: ScenarioKey) => {
    setSelectedScenario(scenario);
    setSimulationRun(false);
    setResult(null);
  };

  const handleRunSimulation = async () => {
    // Scenarios A, B, and C are connected to the engine
    if (selectedScenario === "A" || selectedScenario === "B" || selectedScenario === "C") {
      setLoading(true);
      try {
        const mapping = 
          selectedScenario === "A" ? SCENARIO_A_MAPPING :
          selectedScenario === "B" ? SCENARIO_B_MAPPING :
          SCENARIO_C_MAPPING;
        const res = await fetch("/api/decision-flow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapping)
        });
        const data = await res.json();
        setResult(data);
        setSimulationRun(true);
        if (selectedScenario && !scenariosRun.includes(selectedScenario)) {
          setScenariosRun([...scenariosRun, selectedScenario]);
        }
      } catch (error) {
        console.error("Simulation error:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Narrative generation (same logic as v3, UI-only)
  const generateNarrative = (resultData: any) => {
    if (!resultData) return { phase1: "", phase2: "", phase3: "" };
    
    const resultTotalSteps = resultData.final.time;
    const earlySteps = resultData.consequences.filter((c: any) => c.time <= 2);
    const earlyLoadChanges = earlySteps.filter((c: any) => c.metric === "load");
    const earlyCostChanges = earlySteps.filter((c: any) => c.metric === "cost");
    
    const loadRecovery = Math.abs(resultData.compare.load) < 0.01;
    const costRecovery = Math.abs(resultData.compare.cost) < 0.01;
    const hasRecovery = loadRecovery && costRecovery;
    
    const loadAboveBaseline = resultData.consequences.filter((c: any) => c.metric === "load" && c.delta > 0);
    const loadAboveBaselineRatio = resultTotalSteps > 0 ? loadAboveBaseline.length / resultTotalSteps : 0;
    
    let systemStateText = "stabilt";
    if (loadAboveBaselineRatio > 0.5) {
      systemStateText = "instabilt";
    } else if (loadAboveBaselineRatio > 0) {
      systemStateText = "under tryck";
    }

    // Phase 1
    const earlyLoadIncrease = earlyLoadChanges.some((c: any) => c.delta > 0);
    const earlyLoadStable = earlyLoadChanges.length === 0 || earlyLoadChanges.every((c: any) => Math.abs(c.delta) < 0.5);
    const earlyCostRise = earlyCostChanges.some((c: any) => c.delta > 0);
    
    let phase1 = "";
    if (earlyLoadIncrease) {
      phase1 = "Trycket stiger snabbt.";
    } else if (earlyLoadStable) {
      phase1 = "Systemet absorberar den initiala förändringen.";
    } else {
      phase1 = "Systemet svarar på den initiala förändringen.";
    }
    if (earlyCostRise) {
      phase1 += " Tidiga avvägningar uppstår.";
    }

    // Phase 2
    let phase2 = "";
    if (loadAboveBaselineRatio > 0.5) {
      phase2 = "Ihållande tryck begränsar framtida alternativ. Systemets flexibilitet minskar när begränsningar blir mer etablerade.";
    } else if (loadAboveBaselineRatio > 0 && loadAboveBaselineRatio <= 0.5) {
      phase2 = "Systemet svänger mellan stabilitet och belastning. Någon flexibilitet finns kvar, men upprepade obalanser skapar låsningseffekter.";
    } else {
      phase2 = "Systemet behåller relativ stabilitet med minimal begränsningsbildning.";
    }
    if (resultData.compare.cost !== 0) {
      const costIncrease = resultData.compare.cost > 0;
      if (costIncrease) {
        phase2 += " Resurser är förbundna, vilket minskar tillgänglig marginal för framtida justeringar.";
      } else {
        phase2 += " Resursfördelningen förskjuts, vilket påverkar systemets motståndskraft.";
      }
    }

    // Phase 3
    let phase3 = "";
    if (hasRecovery) {
      phase3 = `Systemet når en ny jämvikt som stämmer överens med utgångsläget. Systemläget är ${systemStateText}.`;
    } else {
      const costIncrease = resultData.compare.cost > 0;
      const loadIncrease = resultData.compare.load > 0;
      
      if (costIncrease && loadIncrease) {
        phase3 = `Systemet stabiliseras vid en ny jämvikt med högre ihållande kostnad och tryck. Flexibilitet och marginal är reducerade. Systemläget är ${systemStateText}.`;
      } else if (costIncrease) {
        phase3 = `Systemet når en ny jämvikt med högre ihållande kostnad. Återhämtning är ofullständig, och tillgänglig marginal är minskad. Systemläget är ${systemStateText}.`;
      } else if (loadIncrease) {
        phase3 = `Systemet stabiliseras med ihållande tryck över utgångsläget. Återhämtning är fördröjd, och operativ flexibilitet är begränsad. Systemläget är ${systemStateText}.`;
      } else {
        phase3 = `Systemet når en ny jämvikt som skiljer sig från utgångsläget. Återhämtning är ofullständig. Systemläget är ${systemStateText}.`;
      }
    }

    return { phase1, phase2, phase3 };
  };

  // System implications generation (same logic as v3, UI-only)
  const generateImplications = (resultData: any) => {
    if (!resultData) return { pressure: "", commitment: "", recovery: "" };
    
    const resultTotalSteps = resultData.final.time;
    const loadAboveBaseline = resultData.consequences.filter((c: any) => c.metric === "load" && c.delta > 0);
    const loadAboveBaselineRatio = resultTotalSteps > 0 ? loadAboveBaseline.length / resultTotalSteps : 0;
    
    const loadRecovery = Math.abs(resultData.compare.load) < 0.01;
    const costRecovery = Math.abs(resultData.compare.cost) < 0.01;
    const hasRecovery = loadRecovery && costRecovery;
    
    const costIncrease = resultData.compare.cost > 0;
    
    let pressure = "";
    if (loadAboveBaselineRatio > 0.5) {
      pressure = "Förhöjt tryck signalerar ökad känslighet och sårbarhet för ytterligare störningar.";
    } else {
      pressure = "Intermittent tryck signalerar att systemet behåller viss adaptiv kapacitet, även om känslighet kvarstår.";
    }
    
    let commitment = "";
    if (costIncrease) {
      commitment = "Ihållande åtaganden signalerar minskad flexibilitet och reducerad marginal för framtida justeringar.";
    } else {
      commitment = "Resursåtaganden förblir närmare utgångsläget, vilket signalerar bevarad flexibilitet.";
    }
    
    let recovery = "";
    if (!hasRecovery) {
      recovery = "Återhämtningssignaler beror på förändringar utanför det nuvarande responsmönstret, vilket indikerar strukturellt beroende av externa förhållanden.";
    } else {
      recovery = "Systemet signalerar förmågan att återanpassa sig till utgångsläget under nuvarande responsmönster.";
    }
    
    return { pressure, commitment, recovery };
  };

  return (
    <main style={{
      background: COLORS.pageBg,
      color: COLORS.pageText,
      minHeight: "100vh",
      padding: 32
    }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/"
          style={{
            color: "#9ca3af",
            textDecoration: "none",
            fontSize: 14
          }}
        >
          ← Tillbaka till introduktion
        </Link>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ marginBottom: 8 }}>Pilot v4 – Scenarioanalys (01 Systems)</h1>
        <p style={{ fontSize: 15, opacity: 0.9, marginBottom: 12 }}>
          Denna analys fokuserar på kundspecifika scenarier för att förstå hur olika beslut påverkar systemet över tid.
        </p>
        <p style={{ fontSize: 12, opacity: 0.7, fontStyle: "italic" }}>
          Bygger på samma simuleringsteknik som Pilot v3, men med fokus på namngivna scenarier.
        </p>
      </div>

      {/* Scenario Overview Section */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ marginBottom: 20 }}>Scenarier</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          marginBottom: 24
        }}>
          {(Object.keys(SCENARIOS) as ScenarioKey[]).filter(k => k !== null).map((key) => {
            const scenario = SCENARIOS[key!];
            const isSelected = selectedScenario === key;
            
            return (
              <div
                key={key}
                style={{
                  background: COLORS.cardBg,
                  border: isSelected ? `2px solid ${COLORS.buttonPrimary}` : `1px solid ${COLORS.cardBorder}`,
                  borderRadius: 8,
                  padding: 20,
                  cursor: "pointer",
                  transition: "border-color 0.2s"
                }}
                onClick={() => handleScenarioSelect(key)}
              >
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>{scenario.title}</h3>
                <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
                  {scenario.description}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScenarioSelect(key);
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    background: isSelected ? COLORS.buttonPrimary : COLORS.buttonSecondary,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: isSelected ? 600 : 400
                  }}
                >
                  {isSelected ? "Valt scenario" : "Välj scenario"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Scenario Detail Section */}
      {selectedScenario && (
        <section style={{
          marginBottom: 40,
          padding: 24,
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 8
        }}>
          <h2 style={{ marginBottom: 20 }}>Detaljer för valt scenario</h2>
          <div style={{ maxWidth: 700 }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Utgångsläge</h3>
              <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
                {SCENARIOS[selectedScenario].baseline}
              </p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Extern förändring</h3>
              <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
                {SCENARIOS[selectedScenario].externalChange}
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Antagen respons</h3>
              <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
                {SCENARIOS[selectedScenario].response}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Simulation Placeholder Section */}
      {selectedScenario && (
        <section style={{ marginBottom: 40 }}>
          <button
            onClick={handleRunSimulation}
            disabled={simulationRun || loading}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              background: (simulationRun || loading) ? COLORS.buttonSecondary : COLORS.buttonPrimary,
              color: "#ffffff",
              border: "none",
              borderRadius: 4,
              cursor: (simulationRun || loading) ? "not-allowed" : "pointer",
              fontWeight: 600,
              marginBottom: 12
            }}
          >
            {loading ? "Kör simulering..." : simulationRun ? "Simulering körd" : "Kör simulering för valt scenario"}
          </button>
        </section>
      )}

      {/* Results Section */}
      {simulationRun && selectedScenario && (
        <section style={{
          marginBottom: 40,
          padding: 24,
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 8
        }}>
          <h2 style={{ marginBottom: 20 }}>Utfall ({SCENARIOS[selectedScenario].title})</h2>
          
          {(selectedScenario === "A" || selectedScenario === "B" || selectedScenario === "C") && result ? (
            <>
              {/* Visual Results */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 15, marginBottom: 16 }}>Visuella resultat</h3>
                <div style={{ maxWidth: 420 }}>
                  <h4 style={{ fontSize: 14, marginTop: 12, marginBottom: 8 }}>Systembelastning</h4>
                  <Bar 
                    label="Utgångsläge" 
                    value={result.baseline.metrics.load} 
                    max={Math.max(result.baseline.metrics.load, result.final.metrics.load) || 1} 
                  />
                  <Bar 
                    label="Slutligt" 
                    value={result.final.metrics.load} 
                    max={Math.max(result.baseline.metrics.load, result.final.metrics.load) || 1} 
                  />

                  <h4 style={{ fontSize: 14, marginTop: 16, marginBottom: 8 }}>Kapacitetsutnyttjande</h4>
                  <Bar 
                    label="Utgångsläge" 
                    value={result.baseline.metrics.cost} 
                    max={Math.max(result.baseline.metrics.cost, result.final.metrics.cost) || 1} 
                  />
                  <Bar 
                    label="Slutligt" 
                    value={result.final.metrics.cost} 
                    max={Math.max(result.baseline.metrics.cost, result.final.metrics.cost) || 1} 
                  />
                </div>
              </div>

              {/* Narrative */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 15, marginBottom: 16 }}>Beslutsnarrativ</h3>
                {selectedScenario && SCENARIO_NARRATIVES[selectedScenario] && (
                  <div>
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 14, marginBottom: 8, opacity: 0.9 }}>Tidig respons</h4>
                      <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                        {SCENARIO_NARRATIVES[selectedScenario].phase1}
                      </p>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 14, marginBottom: 8, opacity: 0.9 }}>Ackumulering</h4>
                      <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                        {SCENARIO_NARRATIVES[selectedScenario].phase2}
                      </p>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, marginBottom: 8, opacity: 0.9 }}>Utfall</h4>
                      <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                        {SCENARIO_NARRATIVES[selectedScenario].phase3}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* System Implications */}
              <div>
                <h3 style={{ fontSize: 15, marginBottom: 16 }}>Systempåverkan</h3>
                {selectedScenario && SCENARIO_IMPLICATIONS[selectedScenario] && (
                  <ul style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0
                  }}>
                    <li style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
                      • {SCENARIO_IMPLICATIONS[selectedScenario].pressure}
                    </li>
                    <li style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
                      • {SCENARIO_IMPLICATIONS[selectedScenario].commitment}
                    </li>
                    <li style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6 }}>
                      • {SCENARIO_IMPLICATIONS[selectedScenario].recovery}
                    </li>
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 24, lineHeight: 1.6 }}>
                Resultat kommer att visas här när simuleringen är kopplad. Detta inkluderar systemets utveckling över tid, observerade konsekvenser och jämförelse med utgångsläget.
              </p>

              <h3 style={{ fontSize: 15, marginBottom: 16 }}>Systempåverkan</h3>
              <ul style={{
                listStyle: "none",
                padding: 0,
                margin: 0
              }}>
                <li style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>
                  • Systempåverkan kommer att visas här
                </li>
                <li style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>
                  • Observerade konsekvenser kommer att listas
                </li>
                <li style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>
                  • Jämförelse med utgångsläge kommer att presenteras
                </li>
              </ul>
            </>
          )}
        </section>
      )}

      {/* Comparison Section */}
      {scenariosRun.length >= 2 && (
        <section style={{
          marginBottom: 40,
          padding: 24,
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 8
        }}>
          <h2 style={{ marginBottom: 16 }}>Jämförelse mellan scenarier</h2>
          <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6, marginBottom: 16 }}>
            Jämförelsen nedan sammanfattar hur systemet utvecklas under olika scenarier givet samma grundläggande modell och tidshorisont.
          </p>
          <p style={{ fontSize: 12, opacity: 0.7, fontStyle: "italic" }}>
            Körda scenarier: {scenariosRun.map(key => SCENARIOS[key as keyof typeof SCENARIOS].title).join(" · ")}
          </p>
        </section>
      )}
    </main>
  );
}

