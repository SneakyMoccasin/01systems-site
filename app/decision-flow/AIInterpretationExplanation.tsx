import React from "react";

/**
 * AIInterpretationExplanation
 * 
 * UI-only human-readable explanation layer for AI interpretation data.
 * This component derives explanatory text from existing fields only.
 * It does not modify, compute, or infer any data beyond what is present.
 */

interface AIInterpretation {
  metadata: {
    contractVersion: string;
    timestamp: string;
    inputSource: string;
    totalTimeSteps: number;
    inputValidation: {
      format: "CSV" | "JSON";
      valid: boolean;
      errors: string[];
    };
  };
  systemPhaseAnalysis: {
    phases: Array<{
      time: number;
      phase: "stable" | "fragile" | "unstable";
      indicators: {
        loadCapacityRatio: number;
        stress: number;
        recovery: number;
        capacityTrend: "increasing" | "decreasing" | "stable";
      };
    }>;
    phaseDistribution: {
      stable: number;
      fragile: number;
      unstable: number;
    };
  };
  phaseTransitions: Array<{
    fromTime: number;
    toTime: number;
    fromPhase: "stable" | "fragile" | "unstable";
    toPhase: "stable" | "fragile" | "unstable";
    transitionType: string;
    triggeringConditions: string[];
  }>;
  loadCapacityAnalysis: {
    loadCapacityRatios: Array<{
      time: number;
      ratio: number;
      overCapacity: boolean;
    }>;
    overCapacityPeriods: Array<{
      startTime: number;
      endTime: number | null;
      duration: number;
      maxRatio: number;
    }>;
    trend: {
      direction: "increasing" | "decreasing" | "stable" | "oscillating";
      finalRatio: number;
      initialRatio: number;
    };
  };
  stressAnalysis: {
    stressPatterns: Array<{
      time: number;
      stress: number;
      pattern: "accumulating" | "dissipating" | "sustained";
    }>;
    accumulationPeriods: Array<{
      startTime: number;
      endTime: number | null;
      initialStress: number;
      peakStress: number;
      rate: number;
    }>;
    sustainedHighStress: Array<{
      startTime: number;
      endTime: number | null;
      threshold: number;
      averageStress: number;
    }>;
  };
  recoveryAnalysis: {
    recoveryPatterns: Array<{
      time: number;
      recovery: number;
      pattern: "degrading" | "stable" | "improving";
      rate: number;
    }>;
    degradationPeriods: Array<{
      startTime: number;
      endTime: number | null;
      initialRecovery: number;
      finalRecovery: number;
      rate: number;
    }>;
    lowRecoveryPeriods: Array<{
      startTime: number;
      endTime: number | null;
      threshold: number;
      minRecovery: number;
    }>;
  };
  capacityAnalysis: {
    capacityPatterns: Array<{
      time: number;
      capacity: number;
      pattern: "eroding" | "stable" | "rebuilding";
      rate: number;
      percentageOfInitial: number;
    }>;
    erosionPeriods: Array<{
      startTime: number;
      endTime: number | null;
      initialCapacity: number;
      finalCapacity: number;
      rate: number;
    }>;
    rebuildingPeriods: Array<{
      startTime: number;
      endTime: number | null;
      initialCapacity: number;
      finalCapacity: number;
      rate: number;
    }>;
  };
  feedbackLoopAnalysis: {
    detectedLoops: Array<{
      startTime: number;
      endTime: number | null;
      loopType: "reinforcing" | "balancing";
      components: string[];
      severity: "low" | "medium" | "high";
    }>;
  };
  riskSignals: Array<{
    time: number;
    signalType: string;
    severity: "low" | "medium" | "high" | "critical";
    indicators: {
      loadCapacityRatio: number | null;
      stress: number | null;
      recovery: number | null;
      capacityChange: number | null;
    };
    threshold: number;
    exceedance: number;
  }>;
  trajectoryAnalysis: {
    classification: "stabilizing" | "deteriorating" | "oscillating" | "stable";
    indicators: {
      finalPhase: "stable" | "fragile" | "unstable";
      phaseChangeCount: number;
      netLoadChange: number;
      netCapacityChange: number;
      netRecoveryChange: number;
      netStressChange: number;
    };
    trends: {
      load: "increasing" | "decreasing" | "stable";
      capacity: "increasing" | "decreasing" | "stable";
      recovery: "increasing" | "decreasing" | "stable";
      stress: "increasing" | "decreasing" | "stable";
    };
  };
  criticalPoints: Array<{
    time: number;
    pointType: "recoveryThreshold" | "capacityThreshold" | "stressThreshold" | "phaseTransition";
    threshold: number;
    value: number;
    direction: "approaching" | "crossing" | "receding";
  }>;
  summary: {
    overallSystemState: "stable" | "fragile" | "unstable";
    keyFindings: string[];
    riskLevel: "low" | "medium" | "high" | "critical";
    phaseTransitionCount: number;
    longestUnstablePeriod: number | null;
  };
}

interface AIInterpretationExplanationProps {
  data: AIInterpretation;
}

export default function AIInterpretationExplanation({ data }: AIInterpretationExplanationProps): JSX.Element {
  const getSystemStateExplanation = (): string => {
    const state = data.summary.overallSystemState;
    if (state === "stable") {
      return "Systemet uppvisar stabilt beteende under simuleringen.";
    } else if (state === "fragile") {
      return "Systemet klarar belastningen men visar tecken på minskad marginal.";
    } else {
      return "Systemet tappar kontroll under belastning över tid.";
    }
  };

  const getRiskExplanation = (): string => {
    const risk = data.summary.riskLevel;
    if (risk === "low") {
      return "Riskbedömningen indikerar låg risk för systeminstabilitet.";
    } else if (risk === "medium") {
      return "Riskbedömningen indikerar medel risk för systeminstabilitet.";
    } else if (risk === "high") {
      return "Riskbedömningen indikerar hög risk för systeminstabilitet.";
    } else {
      return "Riskbedömningen indikerar kritisk risk för systeminstabilitet.";
    }
  };

  const hasFeedbackLoops = data.feedbackLoopAnalysis.detectedLoops.length > 0;
  const hasPhaseTransitions = data.summary.phaseTransitionCount > 0;

  return (
    <div style={{ opacity: 0.9 }}>
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Hur AI:n läser detta scenario</h2>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8, fontWeight: 600 }}>Systemtillstånd</h3>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          {getSystemStateExplanation()}
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8, fontWeight: 600 }}>Riskbedömning</h3>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          {getRiskExplanation()}
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 8, fontWeight: 600 }}>Varför detta är viktigt</h3>
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          {hasPhaseTransitions || hasFeedbackLoops
            ? "AI:n identifierar strukturella mönster som påverkar systemets långsiktiga stabilitet."
            : "AI:n analyserar systemets beteende över tid."}
        </p>
      </div>
    </div>
  );
}
