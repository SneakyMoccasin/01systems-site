import { moveTowardsGoal, hasGoal } from "../actions/goalLogic";

// --- GLOBAL MASTER RESET FLAG ---
export let __goalResetting = false;

export function beginGoalReset() { __goalResetting = true; }

export function endGoalReset() { __goalResetting = false; }

// --- INTERNAL GOAL STATE ---
let _currentGoal: any = null;
let _currentGoalZone: any = null;
let _goalCompleted = false;
let _goalStartTime: number | null = null;
let _goalTargetCount = 0;

export function hardGoalReset() {
  // Reset window globals
  (window as any).__goalInside = 0;
  (window as any).__goalCompleted = false;
  (window as any).__goal_activeEntities = new Set();
  
  // Reset internal goal state
  _currentGoal = null;
  _currentGoalZone = null;
  _goalCompleted = false;
  _goalStartTime = null;
  _goalTargetCount = 0;
}

export function resetGoalState() {
  (window as any).__goalInside = 0;
  (window as any).__goalCompleted = false;
  if ((window as any).__goal_activeEntities) {
    (window as any).__goal_activeEntities = new Set();
  }
}

export function applyGoalMovement(entity: any, gfx: any, delta: number) {
  // HARD RESET BLOCK — goal system disabled during reset
  if (__goalResetting) {
    return true; // Do NOTHING during reset
  }
  
  // Early return if no goal is active
  if (!_currentGoal || !_currentGoalZone || _goalCompleted) {
    return false; // no goal active → skip goal logic entirely
  }
  
  // Only units can have goal
  if (entity.type !== "unit" && entity.category !== "unit") return false;

  // If no goal → skip
  if (!hasGoal(entity)) return false;

  // Apply goal movement
  moveTowardsGoal(entity, gfx, delta);

  return true; // Signal to PixiStage to skip wander logic
}

