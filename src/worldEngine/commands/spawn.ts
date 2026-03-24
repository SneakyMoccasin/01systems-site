import { Entity } from '../types';

export interface SpawnCommand {
  type: "unit" | "prop" | "marker" | "effect";
  role: string;
  x?: number;
  y?: number;
  name?: string;
}

export function parseSpawnCommand(input: string): SpawnCommand | null {
  // Parse: spawn <type> role=<role>
  // Examples:
  // spawn unit role=villager
  // spawn unit role=horse
  // spawn prop role=tree
  // spawn marker role=spawnpoint
  // spawn effect role=signal

  const trimmed = input.trim();
  if (!trimmed.startsWith('spawn ')) {
    return null;
  }

  const parts = trimmed.slice(6).trim().split(/\s+/);
  if (parts.length === 0) {
    return null;
  }

  const type = parts[0] as "unit" | "prop" | "marker" | "effect";
  if (type !== "unit" && type !== "prop" && type !== "marker" && type !== "effect") {
    return null;
  }

  let role = "";
  let x: number | undefined;
  let y: number | undefined;
  let name: string | undefined;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('role=')) {
      role = part.slice(5);
    } else if (part.startsWith('x=')) {
      x = parseFloat(part.slice(2));
    } else if (part.startsWith('y=')) {
      y = parseFloat(part.slice(2));
    } else if (part.startsWith('name=')) {
      name = part.slice(5);
    }
  }

  if (!role) {
    return null;
  }

  return {
    type,
    role,
    x,
    y,
    name
  };
}

export function createEntityFromSpawnCommand(
  command: SpawnCommand,
  createEntity: (type: "unit" | "prop" | "marker" | "effect", role: string, x?: number, y?: number, name?: string) => Entity
): Entity {
  return createEntity(command.type, command.role, command.x, command.y, command.name);
}

