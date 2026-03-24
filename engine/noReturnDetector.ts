export type TickState = {
  time: number;
  load: number;
  capacity: number;
  recovery: number;
};

export type SimulationRun = TickState[];

export type NoReturnResult = {
  isLocked: boolean;
  firstLockedTick: number | null;
};

export function detectNoReturn(
  run: SimulationRun,
  options?: {
    minWindow?: number;
    slackEpsilon?: number;
  }
): NoReturnResult {
  const minWindow = options?.minWindow ?? 3;
  const slackEpsilon = options?.slackEpsilon ?? 0.05;

  if (run.length < minWindow + 1) {
    return {
      isLocked: false,
      firstLockedTick: null,
    };
  }

  let consecutiveLockedTicks = 0;
  let firstLockedTick: number | null = null;

  for (let i = 1; i < run.length; i++) {
    const current = run[i];
    const previous = run[i - 1];

    const recoveryDebt = checkRecoveryDebt(current, previous);
    const responseLag = checkResponseLag(current, previous);
    const vanishingSlack = checkVanishingSlack(current, slackEpsilon);

    if (recoveryDebt && responseLag && vanishingSlack) {
      if (consecutiveLockedTicks === 0) {
        firstLockedTick = current.time;
      }
      consecutiveLockedTicks++;

      if (consecutiveLockedTicks >= minWindow) {
        return {
          isLocked: true,
          firstLockedTick: firstLockedTick,
        };
      }
    } else {
      consecutiveLockedTicks = 0;
      firstLockedTick = null;
    }
  }

  return {
    isLocked: false,
    firstLockedTick: null,
  };
}

function checkRecoveryDebt(current: TickState, previous: TickState): boolean {
  const recoveryFlatOrDecreasing = current.recovery <= previous.recovery;
  const loadFlatOrIncreasing = current.load >= previous.load;
  return recoveryFlatOrDecreasing && loadFlatOrIncreasing;
}

function checkResponseLag(current: TickState, previous: TickState): boolean {
  const capacityIncreasing = current.capacity > previous.capacity;
  const loadExceedsCapacity = current.load > current.capacity;
  return capacityIncreasing && loadExceedsCapacity;
}

function checkVanishingSlack(current: TickState, slackEpsilon: number): boolean {
  const slack = (current.capacity - current.load) / Math.max(current.capacity, 1);
  return slack <= slackEpsilon;
}
