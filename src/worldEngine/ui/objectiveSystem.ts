"use client";

export interface ObjectiveStep {
  id: string;
  text: string;
  completed: boolean;
}

export interface Objective {
  id: string;
  title: string;
  steps: ObjectiveStep[];
  completed: boolean;
}

let currentObjective: Objective = {
  id: "wake_pulse",
  title: "Wake the Pulse",
  completed: false,
  steps: [
    { id: "spawn_any", text: "Spawn your first object", completed: false },
    { id: "spawn_click", text: "Click to spawn (alternative)", completed: false }
  ],
};

const subscribers: ((o: Objective) => void)[] = [];

export function getCurrentObjective() {
  return currentObjective;
}

export function subscribeObjective(cb: (obj: Objective) => void) {
  subscribers.push(cb);
  return () => {
    const idx = subscribers.indexOf(cb);
    if (idx !== -1) subscribers.splice(idx, 1);
  };
}

function notify() {
  for (const cb of subscribers) cb({ ...currentObjective });
}

export function completeStep(stepId: string) {
  const step = currentObjective.steps.find(s => s.id === stepId);
  if (!step || step.completed) return;

  step.completed = true;
  notify();

  if (currentObjective.steps.every(s => s.completed)) {
    currentObjective.completed = true;
    notify();
  }
}

// PATH A — Detect entity count change (0 → 1)
if (typeof window !== "undefined") {
  let lastCount = 0;
  setInterval(() => {
    const world = (window as any).worldState;
    if (!world?.entities) return;

    const count = world.entities.length;

    if (lastCount === 0 && count > 0) {
      completeStep("spawn_any");
    }
    lastCount = count;
  }, 200);
}

// PATH B — Click-to-spawn event
if (typeof window !== "undefined") {
  window.addEventListener("objective-spawn", () => {
    completeStep("spawn_click");
  });
}

