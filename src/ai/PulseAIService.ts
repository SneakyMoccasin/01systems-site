import type { PulseAIInput, PulseAIOutput } from "./pulseAIContract";
import { getLLMProvider, type PulseLLMMode } from "./providers/getLLMProvider";

/**
 * Central entry point for all AI interactions in Pulse.
 *
 * UI, simulation, and API routes should depend on this service
 * instead of talking to concrete LLM providers directly.
 *
 * The service delegates provider selection to getLLMProvider,
 * which makes it easy to switch between disabled / local / cloud
 * AI modes without changing callers.
 */
export class PulseAIService {
  constructor(private mode: PulseLLMMode = "auto") {}

  /**
   * Execute an AI request using the currently selected LLM provider.
   *
   * Returns:
   * - PulseAIOutput on success
   * - null if AI is disabled or no provider is available
   * - a safe fallback PulseAIOutput if the provider throws an error
   */
  async generate(input: PulseAIInput): Promise<PulseAIOutput | null> {
    const provider = await getLLMProvider(this.mode);

    if (!provider) {
      // AI is disabled or no provider is available.
      return null;
    }

    try {
      return await provider.generate(input);
    } catch (error) {
      // Return a defensive fallback so callers can handle AI failures gracefully.
      const fallback: PulseAIOutput = {
        headline: "AI unavailable",
        summary: "AI interpretation could not be generated.",
        keyDrivers: [],
        keyDifferences: [],
        warnings: ["AI provider error"],
        recommendedAction: "",
        confidence: 0,
      };
      return fallback;
    }
  }
}

