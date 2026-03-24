import * as PIXI from "pixi.js";
import { Entity } from "../types";
import { ENTITY_COLORS } from "../config/entityColors";

export function createSpriteForEntity(entity: Entity): PIXI.Graphics {
  const color = ENTITY_COLORS[entity.type];

  const g = new PIXI.Graphics();
  g.beginFill(color);
  g.drawCircle(0, 0, 18);
  g.endFill();

  g.pivot.set(0, 0);
  g.x = entity.transform?.x ?? 0;
  g.y = entity.transform?.y ?? 0;

  return g;
}
