// Access via browser: http://localhost:3000/api/decision-flow
// Use ← Back in browser to return to Intro (/)

import { runDecisionFlow } from "@/src/decisionFlow/run";

type DecisionFlowInput = {
  baseline?: {
    load?: number;
    cost?: number;
  };
  externalChange?: {
    load?: number;
    cost?: number;
  };
  policy?: "balanced" | "aggressive" | "conservative";
  steps?: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const policy =
    (searchParams.get("policy") as
      | "balanced"
      | "aggressive"
      | "conservative") ?? "balanced";

  const result = runDecisionFlow({ policy });

  return Response.json(result);
}

export async function POST(request: Request) {
  let body: DecisionFlowInput = {};

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const baseline = {
    load: body.baseline?.load ?? 1,
    cost: body.baseline?.cost ?? 10
  };

  const externalChange = {
    load: body.externalChange?.load ?? 0,
    cost: body.externalChange?.cost ?? 0
  };

  const policy = body.policy ?? "balanced";
  const steps = body.steps ?? 3;

  const result = runDecisionFlow({
    policy,
    steps,
    baseline,
    externalChange
  });

  return Response.json(result);
}

