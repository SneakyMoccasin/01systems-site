import type { PulseLLMProvider } from "./PulseLLMProvider";
import { OllamaProvider } from "./OllamaProvider";
import { GroqProvider } from "./GroqProvider";

/**
 * Supported LLM selection modes for Pulse.
 *
 * - "disabled": AI features are turned off.
 * - "ollama":  force use of the local Ollama provider.
 * - "groq":    force use of the Groq cloud provider.
 * - "auto":    let Pulse pick the first available provider (Ollama, then Groq).
 */
export type PulseLLMMode =
  | "auto"
  | "ollama"
  | "groq"
  | "disabled";

/**
 * Resolve which LLM provider Pulse should use for the current run.
 *
 * The rest of the system depends only on the PulseLLMProvider interface,
 * not on concrete provider classes, which keeps the AI layer
 * provider-agnostic. Additional providers (OpenAI, Claude, Groq, etc.)
 * will be added to this resolver over time.
 */
export async function getLLMProvider(
  mode: PulseLLMMode
): Promise<PulseLLMProvider | null> {
  if (mode === "disabled") {
    return null;
  }

  if (mode === "ollama") {
    return new OllamaProvider();
  }

  if (mode === "groq") {
    return new GroqProvider();
  }

  // Auto mode: try providers in a preferred order (Ollama → Groq).
  if (mode === "auto") {
    const ollama = new OllamaProvider();
    if (await ollama.isAvailable()) {
      return ollama;
    }
    const groq = new GroqProvider();
    if (await groq.isAvailable()) {
      return groq;
    }
    return null;
  }

  // Fallback: no provider selected.
  return null;
}

