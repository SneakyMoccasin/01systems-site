import { runDecisionFlow } from "./run";

const policy =
  (process.argv[2] as "balanced" | "aggressive" | "conservative") ??
  "balanced";

const result = runDecisionFlow({ policy });

console.log(JSON.stringify(result, null, 2));

