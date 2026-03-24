export interface PulseSnapshot {
  snapshot_id: string;
  scenario: string;
  inputs: any;
  world_state: any;
  metadata?: any;
}

export function createSnapshot(
  worldState: any,
  inputs: any,
  scenario: string = "default",
  metadata?: any
): PulseSnapshot {
  return {
    snapshot_id: new Date().toISOString(),
    scenario,
    inputs,
    world_state: worldState,
    metadata,
  };
}

export function downloadSnapshot(snapshot: PulseSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pulse-snapshot-${snapshot.snapshot_id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
