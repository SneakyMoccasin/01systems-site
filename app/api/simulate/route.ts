import { NextResponse } from "next/server";
import { RealEstateEngine } from "@/src/pilotFastighet/RealEstateEngine";
import { propagateRisks } from "@/src/pilotFastighet/riskPropagation";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      riskState,
      simulationHorizon = 16,
    } = body;

    const { next: propagatedState, events } = propagateRisks(riskState);

    const engine = new RealEstateEngine(propagatedState);

    const marginHistory: number[] = [];

    for (let i = 0; i < simulationHorizon; i++) {
      engine.stepForward();
      const state = engine.getState();
      marginHistory.push(state.margin);
    }

    let estimatedTimeToBreach: number | null = null;

    const threshold = 0;

    for (let i = 0; i < marginHistory.length; i++) {
      if (marginHistory[i] <= threshold) {
        estimatedTimeToBreach = i + 1;
        break;
      }
    }

    return NextResponse.json({
      marginHistory,
      cascadeEvents: events,
      estimatedTimeToBreach,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Simulation failed." },
      { status: 500 }
    );
  }
}
