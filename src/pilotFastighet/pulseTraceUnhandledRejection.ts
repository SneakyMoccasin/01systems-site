/**
 * Temporary diagnostic helpers for `[object Event]` / odd `unhandledrejection` reasons.
 * Enable in dev automatically, or set NEXT_PUBLIC_PULSE_TRACE_REJECT=1 for production builds.
 */

export function isPulseRejectionTraceEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_PULSE_TRACE_REJECT === "1"
  );
}

function describeReason(reason: unknown): Record<string, unknown> {
  const t = typeof reason;
  const ctor =
    reason !== null && reason !== undefined && typeof reason === "object"
      ? (reason as { constructor?: { name?: string } }).constructor?.name
      : undefined;

  const isDOMEvent =
    typeof Event !== "undefined" &&
    typeof reason === "object" &&
    reason !== null &&
    reason instanceof Event;

  /** Heuristic for React's synthetic event shape (not exhaustive). */
  const looksReactSynthetic =
    typeof reason === "object" &&
    reason !== null &&
    "nativeEvent" in (reason as object) &&
    typeof (reason as { nativeEvent?: unknown }).nativeEvent === "object";

  const isError = reason instanceof Error;
  const isDomException = reason instanceof DOMException;
  const abortLike =
    (isDomException && reason.name === "AbortError") ||
    (isError && "name" in reason && (reason as Error).name === "AbortError");

  let eventType: string | undefined;
  let eventTargetTag: string | undefined;
  if (isDOMEvent && reason instanceof Event) {
    eventType = reason.type;
    const tgt = reason.target;
    eventTargetTag =
      tgt && typeof HTMLElement !== "undefined" && tgt instanceof HTMLElement
        ? tgt.tagName
        : tgt?.constructor?.name;
  }

  return {
    typeof: t,
    ctor,
    isDOMEvent,
    looksReactSynthetic,
    isError,
    isDomException,
    abortLike,
    stringified: String(reason),
    eventType,
    eventTargetTag,
    message: isError ? (reason as Error).message : undefined,
    domExceptionName: isDomException ? (reason as DOMException).name : undefined,
  };
}

/**
 * Install window listeners; returns cleanup. Call only from client `useEffect`.
 */
export function installPulseUnhandledRejectionTracer(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!isPulseRejectionTraceEnabled()) return () => {};

  const onUnhandled = (ev: PromiseRejectionEvent) => {
    const reason = ev.reason;
    const meta = describeReason(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;

    console.warn("[Pulse trace] unhandledrejection", meta, {
      promise: ev.promise,
      reason,
      stack,
    });

    if (meta.isDOMEvent || String(reason) === "[object Event]") {
      console.warn(
        "[Pulse trace] Native DOM Event (or Event-string) as rejection reason — check code paths that reject(event) or Promise.reject(event).",
        reason
      );
      const normalized = pulseReasonToError(reason, "unhandledrejection");
      console.warn("[Pulse trace] normalized (diagnostic Error):", normalized.message);
      ev.preventDefault();
    } else if (meta.looksReactSynthetic) {
      console.warn(
        "[Pulse trace] Rejection reason looks like a React synthetic event object.",
        reason
      );
      console.warn(
        "[Pulse trace] normalized (diagnostic Error):",
        pulseReasonToError(reason, "unhandledrejection").message
      );
    }
  };

  const onError = (ev: ErrorEvent) => {
    console.warn("[Pulse trace] window.error", {
      message: ev.message,
      filename: ev.filename,
      lineno: ev.lineno,
      colno: ev.colno,
      error: ev.error,
      ctor: ev.error?.constructor?.name,
    });
  };

  const onRejectionHandled = (ev: PromiseRejectionEvent) => {
    console.warn("[Pulse trace] rejectionhandled (late handler attached)", {
      reason: ev.reason,
      meta: describeReason(ev.reason),
    });
  };

  window.addEventListener("unhandledrejection", onUnhandled);
  window.addEventListener("error", onError);
  window.addEventListener("rejectionhandled", onRejectionHandled);

  console.warn(
    "[Pulse trace] Global rejection tracing enabled (dev or NEXT_PUBLIC_PULSE_TRACE_REJECT=1)."
  );

  return () => {
    window.removeEventListener("unhandledrejection", onUnhandled);
    window.removeEventListener("error", onError);
    window.removeEventListener("rejectionhandled", onRejectionHandled);
  };
}

/** Wrap an unknown rejection reason as an Error for logging (does not mutate global behavior). */
export function pulseReasonToError(reason: unknown, context: string): Error {
  if (reason instanceof Error) {
    return new Error(`${context}: ${reason.message}${reason.stack ? `\n${reason.stack}` : ""}`);
  }
  if (
    typeof Event !== "undefined" &&
    typeof reason === "object" &&
    reason !== null &&
    reason instanceof Event
  ) {
    const ev = reason as Event;
    return new Error(
      `${context}: DOM Event type=${JSON.stringify(ev.type)} target=${String(ev.target)}`
    );
  }
  return new Error(`${context}: ${String(reason)}`);
}

export function logPulseCaughtRejection(context: string, reason: unknown): void {
  if (!isPulseRejectionTraceEnabled()) return;
  const err = pulseReasonToError(reason, context);
  console.warn("[Pulse trace] caught rejection path", context, describeReason(reason), err);
}
