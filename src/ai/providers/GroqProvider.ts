import type { PulseLLMProvider } from "./PulseLLMProvider";
import type { PulseAIInput, PulseAIOutput } from "../pulseAIContract";

export class GroqProvider implements PulseLLMProvider {
  name = "groq";

  async isAvailable(): Promise<boolean> {
    return !!process.env.GROQ_API_KEY;
  }

  async generate(input: PulseAIInput): Promise<PulseAIOutput> {
    const prompt = `
You are Pulse AI analysing a system simulation.

Mode: ${input.mode}
Domain: ${input.domain}

Baseline:
${JSON.stringify(input.baselineSummary, null, 2)}

Alternative:
${JSON.stringify(input.alternativeSummary, null, 2)}

Key metrics:
${JSON.stringify(input.keyMetrics, null, 2)}

Events:
${JSON.stringify(input.events, null, 2)}

Provide a concise executive interpretation.
`;

    try {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return {
          headline: "AI unavailable",
          summary: "Groq API key is not configured.",
          keyDrivers: [],
          keyDifferences: [],
          warnings: ["GROQ_API_KEY is missing"],
          recommendedAction: "",
          confidence: 0,
        };
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: "You are Pulse AI." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
        }),
      });

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = data?.choices?.[0]?.message?.content ?? "";

      if (!res.ok) {
        return {
          headline: "AI unavailable",
          summary: text || `Groq API error: ${res.status}`,
          keyDrivers: [],
          keyDifferences: [],
          warnings: ["Groq request failed"],
          recommendedAction: "",
          confidence: 0,
        };
      }

      return {
        headline: "AI interpretation",
        summary: text,
        keyDrivers: [],
        keyDifferences: [],
        warnings: [],
        recommendedAction: "",
        confidence: 0.7,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        headline: "AI unavailable",
        summary: `Groq request failed: ${message}`,
        keyDrivers: [],
        keyDifferences: [],
        warnings: ["AI provider error"],
        recommendedAction: "",
        confidence: 0,
      };
    }
  }
}
