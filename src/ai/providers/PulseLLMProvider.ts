import type { PulseAIInput, PulseAIOutput } from "../pulseAIContract";

/**
 * Core contract for all Pulse AI LLM providers.
 *
 * Each concrete provider (Ollama, OpenAI, Claude, Groq, etc.)
 * implements this interface so the rest of the system can call
 * a single, provider-agnostic API.
 */
export interface PulseLLMProvider {
  /**
   * Human-readable provider name, e.g. "ollama:llama3", "openai:gpt-4.5".
   */
  name: string;

  /**
   * Lightweight health check indicating whether this provider is currently
   * usable (credentials present, endpoint reachable, model available, etc.).
   */
  isAvailable(): Promise<boolean>;

  /**
   * Execute an AI request using the provider-specific backend and translate
   * the result into the shared PulseAIOutput contract.
   */
  generate(input: PulseAIInput): Promise<PulseAIOutput>;
}

