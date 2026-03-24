import { SystemSnapshot } from "./SystemSnapshot";

let currentSnapshot: SystemSnapshot | null = null;

export function setSystemSnapshot(snapshot: SystemSnapshot): void {
  currentSnapshot = snapshot;
}

export function getSystemSnapshot(): SystemSnapshot | null {
  return currentSnapshot;
}
