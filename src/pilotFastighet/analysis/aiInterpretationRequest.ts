export const DEFAULT_AI_INTERPRETATION_TIMEOUT_MS = 60_000;
const MIN_AI_INTERPRETATION_TIMEOUT_MS = 1_000;
const MAX_AI_INTERPRETATION_TIMEOUT_MS = 120_000;

export type AiInterpretationErrorCode =
  | "AI_INTERPRETATION_TIMEOUT"
  | "AI_INTERPRETATION_UNAVAILABLE";

export type AiInterpretationErrorResponse = Readonly<{
  error: Readonly<{
    code: AiInterpretationErrorCode;
  }>;
}>;

export class AiInterpretationRequestError extends Error {
  constructor(readonly code: AiInterpretationErrorCode) {
    super(code);
    this.name = "AiInterpretationRequestError";
  }
}

export function resolveAiInterpretationTimeoutMs(rawValue: string | undefined): number {
  if (rawValue == null || rawValue.trim() === "") {
    return DEFAULT_AI_INTERPRETATION_TIMEOUT_MS;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return DEFAULT_AI_INTERPRETATION_TIMEOUT_MS;
  return Math.min(
    MAX_AI_INTERPRETATION_TIMEOUT_MS,
    Math.max(MIN_AI_INTERPRETATION_TIMEOUT_MS, Math.round(parsed))
  );
}

type RequestOptions = Readonly<{
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  setTimeoutImpl?: typeof setTimeout;
  clearTimeoutImpl?: typeof clearTimeout;
}>;

export async function requestAiInterpretationModel(
  body: string,
  options: RequestOptions = {}
): Promise<Readonly<{ response: string }>> {
  const controller = new AbortController();
  const fetchImpl = options.fetchImpl ?? fetch;
  const setTimeoutImpl = options.setTimeoutImpl ?? setTimeout;
  const clearTimeoutImpl = options.clearTimeoutImpl ?? clearTimeout;
  const timeoutMs = options.timeoutMs ?? DEFAULT_AI_INTERPRETATION_TIMEOUT_MS;
  let timedOut = false;
  const timeout = setTimeoutImpl(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AiInterpretationRequestError("AI_INTERPRETATION_UNAVAILABLE");
    }

    try {
      const data = (await response.json()) as { response?: unknown };
      if (typeof data.response !== "string") {
        throw new AiInterpretationRequestError("AI_INTERPRETATION_UNAVAILABLE");
      }
      return { response: data.response };
    } catch {
      throw new AiInterpretationRequestError("AI_INTERPRETATION_UNAVAILABLE");
    }
  } catch (error) {
    if (timedOut) {
      throw new AiInterpretationRequestError("AI_INTERPRETATION_TIMEOUT");
    }
    if (error instanceof AiInterpretationRequestError) throw error;
    throw new AiInterpretationRequestError("AI_INTERPRETATION_UNAVAILABLE");
  } finally {
    clearTimeoutImpl(timeout);
  }
}

export function aiInterpretationErrorResponse(
  code: AiInterpretationErrorCode
): AiInterpretationErrorResponse {
  return { error: { code } };
}
