"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { CASCADE_PRESENTATION } from "@/src/pilotFastighet/cascadePresentation";

export type WorkspaceConfigurationSection = "interventions" | "drivers";

export type WorkspaceConfigurationState = {
  activeSection: WorkspaceConfigurationSection | null;
  pinned: boolean;
};

export const CONFIGURATION_PIN_STORAGE_KEY =
  "cascade-engine:workspace-configuration-pinned";

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

export function readConfigurationPinPreference(
  storage: StorageReader | null | undefined
): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(CONFIGURATION_PIN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeConfigurationPinPreference(
  storage: StorageWriter | null | undefined,
  pinned: boolean
): void {
  if (!storage) return;
  try {
    storage.setItem(CONFIGURATION_PIN_STORAGE_KEY, String(pinned));
  } catch {
    // A blocked storage write must never block configuration access.
  }
}

export function transitionWorkspaceConfiguration(
  state: WorkspaceConfigurationState,
  action:
    | { type: "open"; section: WorkspaceConfigurationSection }
    | { type: "close" }
    | { type: "toggle-pin" }
): WorkspaceConfigurationState {
  if (action.type === "open") {
    return { ...state, activeSection: action.section };
  }
  if (action.type === "close") {
    return { ...state, activeSection: null };
  }
  return { ...state, pinned: !state.pinned };
}

type Props = {
  enabled?: boolean;
  language: "sv" | "en";
  interventionsCount: number;
  driversCount: number;
  validationCount?: number;
  changed?: boolean;
  interventions: ReactNode;
  drivers: ReactNode;
  children?: ReactNode;
};

export default function WorkspaceConfigurationShell({
  enabled = true,
  language,
  interventionsCount,
  driversCount,
  validationCount = 0,
  changed = false,
  interventions,
  drivers,
  children,
}: Props) {
  const [state, setState] = useState<WorkspaceConfigurationState>(() => ({
    activeSection: null,
    pinned:
      typeof window !== "undefined"
        ? readConfigurationPinPreference(window.localStorage)
        : false,
  }));
  const controlRowRef = useRef<HTMLDivElement | null>(null);
  const [desktopInspectorTop, setDesktopInspectorTop] = useState(144);

  useEffect(() => {
    writeConfigurationPinPreference(window.localStorage, state.pinned);
  }, [state.pinned]);

  useEffect(() => {
    if (!state.activeSection) return;
    const updateInspectorTop = () => {
      const rowBottom = controlRowRef.current?.getBoundingClientRect().bottom;
      if (rowBottom == null || !Number.isFinite(rowBottom)) return;
      const viewportHeight = Number.isFinite(window.innerHeight)
        ? window.innerHeight
        : 900;
      setDesktopInspectorTop(
        Math.max(16, Math.min(rowBottom + 12, viewportHeight - 320))
      );
    };
    updateInspectorTop();
    window.addEventListener("resize", updateInspectorTop);
    window.addEventListener("scroll", updateInspectorTop, true);
    return () => {
      window.removeEventListener("resize", updateInspectorTop);
      window.removeEventListener("scroll", updateInspectorTop, true);
    };
  }, [state.activeSection]);

  const open = (section: WorkspaceConfigurationSection) => {
    setState((current) =>
      transitionWorkspaceConfiguration(current, { type: "open", section })
    );
  };
  const close = () => {
    setState((current) =>
      transitionWorkspaceConfiguration(current, { type: "close" })
    );
  };
  const togglePin = () => {
    setState((current) =>
      transitionWorkspaceConfiguration(current, { type: "toggle-pin" })
    );
  };

  const copy =
    language === "sv"
      ? {
          interventions: "Interventioner",
          drivers: "Drivkrafter",
          configuration: "Konfiguration",
          close: "Stäng konfiguration",
          closeOutside: "Stäng konfiguration utanför panelen",
          pin: "Fäst panel",
          unpin: "Lossa panel",
          changed: "Ändringar väntar",
          validation: "valideringsfel",
        }
      : {
          interventions: "Interventions",
          drivers: "Drivers",
          configuration: "Configuration",
          close: "Close configuration",
          closeOutside: "Close configuration outside panel",
          pin: "Pin panel",
          unpin: "Unpin panel",
          changed: "Changes pending",
          validation: "validation issues",
        };

  const panel = state.activeSection ? (
    <section
      aria-label={`${copy.configuration}: ${
        state.activeSection === "interventions" ? copy.interventions : copy.drivers
      }`}
      className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950 text-slate-100"
      style={{ borderColor: CASCADE_PRESENTATION.borders.dark }}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {copy.configuration}
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-100">
            {state.activeSection === "interventions"
              ? copy.interventions
              : copy.drivers}
          </div>
        </div>
        <button
          type="button"
          aria-label={state.pinned ? copy.unpin : copy.pin}
          aria-pressed={state.pinned}
          onClick={togglePin}
          className="hidden rounded-md border border-slate-700 bg-transparent px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-600 hover:text-slate-100 lg:inline-flex"
        >
          {state.pinned ? copy.unpin : copy.pin}
        </button>
        <button
          type="button"
          aria-label={copy.close}
          onClick={close}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-transparent text-lg leading-none text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
        >
          ×
        </button>
      </header>

      <nav
        aria-label={copy.configuration}
        className="flex shrink-0 border-b border-slate-800 px-4"
      >
        {(["interventions", "drivers"] as const).map((section) => {
          const selected = state.activeSection === section;
          return (
            <button
              key={section}
              type="button"
              onClick={() => open(section)}
              aria-current={selected ? "page" : undefined}
              className="border-b-2 px-0 py-3 text-xs font-medium transition first:mr-5"
              style={{
                color: selected ? "#E5E7EB" : "#94A3B8",
                borderColor: selected ? "#64748B" : "transparent",
              }}
            >
              {section === "interventions" ? copy.interventions : copy.drivers}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {state.activeSection === "interventions" ? interventions : drivers}
      </div>
    </section>
  ) : null;

  if (!enabled) {
    return <>{children}</>;
  }

  const overlay =
    state.activeSection && typeof document !== "undefined"
      ? createPortal(
          <div className={state.pinned ? "lg:hidden" : undefined}>
            <button
              type="button"
              aria-label={copy.closeOutside}
              data-testid="configuration-outside-close"
              onClick={close}
              className="cursor-default bg-transparent"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 2147483000,
                border: 0,
                background: "transparent",
              }}
            />
            <aside
              role="dialog"
              aria-modal="true"
              className="ce-workspace-config-inspector overflow-hidden bg-slate-950"
              style={{
                position: "fixed",
                right: 0,
                zIndex: 2147483001,
                border: `1px solid ${CASCADE_PRESENTATION.borders.dark}`,
                boxShadow: "-8px 0 22px rgba(2, 6, 23, 0.16)",
                "--ce-config-inspector-top": `${desktopInspectorTop}px`,
              } as CSSProperties}
            >
              {panel}
            </aside>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="min-w-0 max-w-full">
      <style>{`
        .ce-workspace-config-inspector {
          top: 0;
          bottom: 0;
          width: min(92vw, 420px);
        }
        @media (min-width: 1024px) {
          .ce-workspace-config-inspector {
            top: var(--ce-config-inspector-top);
            right: 16px !important;
            bottom: 16px;
            width: min(400px, calc(100vw - 48px));
            border-radius: 8px;
          }
        }
      `}</style>
      <div
        ref={controlRowRef}
        data-testid="configuration-control-row"
        className="mb-4 flex min-w-0 flex-wrap items-center justify-end gap-3 border-b border-slate-800 pb-3"
      >
        <div className="flex min-w-0 items-center gap-3 text-xs text-slate-500">
          {validationCount > 0 && (
            <button
              type="button"
              onClick={() => open("interventions")}
              className="text-red-300 underline-offset-4 hover:underline"
            >
              {`${validationCount} ${copy.validation}`}
            </button>
          )}
          {changed && <span>{copy.changed}</span>}
        </div>
        <button
          type="button"
          onClick={() => open("interventions")}
          aria-expanded={state.activeSection !== null}
          className="inline-flex min-h-10 items-center gap-3 rounded-md border bg-transparent px-3 py-1.5 text-left transition hover:bg-slate-800/45"
          style={{
            color: "#CBD5E1",
            borderColor:
              validationCount > 0 ? "#7F1D1D" : CASCADE_PRESENTATION.borders.dark,
          }}
        >
          <span className="text-sm font-medium">{copy.configuration}</span>
          <span className="border-l border-slate-700 pl-3 text-[11px] font-normal text-slate-500">
            {`${copy.interventions} ${interventionsCount} · ${copy.drivers} ${driversCount}`}
          </span>
          {(validationCount > 0 || changed) && (
            <span className="sr-only">
              {[
                validationCount > 0
                  ? `${validationCount} ${copy.validation}`
                  : null,
                changed ? copy.changed : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </button>
      </div>

      <div
        className={
          state.pinned && state.activeSection
            ? "min-w-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:gap-5"
            : "min-w-0"
        }
      >
        <div className="min-w-0 max-w-full overflow-x-hidden">{children}</div>
        {state.pinned && state.activeSection && (
          <aside className="hidden min-h-[520px] max-h-[calc(100vh-32px)] overflow-hidden rounded-lg border border-slate-800 lg:sticky lg:top-4 lg:block">
            {panel}
          </aside>
        )}
      </div>

      {overlay}
    </div>
  );
}
