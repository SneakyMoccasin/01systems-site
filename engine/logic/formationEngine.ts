export function computeRallyPositions(units: any[], target: { x: number; y: number }) {
  // Simple rally: everyone moves directly to the clicked point
  return units.map(() => ({
    x: target.x,
    y: target.y,
  }));
}

export function computeScatterPositions(units: any[], from: { x: number; y: number }) {
  // Scatter: units move AWAY from the clicked point in a circle
  const TWO_PI = Math.PI * 2;

  return units.map((unit, i) => {
    const angle = (i / units.length) * TWO_PI;
    const distance = 160; // pixels away from center
    return {
      x: from.x + Math.cos(angle) * distance,
      y: from.y + Math.sin(angle) * distance,
    };
  });
}

export function computeLineFormationPositions(units: any[], target: { x: number; y: number }) {
  // Line: units line up horizontally centered on the clicked point
  const spacing = 36;
  const half = (units.length - 1) / 2;

  return units.map((unit, i) => ({
    x: target.x + (i - half) * spacing,
    y: target.y,
  }));
}

