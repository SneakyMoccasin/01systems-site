import { YEARS } from "@/src/constants/years";
import type { ScenarioGraphData } from "@/src/constants/scenarioGraph";

type SnapshotLike = {
  load: readonly number[];
  capacity: readonly number[];
};

export function createScenarioGraphData(
  snapshot: SnapshotLike
): ScenarioGraphData {
  if (snapshot.load.length !== YEARS.length) {
    throw new Error(
      `createScenarioGraphData: snapshot.load.length (${snapshot.load.length}) must equal YEARS.length (${YEARS.length}).`
    );
  }
  if (snapshot.capacity.length !== YEARS.length) {
    throw new Error(
      `createScenarioGraphData: snapshot.capacity.length (${snapshot.capacity.length}) must equal YEARS.length (${YEARS.length}).`
    );
  }

  return YEARS.map((year, i) => {
    const loadAbsolute = snapshot.load[i] as number;
    const capacityAbsolute = snapshot.capacity[i] as number;
    return {
      year,
      loadAbsolute,
      capacityAbsolute,
      loadRatio: loadAbsolute / capacityAbsolute,
    } as const;
  }) as ScenarioGraphData;
}

const __testSnapshot = {
  load: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140] as const,
  capacity: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100] as const,
};

const __testResult = createScenarioGraphData(__testSnapshot);

console.log("GRAPH TEST RESULT:", __testResult);
