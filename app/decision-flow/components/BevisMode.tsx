"use client";

import { useState, useEffect } from "react";
import { BEVIS_CASES_V1 } from "./bevisCases";
import BevisKPIComparison from "./BevisKPIComparison";

type BevisModeProps = {
  selectedCaseId?: string;
  onCaseChange?: (caseId: string) => void;
  onTimelineDataChange?: (planAData: any[], planBData: any[], breakpoint?: number) => void;
};

export default function BevisMode({ selectedCaseId, onCaseChange, onTimelineDataChange }: BevisModeProps) {
  const [currentCaseId, setCurrentCaseId] = useState(selectedCaseId || "1");
  
  const currentCase = BEVIS_CASES_V1.find(c => c.id === currentCaseId) || BEVIS_CASES_V1[0];

  // Sync with parent if selectedCaseId changes
  useEffect(() => {
    if (selectedCaseId && selectedCaseId !== currentCaseId) {
      setCurrentCaseId(selectedCaseId);
    }
  }, [selectedCaseId, currentCaseId]);

  // This timeline represents a frozen snapshot of Decision Flow simulation output,
  // rendered in Bevis mode for presentation purposes only.
  // BEVIS RULE: Visual differences must be instantly obvious within 2 seconds.
  const generateBevisTimelineSnapshot = () => {
    const data = [];
    const numTicks = 25;
    
    for (let i = 0; i <= numTicks; i++) {
      let belastning = 0;
      
      if (currentCaseId === "1") {
        // Case 1: Ökat tryck utan förstärkning
        // Plan A: Steady increase that becomes unsustainable
        // Plan B: Controlled with strengthened capacity
        // EXAGGERATE: Make Plan A clearly worse - steeper increase
        belastning = 35 + i * 3.2 + Math.sin(i * 0.2) * 2;
        
      } else if (currentCaseId === "2") {
        // Case 2: Tidig förstärkning av kapacitet
        // Plan A: Late reinforcement - peak then control
        // Plan B: Early reinforcement - controlled from start
        // EXAGGERATE: Make the peak in Plan A very obvious
        const breakpoint = 8;
        if (i < breakpoint) {
          belastning = 38 + i * 1.2;
        } else {
          // After breakpoint: Plan A peaks then recovers slowly
          const phase = i - breakpoint;
          const peakValue = 38 + breakpoint * 1.2 + 18; // EXAGGERATE: Very sharp peak
          belastning = peakValue - phase * 0.6 + Math.sin(phase * 0.3) * 1.5;
        }
        
      } else {
        // Case 3: Sen förstärkning med begränsad effekt
        // Plan A: Long buildup, late reinforcement has limited effect
        // Plan B: Early reinforcement prevents buildup
        // EXAGGERATE: Make Plan A's late recovery clearly insufficient
        const breakpoint = 12;
        if (i < breakpoint) {
          belastning = 38 + i * 1.8; // Steady buildup
        } else {
          // After breakpoint: Late reinforcement tries but can't fully recover
          const phase = i - breakpoint;
          const peakAtBreakpoint = 38 + breakpoint * 1.8;
          // EXAGGERATE: Limited recovery - still very high, slight increase
          belastning = peakAtBreakpoint - phase * 0.3 + phase * 0.4;
        }
      }
      
      data.push({
        time: i,
        belastning: belastning,
        kapacitet: 50, // Not rendered
        aterhamtning: 45 // Not rendered
      });
    }
    return data;
  };

  useEffect(() => {
    const planAData = generateBevisTimelineSnapshot();
    const planBData = generateBevisTimelineSnapshot().map((d, i) => {
      // Plan B shows dramatically different trajectory based on case
      // EXAGGERATE differences - prefer visual clarity over realism
      let belastningAdjustment = 0;
      
      if (currentCaseId === "1") {
        // Case 1: Plan B has strengthened capacity - keeps load controlled
        // EXAGGERATE: Large separation from Plan A - dramatic divergence
        if (i > 3) {
          // After initial period, Plan B diverges strongly downward
          const divergencePhase = i - 3;
          belastningAdjustment = -12 - divergencePhase * 1.8;
        }
        
      } else if (currentCaseId === "2") {
        // Case 2: Plan B has early reinforcement - avoids the peak entirely
        // EXAGGERATE: Plan B stays flat while Plan A peaks
        const breakpoint = 8;
        if (i < breakpoint) {
          // Before breakpoint: Plan B already lower (early action)
          belastningAdjustment = -5 - i * 0.3;
        } else {
          // After breakpoint: Plan B stays controlled, Plan A peaked
          const phase = i - breakpoint;
          const planBLevel = 38 - 5 - breakpoint * 0.3; // Where Plan B was at breakpoint
          // EXAGGERATE: Plan B stays much lower
          belastningAdjustment = planBLevel - d.belastning - phase * 0.1;
        }
        
      } else {
        // Case 3: Plan B has early reinforcement - prevents buildup
        // EXAGGERATE: Plan B stays low while Plan A builds up
        const breakpoint = 12;
        if (i < breakpoint) {
          // Before breakpoint: Plan B prevents buildup from start
          belastningAdjustment = -6 - i * 0.4;
        } else {
          // After breakpoint: Plan B stays low, Plan A struggles to recover
          const planBLevel = 38 - 6 - breakpoint * 0.4; // Where Plan B was at breakpoint
          // EXAGGERATE: Plan B stays much lower while Plan A remains high
          belastningAdjustment = planBLevel - d.belastning - 2;
        }
      }
      
      return {
        ...d,
        belastning: Math.max(0, d.belastning + belastningAdjustment),
        kapacitet: d.kapacitet, // Not rendered
        aterhamtning: d.aterhamtning // Not rendered
      };
    });
    
    // Calculate breakpoint for visual marker
    let breakpointValue: number | undefined = undefined;
    if (currentCaseId === "2") {
      breakpointValue = 8; // Case 2: Peak occurs at tick 8
    } else if (currentCaseId === "3") {
      breakpointValue = 12; // Case 3: Late reinforcement at tick 12
    }
    // Case 1 has no single breakpoint - gradual divergence
    
    if (onTimelineDataChange) {
      onTimelineDataChange(planAData, planBData, breakpointValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCaseId]);

  const handleCaseChange = (caseId: string) => {
    setCurrentCaseId(caseId);
    if (onCaseChange) {
      onCaseChange(caseId);
    }
  };


  // Determine KPI words based on case
  const getKPIWords = (caseId: string) => {
    if (caseId === "1") {
      return {
        planA: {
          belastning: "Ökande",
          kapacitet: "Normal",
          aterhamtning: "Minskande"
        },
        planB: {
          belastning: "Stabil",
          kapacitet: "Förstärkt",
          aterhamtning: "Stabil"
        }
      };
    } else if (caseId === "2") {
      return {
        planA: {
          belastning: "Topp",
          kapacitet: "Sen förstärkning",
          aterhamtning: "Påverkad"
        },
        planB: {
          belastning: "Kontrollerad",
          kapacitet: "Tidig förstärkning",
          aterhamtning: "Skyddad"
        }
      };
    } else {
      return {
        planA: {
          belastning: "Hög",
          kapacitet: "Sen förstärkning",
          aterhamtning: "Begränsad"
        },
        planB: {
          belastning: "Stabil",
          kapacitet: "Tidig förstärkning",
          aterhamtning: "Behållen"
        }
      };
    }
  };

  const kpiWords = getKPIWords(currentCaseId);

  return (
    <div>
      {/* Case Selector */}
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #2f333a",
        borderRadius: 8,
        padding: 16,
        marginBottom: 24
      }}>
        <label style={{ display: "block", fontSize: 13, marginBottom: 8, color: "#9ca3af" }}>
          Fall
        </label>
        <select
          value={currentCaseId}
          onChange={(e) => handleCaseChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "#0e1117",
            border: "1px solid #2f333a",
            borderRadius: 4,
            color: "#e6edf3",
            fontSize: 14
          }}
        >
          {BEVIS_CASES_V1.map(case_ => (
            <option key={case_.id} value={case_.id}>
              {case_.name}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8, marginBottom: 0 }}>
          {currentCase.context}
        </p>
      </div>

      {/* A vs B Comparison Summary */}
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #2f333a",
        borderRadius: 8,
        padding: 16,
        marginBottom: 24
      }}>
        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>
          {currentCase.planA.name} vs {currentCase.planB.name}
        </div>
        <div style={{ fontSize: 12, color: "#e6edf3" }}>
          {currentCase.difference}
        </div>
      </div>

      {/* KPI Comparison */}
      <BevisKPIComparison planA={kpiWords.planA} planB={kpiWords.planB} />

      {/* Delta Summary */}
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #2f333a",
        borderRadius: 8,
        padding: 16,
        marginBottom: 24
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#e6edf3" }}>
          Skillnad i utfall
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#e6edf3", margin: 0 }}>
          {currentCase.deltaSummary}
        </p>
      </div>

    </div>
  );
}
