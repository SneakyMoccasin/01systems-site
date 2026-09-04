import assert from "node:assert/strict";
import test from "node:test";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { parseHTML } from "linkedom";
import AIInterpretationPanel from "../../../app/pilot-fastighet/components/AIInterpretationPanel";
import { POST } from "../../../app/api/ai-interpretation/route";
import {
  AiInterpretationRequestError,
  DEFAULT_AI_INTERPRETATION_TIMEOUT_MS,
  requestAiInterpretationModel,
  resolveAiInterpretationTimeoutMs,
} from "./aiInterpretationRequest";

test("AI model request succeeds unchanged and always clears its timeout", async () => {
  let cleared: unknown;
  const timer = { id: "timer" } as unknown as ReturnType<typeof setTimeout>;
  const data = await requestAiInterpretationModel("payload", {
    fetchImpl: async (_url, init) => {
      assert.equal(init?.body, "payload");
      assert.equal(init?.signal instanceof AbortSignal, true);
      return new Response(JSON.stringify({ response: "Generated text" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
    setTimeoutImpl: (() => timer) as unknown as typeof setTimeout,
    clearTimeoutImpl: ((value: unknown) => {
      cleared = value;
    }) as typeof clearTimeout,
  });
  assert.deepEqual(data, { response: "Generated text" });
  assert.equal(cleared, timer);
});

test("60-second timeout aborts the underlying request and is classified separately", async () => {
  let configuredDelay = 0;
  let clearCount = 0;
  await assert.rejects(
    requestAiInterpretationModel("payload", {
      fetchImpl: async (_url, init) => {
        assert.equal(init?.signal?.aborted, true);
        throw new DOMException("aborted", "AbortError");
      },
      setTimeoutImpl: ((callback: () => void, delay: number) => {
        configuredDelay = delay;
        callback();
        return 1 as unknown as ReturnType<typeof setTimeout>;
      }) as typeof setTimeout,
      clearTimeoutImpl: (() => {
        clearCount += 1;
      }) as typeof clearTimeout,
    }),
    (error: unknown) =>
      error instanceof AiInterpretationRequestError &&
      error.code === "AI_INTERPRETATION_TIMEOUT"
  );
  assert.equal(configuredDelay, DEFAULT_AI_INTERPRETATION_TIMEOUT_MS);
  assert.equal(clearCount, 1);
});

test("timeout configuration is validated and bounded", () => {
  assert.equal(resolveAiInterpretationTimeoutMs(undefined), 60_000);
  assert.equal(resolveAiInterpretationTimeoutMs("invalid"), 60_000);
  assert.equal(resolveAiInterpretationTimeoutMs("10"), 1_000);
  assert.equal(resolveAiInterpretationTimeoutMs("999999"), 120_000);
});

test("non-2xx and malformed model responses use the generic unavailable class", async () => {
  for (const response of [
    new Response("failure", { status: 503 }),
    new Response("not json", { status: 200 }),
  ]) {
    await assert.rejects(
      requestAiInterpretationModel("payload", {
        fetchImpl: async () => response,
      }),
      (error: unknown) =>
        error instanceof AiInterpretationRequestError &&
        error.code === "AI_INTERPRETATION_UNAVAILABLE"
    );
  }
});

function routeRequest(): Request {
  return new Request("http://localhost/api/ai-interpretation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "en",
      events: [],
      cascadeEvents: [],
      currentMargin: 1,
      alternativeMargin: 1,
      marginImpact: 0,
      decisionFlowEvents: [],
    }),
  });
}

test("route returns a stable typed 504 timeout response without exposing model details", async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let cleared = false;
  Object.defineProperty(globalThis, "setTimeout", {
    configurable: true,
    value: ((callback: () => void) => {
      callback();
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout,
  });
  Object.defineProperty(globalThis, "clearTimeout", {
    configurable: true,
    value: (() => {
      cleared = true;
    }) as typeof clearTimeout,
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: (async (_url: string | URL | Request, init?: RequestInit) => {
      assert.equal(init?.signal?.aborted, true);
      throw new DOMException("aborted", "AbortError");
    }) as typeof fetch,
  });

  try {
    const response = await POST(routeRequest());
    assert.equal(response.status, 504);
    assert.deepEqual(await response.json(), {
      error: { code: "AI_INTERPRETATION_TIMEOUT" },
    });
    assert.equal(cleared, true);
  } finally {
    Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
    Object.defineProperty(globalThis, "setTimeout", { configurable: true, value: originalSetTimeout });
    Object.defineProperty(globalThis, "clearTimeout", { configurable: true, value: originalClearTimeout });
  }
});

function panelProps(
  language: "sv" | "en",
  simulationCompleted = true
): React.ComponentProps<typeof AIInterpretationPanel> {
  return {
    language,
    tippingQuarter: null,
    events: [],
    simulationCompleted,
    currentMargin: 1,
    alternativeMargin: 1,
    marginImpact: 0,
    caseName: "Case",
  };
}

async function renderPanel(
  language: "sv" | "en",
  fetchImpl: typeof fetch,
  executiveInterpretationStrip = false
) {
  Object.defineProperty(globalThis, "React", { configurable: true, value: React });
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: fetchImpl });
  const { window } = parseHTML("<html><body><div id='deterministic'>Structural Findings</div><div id='root'></div></body></html>");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: window.document });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  const container = window.document.getElementById("root");
  assert.ok(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(AIInterpretationPanel, {
      ...panelProps(language),
      executiveDemoMode: executiveInterpretationStrip,
      executiveInterpretationStrip,
    }));
    await Promise.resolve();
    await Promise.resolve();
  });
  return { window, root };
}

test("normal and Executive client surfaces share localized unavailable state without duplicate requests", async () => {
  for (const [language, executive, expected] of [
    ["sv", false, "AI-tolkningen är inte tillgänglig just nu. De deterministiska analysresultaten påverkas inte."],
    ["en", false, "AI interpretation is currently unavailable. The deterministic analysis results are unaffected."],
    ["sv", true, "AI-tolkningen är inte tillgänglig just nu. De deterministiska analysresultaten påverkas inte."],
    ["en", true, "AI interpretation is currently unavailable. The deterministic analysis results are unaffected."],
  ] as const) {
    let calls = 0;
    const rendered = await renderPanel(language, async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { code: "AI_INTERPRETATION_TIMEOUT" } }), {
        status: 504,
        headers: { "Content-Type": "application/json" },
      });
    }, executive);
    assert.match(rendered.window.document.body.textContent ?? "", new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(rendered.window.document.body.textContent ?? "", /Structural Findings/);
    assert.equal(calls, 1);
    await act(async () => rendered.root.unmount());
  }
});

test("reset aborts and invalidates a late response, while a later run can request again", async () => {
  let calls = 0;
  const firstRequest = { signal: null as AbortSignal | null };
  let resolveFirst: ((value: Response) => void) | undefined;
  const firstResponse = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });
  const rendered = await renderPanel("en", async (_url, init) => {
    calls += 1;
    if (calls === 1) {
      firstRequest.signal = init?.signal as AbortSignal;
      return firstResponse;
    }
    return new Response(JSON.stringify({ text: "Overview:\nFresh interpretation" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  await act(async () => rendered.root.render(createElement(AIInterpretationPanel, panelProps("en", false))));
  assert.equal(firstRequest.signal?.aborted, true);
  await act(async () => {
    resolveFirst?.(new Response(JSON.stringify({ text: "Stale interpretation" }), { status: 200 }));
    await Promise.resolve();
  });
  assert.doesNotMatch(rendered.window.document.body.textContent ?? "", /Stale interpretation/);

  await act(async () => {
    rendered.root.render(createElement(AIInterpretationPanel, panelProps("en", true)));
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.equal(calls, 2);
  assert.match(rendered.window.document.body.textContent ?? "", /Fresh interpretation/);
  await act(async () => rendered.root.unmount());
});
