/**
 * Read-only snapshot of a completed Pulse simulation run.
 */
export interface SystemSnapshot {
  readonly baseline: {
    readonly time: number;
    readonly metrics: Readonly<Record<string, number>>;
  };
  readonly final: {
    readonly time: number;
    readonly metrics: Readonly<Record<string, number>>;
  };
  readonly compare: Readonly<Record<string, number>>;
  readonly consequences: ReadonlyArray<{
    readonly time: number;
    readonly metric: string;
    readonly delta: number;
    readonly value: number;
  }>;
}
