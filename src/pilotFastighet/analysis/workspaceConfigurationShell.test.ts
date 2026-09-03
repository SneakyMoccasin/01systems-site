import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { parseHTML } from "linkedom";

import WorkspaceConfigurationShell, {
  CONFIGURATION_PIN_STORAGE_KEY,
  readConfigurationPinPreference,
  transitionWorkspaceConfiguration,
  writeConfigurationPinPreference,
  type WorkspaceConfigurationState,
} from "../../../app/pilot-fastighet/components/WorkspaceConfigurationShell";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const SHELL = readFileSync(
  "app/pilot-fastighet/components/WorkspaceConfigurationShell.tsx",
  "utf8"
);
const ACTION_PANEL = readFileSync(
  "app/pilot-fastighet/components/ActionPanel.tsx",
  "utf8"
);

test("configuration opens, switches sections, and closes without changing pin state", () => {
  const initial: WorkspaceConfigurationState = {
    activeSection: null,
    pinned: false,
  };
  const interventions = transitionWorkspaceConfiguration(initial, {
    type: "open",
    section: "interventions",
  });
  assert.deepEqual(interventions, {
    activeSection: "interventions",
    pinned: false,
  });

  const drivers = transitionWorkspaceConfiguration(interventions, {
    type: "open",
    section: "drivers",
  });
  assert.deepEqual(drivers, { activeSection: "drivers", pinned: false });
  assert.deepEqual(transitionWorkspaceConfiguration(drivers, { type: "close" }), {
    activeSection: null,
    pinned: false,
  });
});

test("pin and unpin preserve the active configuration section", () => {
  const open: WorkspaceConfigurationState = {
    activeSection: "interventions",
    pinned: false,
  };
  const pinned = transitionWorkspaceConfiguration(open, { type: "toggle-pin" });
  assert.deepEqual(pinned, {
    activeSection: "interventions",
    pinned: true,
  });
  assert.deepEqual(
    transitionWorkspaceConfiguration(pinned, { type: "toggle-pin" }),
    open
  );
});

test("pin persistence restores only an explicit true and fails safely", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };

  assert.equal(readConfigurationPinPreference(storage), false);
  writeConfigurationPinPreference(storage, true);
  assert.equal(values.get(CONFIGURATION_PIN_STORAGE_KEY), "true");
  assert.equal(readConfigurationPinPreference(storage), true);
  writeConfigurationPinPreference(storage, false);
  assert.equal(readConfigurationPinPreference(storage), false);

  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(readConfigurationPinPreference(blocked), false);
  assert.doesNotThrow(() => writeConfigurationPinPreference(blocked, true));
});

test("rendered entry controls open, close, switch, and restore pin preference", async () => {
  Object.defineProperty(globalThis, "React", {
    configurable: true,
    value: React,
  });
  for (const restoredPin of [false, true]) {
    const { window } = parseHTML("<html><body><div id='root'></div></body></html>");
    const values = new Map<string, string>();
    if (restoredPin) {
      values.set(CONFIGURATION_PIN_STORAGE_KEY, "true");
    }
    const storage = {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      },
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: window,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: window.document,
    });
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
    });

    const container = window.document.getElementById("root");
    assert.ok(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          WorkspaceConfigurationShell,
          {
            language: "en",
            interventionsCount: 6,
            driversCount: 18,
            validationCount: 2,
            changed: true,
            interventions: createElement("div", null, "INTERVENTIONS_DRAWER_CONTENT"),
            drivers: createElement("div", null, "DRIVERS_DRAWER_CONTENT"),
          },
          createElement("main", null, "ANALYSIS_CONTENT")
        )
      );
    });

    const findButton = (label: string) =>
      Array.from(window.document.querySelectorAll("button")).find(
        (button) => button.textContent?.trim() === label
      );
    assert.equal(window.document.querySelector('[role="dialog"]'), null);
    assert.doesNotMatch(window.document.body.textContent ?? "", /DRAWER_CONTENT/);
    assert.match(window.document.body.textContent ?? "", /Configuration/);
    assert.match(window.document.body.textContent ?? "", /Interventions 6 · Drivers 18/);
    assert.match(window.document.body.textContent ?? "", /2 validation issues/);
    assert.match(window.document.body.textContent ?? "", /Changes pending/);
    const controlRow = window.document.querySelector(
      '[data-testid="configuration-control-row"]'
    );
    assert.ok(controlRow);
    Object.defineProperty(controlRow, "getBoundingClientRect", {
      configurable: true,
      value: () =>
        ({
          x: 0,
          y: 180,
          top: 180,
          right: 1200,
          bottom: 236,
          left: 0,
          width: 1200,
          height: 56,
          toJSON: () => ({}),
        }) as DOMRect,
    });

    const configurationEntry = Array.from(
      window.document.querySelectorAll("button")
    ).find((button) => button.textContent?.includes("Configuration"));
    assert.ok(configurationEntry);
    await act(async () => configurationEntry.click());
    let dialog = window.document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.equal(dialog.getAttribute("aria-modal"), "true");
    assert.equal(dialog.getAttribute("hidden"), null);
    assert.equal(dialog.getAttribute("aria-hidden"), null);
    assert.equal((dialog as HTMLElement).style.position, "fixed");
    assert.equal(
      (dialog as HTMLElement).style.getPropertyValue(
        "--ce-config-inspector-top"
      ),
      "248px"
    );
    assert.match(dialog.textContent ?? "", /INTERVENTIONS_DRAWER_CONTENT/);
    const outsideClose = window.document.querySelector(
      '[data-testid="configuration-outside-close"]'
    );
    assert.ok(outsideClose);
    assert.equal((outsideClose as HTMLElement).style.background, "transparent");
    assert.doesNotMatch(outsideClose.getAttribute("class") ?? "", /bg-black/);

    const closeButton = window.document.querySelector(
      'button[aria-label="Close configuration"]'
    );
    assert.ok(closeButton);
    await act(async () => (closeButton as HTMLButtonElement).click());
    assert.equal(window.document.querySelector('[role="dialog"]'), null);
    assert.doesNotMatch(window.document.body.textContent ?? "", /DRAWER_CONTENT/);

    const validationEntry = findButton("2 validation issues");
    assert.ok(validationEntry);
    await act(async () => validationEntry.click());
    dialog = window.document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.match(dialog.textContent ?? "", /INTERVENTIONS_DRAWER_CONTENT/);

    const outsideCloseAfterValidation = window.document.querySelector(
      '[data-testid="configuration-outside-close"]'
    );
    assert.ok(outsideCloseAfterValidation);
    await act(async () => (outsideCloseAfterValidation as HTMLButtonElement).click());
    assert.equal(window.document.querySelector('[role="dialog"]'), null);

    await act(async () => configurationEntry.click());
    dialog = window.document.querySelector('[role="dialog"]');
    assert.ok(dialog);

    const insideDrivers = Array.from(
      dialog.querySelectorAll("nav button")
    ).find((button) => button.textContent?.trim() === "Drivers");
    assert.ok(insideDrivers);
    await act(async () => (insideDrivers as HTMLButtonElement).click());
    dialog = window.document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.match(dialog.textContent ?? "", /DRIVERS_DRAWER_CONTENT/);
    assert.doesNotMatch(dialog.textContent ?? "", /INTERVENTIONS_DRAWER_CONTENT/);

    const insideInterventions = Array.from(dialog.querySelectorAll("nav button")).find(
      (button) => button.textContent?.trim() === "Interventions"
    );
    assert.ok(insideInterventions);
    await act(async () => (insideInterventions as HTMLButtonElement).click());
    assert.match(
      window.document.querySelector('[role="dialog"]')?.textContent ?? "",
      /INTERVENTIONS_DRAWER_CONTENT/
    );

    const pinControl = window.document.querySelector(
      `button[aria-label="${restoredPin ? "Unpin panel" : "Pin panel"}"]`
    );
    assert.ok(pinControl);
    assert.equal(pinControl.getAttribute("aria-pressed"), String(restoredPin));
    await act(async () => (pinControl as HTMLButtonElement).click());
    assert.equal(
      values.get(CONFIGURATION_PIN_STORAGE_KEY),
      String(!restoredPin)
    );

    await act(async () => root.unmount());
  }
});

test("existing Interventions and Drivers controls remain wired through slots", () => {
  assert.match(PAGE, /interventions=\{interventionConfiguration\}/);
  assert.match(PAGE, /drivers=\{driverConfiguration\}/);
  assert.match(PAGE, /<ActionPanel\b/);
  assert.match(ACTION_PANEL, /onClick=\{\(\) => applyAction\(action\)\}/);
  assert.match(ACTION_PANEL, /toggleScheduledAction\?\.\(action\)/);
  assert.match(ACTION_PANEL, /updateScheduledActionStep\?\.\(action,/);
  assert.match(PAGE, /handleParameterChange\(param\.key, event\.target\.value as RiskLevel\)/);
  assert.match(PAGE, /validationCount=\{scheduleValidationIssues\.length\}/);
  assert.match(SHELL, /onClick=\{\(\) => open\("interventions"\)\}/);
});

test("Executive Demo bypasses configuration and the shell stays presentation-only", () => {
  assert.match(PAGE, /enabled=\{!executiveDemoMode\}/);
  assert.match(SHELL, /if \(!enabled\) \{\s*return <>\{children\}<\/>;/);
  assert.doesNotMatch(
    SHELL,
    /RealEstateEngine|runCascadeAnalysis|manualScheduledExecution|actionEffects|driverScoreState|riskPropagation/
  );
  assert.doesNotMatch(SHELL, /\.step\(|applyDriver|calculate|propagat/i);
});

test("normal workspace capabilities remain mounted outside the configuration shell", () => {
  for (const component of [
    "MarginGraph",
    "AIInspectorPanel",
    "AIInterpretationPanel",
    "SnapshotCompare",
  ]) {
    assert.match(PAGE, new RegExp(`<${component}\\b`), component);
  }
  for (const retiredSurface of ["ScenarioLibrary", "ScenarioPromptDock", "ScenarioPreviewPanel"]) {
    assert.doesNotMatch(PAGE, new RegExp(`<${retiredSurface}\\b`), retiredSurface);
  }
  assert.match(PAGE, /historyA/);
  assert.match(PAGE, /historyB/);
  assert.match(PAGE, /startSimulation/);
});
