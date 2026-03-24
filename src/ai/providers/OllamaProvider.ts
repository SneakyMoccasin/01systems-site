import type { PulseLLMProvider } from "./PulseLLMProvider";
import type { PulseAIInput, PulseAIOutput } from "../pulseAIContract";

/**
 * Basic Ollama-backed implementation of the PulseLLMProvider interface.
 *
 * This class is intentionally minimal: it translates the generic PulseAIInput
 * contract into a plain-text prompt for Ollama and wraps the raw response
 * into a PulseAIOutput object.
 *
 * Future iterations are expected to:
 * - use structured JSON-style prompts
 * - enforce stricter response formats
 * - provide richer parsing into keyDrivers, keyDifferences, and warnings.
 */
export class OllamaProvider implements PulseLLMProvider {
  name = "ollama";

  /**
   * Lightweight health check against the local Ollama daemon.
   * Returns true if the tags endpoint is reachable and responds with 2xx.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch("http://localhost:11434/api/tags");
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate an AI interpretation using the local Ollama instance.
   * Maps the provider-agnostic PulseAIInput into a simple prompt string
   * and wraps the textual response into a PulseAIOutput structure.
   */
  async generate(input: PulseAIInput): Promise<PulseAIOutput> {
    const lines: string[] = [];

    lines.push("You are Pulse AI, analysing a simulation result.");
    lines.push("");
    lines.push(`Mode: ${input.mode}`);
    lines.push(`Domain: ${input.domain}`);

    if (input.scenarioLabel) {
      lines.push(`Scenario label: ${input.scenarioLabel}`);
    }

    if (input.baselineSummary) {
      const b = input.baselineSummary;
      lines.push("");
      lines.push("Baseline scenario:");
      if (b.label) lines.push(`- label: ${b.label}`);
      if (b.description) lines.push(`- description: ${b.description}`);
      if (typeof b.margin === "number") lines.push(`- margin: ${b.margin}`);
      if (b.structuralStatus) lines.push(`- structuralStatus: ${b.structuralStatus}`);
      if (typeof b.tippingQuarter === "number")
        lines.push(`- tippingQuarter: Q${b.tippingQuarter}`);
      if (typeof b.horizonQuarters === "number")
        lines.push(`- horizonQuarters: ${b.horizonQuarters}`);
      if (b.keyMetrics) {
        lines.push("- keyMetrics:");
        for (const [k, v] of Object.entries(b.keyMetrics)) {
          lines.push(`  - ${k}: ${v}`);
        }
      }
    }

    if (input.alternativeSummary) {
      const a = input.alternativeSummary;
      lines.push("");
      lines.push("Alternative scenario:");
      if (a.label) lines.push(`- label: ${a.label}`);
      if (a.description) lines.push(`- description: ${a.description}`);
      if (typeof a.margin === "number") lines.push(`- margin: ${a.margin}`);
      if (a.structuralStatus) lines.push(`- structuralStatus: ${a.structuralStatus}`);
      if (typeof a.tippingQuarter === "number")
        lines.push(`- tippingQuarter: Q${a.tippingQuarter}`);
      if (typeof a.horizonQuarters === "number")
        lines.push(`- horizonQuarters: ${a.horizonQuarters}`);
      if (a.keyMetrics) {
        lines.push("- keyMetrics:");
        for (const [k, v] of Object.entries(a.keyMetrics)) {
          lines.push(`  - ${k}: ${v}`);
        }
      }
    }

    if (input.keyMetrics && Object.keys(input.keyMetrics).length > 0) {
      lines.push("");
      lines.push("Global key metrics:");
      for (const [k, v] of Object.entries(input.keyMetrics)) {
        lines.push(`- ${k}: ${v}`);
      }
    }

    if (input.riskStateA && Object.keys(input.riskStateA).length > 0) {
      lines.push("");
      lines.push("Risk state – baseline (A):");
      for (const [k, v] of Object.entries(input.riskStateA)) {
        lines.push(`- ${k}: ${String(v)}`);
      }
    }

    if (input.riskStateB && Object.keys(input.riskStateB).length > 0) {
      lines.push("");
      lines.push("Risk state – alternative (B):");
      for (const [k, v] of Object.entries(input.riskStateB)) {
        lines.push(`- ${k}: ${String(v)}`);
      }
    }

    if (input.events && input.events.length > 0) {
      lines.push("");
      lines.push("Key events (in order):");
      for (const e of input.events) {
        const parts: string[] = [];
        if (typeof e.quarter === "number") parts.push(`Q${e.quarter}`);
        if (e.timestamp) parts.push(e.timestamp);
        if (e.label) parts.push(e.label);
        if (e.category) parts.push(`category=${e.category}`);
        if (e.impact) parts.push(`impact=${e.impact}`);
        lines.push(`- ${parts.join(" | ")}`);
      }
    }

    lines.push("");
    lines.push(
      "Provide a concise expert interpretation of this situation suitable for an executive user."
    );

    const prompt = lines.join("\n");

    let responseText = "";

    try {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3",
          prompt,
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama generate failed with status ${res.status}`);
      }

      const data: any = await res.json();
      responseText = typeof data?.response === "string" ? data.response : "";
    } catch (err) {
      responseText =
        "AI interpretation is currently unavailable. Please check the Ollama service.";
    }

    const output: PulseAIOutput = {
      headline: "AI interpretation",
      summary: responseText,
      keyDrivers: [],
      keyDifferences: [],
      warnings: [],
      recommendedAction: "",
      confidence: 0.5,
    };

    return output;
  }
}

