import {
  parseScenario,
  type RiskLevel,
  type ScenarioChange,
} from "@/lib/scenarioParser";

/**
 * Preview-only scenario text parsing: extends {@link parseScenario} with explicit
 * phrase → risk mappings so preview output matches intended engine keys.
 */
export function parsePreviewScenarioImpact(
  text: string,
  currentState: Record<string, RiskLevel>
): ScenarioChange[] {
  const t = text.toLowerCase();

  let changes = [...parseScenario(text, currentState)];

  if (t.includes("interest rate exposure")) {
    const from = currentState["Interest Rate Exposure"];
    if (from !== undefined) {
      const ch: ScenarioChange = {
        parameter: "Interest Rate Exposure",
        from,
        to: "HIGH",
      };
      changes = changes.filter(
        (c) => c.parameter !== "Interest Rate Exposure"
      );
      changes.push(ch);
    }
  }

  if (t.includes("refinancing")) {
    const from = currentState["Refinancing Risk"];
    if (from !== undefined) {
      const ch: ScenarioChange = {
        parameter: "Refinancing Risk",
        from,
        to: "HIGH",
      };
      changes = changes.filter((c) => c.parameter !== "Refinancing Risk");
      changes.push(ch);
    }
  }

  return changes;
}
