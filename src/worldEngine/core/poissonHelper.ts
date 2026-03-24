import { Entity } from "../types";

export function findDynamicSpreadPosition(type: string) {
  const world = (window as any).__pulseWorld;
  const entities: Entity[] = world?.memory?.entities ?? [];

  const existing = entities
    .filter(e => e.transform?.x != null && e.transform?.y != null)
    .map(e => ({ x: e.transform!.x!, y: e.transform!.y! }));

  const W = window.innerWidth;
  const H = window.innerHeight;
  const cx = W / 2;
  const cy = H / 2;

  const margin = 180;
  const minDistMap: any = {
    unit: 110,
    prop: 90,
    marker: 100,
    effect: 85
  };
  const minDist = minDistMap[type] ?? 100;

  const count = existing.length;

  // Dynamic spread multiplier
  // cluster grows outward over time:
  const clusterRadius = 90 + count * 3.2; 
  // ensures smooth expansion

  function isValid(px: number, py: number) {
    if (px < margin || px > W - margin) return false;
    if (py < margin || py > H - margin) return false;

    for (const p of existing) {
      const dx = px - p.x;
      const dy = py - p.y;
      if (dx * dx + dy * dy < minDist * minDist) return false;
    }

    return true;
  }

  // 65% center-biased picks
  for (let i = 0; i < 45; i++) {
    const angle = Math.random() * Math.PI * 2;

    const dist =
      clusterRadius * (0.6 + Math.random() * 0.55) *
      (0.55 + Math.random() * 0.55);

    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;

    if (isValid(px, py)) return { x: px, y: py };
  }

  // fallback: center with jitter
  return {
    x: cx + (Math.random() * 260 - 130),
    y: cy + (Math.random() * 260 - 130)
  };
}
