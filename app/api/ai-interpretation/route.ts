import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Read-only API adapter for AI interpretation output.
// This route intentionally mirrors AI output and does not affect simulation or UI.
// It is a thin, deterministic adapter that can be safely removed.

interface AIInterpretationMetadata {
  contractVersion: string;
  timestamp: string;
  inputSource: string;
  totalTimeSteps: number;
  inputValidation: {
    format: "CSV" | "JSON";
    valid: boolean;
    errors: string[];
  };
}

interface AIInterpretation {
  metadata: AIInterpretationMetadata;
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

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "output", "ai_interpretation.json");
    const fileContents = await fs.readFile(filePath, "utf8");
    const data: AIInterpretation = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    return new NextResponse(null, { status: 204 });
  }
}
