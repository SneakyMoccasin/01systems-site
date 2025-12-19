export function computeRallyPositions(units: any[], target: { x: number; y: number }) {
  // Simple rally: everyone moves directly to the clicked point
  const maxX = window.innerWidth;
  const maxY = window.innerHeight;
  
  return units.map(() => {
    let px = target.x;
    let py = target.y;
    
    px = Math.max(0, Math.min(px, maxX));
    py = Math.max(0, Math.min(py, maxY));
    
    return {
      x: px,
      y: py,
    };
  });
}

export function computeScatterPositions(units: any[], from: { x: number; y: number }) {
  // Scatter: units move AWAY from the clicked point in a circle
  const TWO_PI = Math.PI * 2;
  const maxX = window.innerWidth;
  const maxY = window.innerHeight;

  return units.map((unit, i) => {
    const angle = (i / units.length) * TWO_PI;
    const distance = 160; // pixels away from center
    let px = from.x + Math.cos(angle) * distance;
    let py = from.y + Math.sin(angle) * distance;
    
    px = Math.max(0, Math.min(px, maxX));
    py = Math.max(0, Math.min(py, maxY));
    
    return {
      x: px,
      y: py,
    };
  });
}

export function computeLineFormationPositions(units: any[], target: { x: number; y: number }) {
  // Line: units line up horizontally centered on the clicked point
  const spacing = 36;
  const half = (units.length - 1) / 2;
  const maxX = window.innerWidth;
  const maxY = window.innerHeight;

  return units.map((unit, i) => {
    let px = target.x + (i - half) * spacing;
    let py = target.y;
    
    px = Math.max(0, Math.min(px, maxX));
    py = Math.max(0, Math.min(py, maxY));
    
    return {
      x: px,
      y: py,
    };
  });
}

