export type BevisCase = {
  id: string;
  label: string;
  description: string;
  baselineParams: {
    initialLoad: number;
    initialCapacity: number;
    initialRecovery: number;
    loadGrowthRate: number;
    capacityGrowthRate: number;
    recoveryDecayRate: number;
  };
  intervention: {
    type: "capacity_boost" | "recovery_boost";
    magnitude: number;
    duration: number;
  };
  interventionTiming: {
    late: number;
    early: number;
  };
};

export const BEVIS_CASES: BevisCase[] = [
  {
    id: "01",
    label: "Det såg stabilt ut",
    description: "Long infrastructure-style system with slow degradation",
    baselineParams: {
      initialLoad: 45,
      initialCapacity: 60,
      initialRecovery: 50,
      loadGrowthRate: 0.15,
      capacityGrowthRate: 0.08,
      recoveryDecayRate: 0.12,
    },
    intervention: {
      type: "capacity_boost",
      magnitude: 25,
      duration: 12,
    },
    interventionTiming: {
      late: 42,
      early: 22,
    },
  },
  {
    id: "02",
    label: "Det fungerade – tills det inte gjorde det",
    description: "Organizational / operational system with hidden recovery debt",
    baselineParams: {
      initialLoad: 55,
      initialCapacity: 65,
      initialRecovery: 40,
      loadGrowthRate: 0.22,
      capacityGrowthRate: 0.10,
      recoveryDecayRate: 0.18,
    },
    intervention: {
      type: "recovery_boost",
      magnitude: 30,
      duration: 10,
    },
    interventionTiming: {
      late: 38,
      early: 18,
    },
  },
  {
    id: "03",
    label: "Mer resurser gjorde det värre",
    description: "Complex project where scaling increases load faster than capacity",
    baselineParams: {
      initialLoad: 50,
      initialCapacity: 55,
      initialRecovery: 45,
      loadGrowthRate: 0.28,
      capacityGrowthRate: 0.12,
      recoveryDecayRate: 0.15,
    },
    intervention: {
      type: "capacity_boost",
      magnitude: 20,
      duration: 8,
    },
    interventionTiming: {
      late: 35,
      early: 15,
    },
  },
];
