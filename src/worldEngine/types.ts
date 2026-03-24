export interface Entity {
  id: string;              // short ID (u1, p2, m1, e3...)
  uuid?: string;           // full UUID for save/load
  type: "unit" | "prop" | "marker" | "effect";
  role: string;             // domain-specific category
  name?: string;            // optional UI label
  transform?: {
    x?: number | null;
    y?: number | null;
    scale?: number;
  };
  ai?: {
    targetX: number | null;
    targetY: number | null;
    nextUpdate: number;
  };
}

