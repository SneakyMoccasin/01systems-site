import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { parseHTML } from "linkedom";

import ModelSetupSection from "../../../app/pilot-fastighet/components/ModelSetupSection";
import { PILOT_CASES } from "../pilotCases";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const SHELL = readFileSync(
  "app/pilot-fastighet/components/WorkspaceConfigurationShell.tsx",
  "utf8"
);
const MODEL_SETUP = readFileSync(
  "app/pilot-fastighet/components/ModelSetupSection.tsx",
  "utf8"
);

function installDom() {
  const { window } = parseHTML("<html><body><div id='root'></div></body></html>");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: window.document,
  });
  Object.defineProperty(globalThis, "React", { configurable: true, value: React });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  const container = window.document.getElementById("root");
  assert.ok(container);
  return { window, container };
}

function chooseTemplate(
  select: HTMLSelectElement,
  templateId: string,
  window: ReturnType<typeof parseHTML>["window"]
) {
  for (const option of Array.from(select.querySelectorAll("option"))) {
    if (option.getAttribute("value") === templateId) {
      option.setAttribute("selected", "");
    } else {
      option.removeAttribute("selected");
    }
  }
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
}

const templates = PILOT_CASES.filter(
  (pilotCase) => pilotCase.domain === "realEstate" && pilotCase.id !== "neutral-baseline"
).map((pilotCase) => ({
  id: pilotCase.id,
  title: pilotCase.title,
  description: pilotCase.oneLiner,
}));

test("manual configuration is default and all applicable template information is reachable", async () => {
  const { window, container } = installDom();
  const root = createRoot(container);
  await act(async () => {
    root.render(
      createElement(ModelSetupSection, {
        language: "en",
        templates,
        loadedTemplateId: "",
        changed: false,
        onLoadTemplate() {},
        onReturnToManual() {},
      })
    );
  });

  const currentState = window.document.querySelector(
    '[data-testid="model-setup-current-state"]'
  );
  assert.equal(currentState?.getAttribute("data-model-setup-state"), "manual");
  assert.match(
    currentState?.textContent ?? "",
    /Manual configuration/
  );
  const options = Array.from(window.document.querySelectorAll("option"));
  assert.deepEqual(
    options.slice(1).map((option) => option.getAttribute("value")),
    templates.map((template) => template.id)
  );
  const loadButtons = Array.from(window.document.querySelectorAll("button")).filter(
    (button) => button.textContent?.trim() === "Load template"
  );
  assert.equal(loadButtons.length, 1);
  assert.equal(loadButtons.filter((button) => !button.hasAttribute("disabled")).length, 0);

  const select = window.document.querySelector("select");
  assert.ok(select);
  for (const template of templates) {
    await act(async () => {
      chooseTemplate(select as HTMLSelectElement, template.id, window);
    });
    assert.equal(
      window.document.querySelector('[data-testid="model-template-description"]')?.textContent,
      template.description
    );
    const currentLoadButtons = Array.from(window.document.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "Load template"
    );
    assert.equal(currentLoadButtons.length, 1);
    assert.equal(currentLoadButtons.filter((button) => !button.hasAttribute("disabled")).length, 1);
  }
  await act(async () => root.unmount());
});

test("browsing is non-mutating and explicit Load applies the chosen editable template", async () => {
  const { window, container } = installDom();
  const loaded: string[] = [];
  const root = createRoot(container);
  await act(async () => {
    root.render(
      createElement(ModelSetupSection, {
        language: "en",
        templates,
        loadedTemplateId: "",
        changed: false,
        onLoadTemplate: (id) => loaded.push(id),
        onReturnToManual() {},
      })
    );
  });

  const select = window.document.querySelector("select");
  assert.ok(select);
  await act(async () => {
    chooseTemplate(select as HTMLSelectElement, templates[0].id, window);
  });
  assert.equal(loaded.length, 0);
  const load = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Load template"
  );
  assert.ok(load);
  await act(async () => load.click());
  assert.deepEqual(loaded, [templates[0].id]);

  await act(async () => {
    root.render(
      createElement(ModelSetupSection, {
        language: "en",
        templates,
        loadedTemplateId: templates[0].id,
        changed: false,
        onLoadTemplate: (id) => loaded.push(id),
        onReturnToManual() {},
      })
    );
  });
  assert.match(
    window.document.querySelector('[data-testid="model-setup-current-state"]')?.textContent ?? "",
    /Editable after loading/
  );
  assert.equal(
    window.document
      .querySelector('[data-testid="model-setup-current-state"]')
      ?.getAttribute("data-model-setup-state"),
    "template"
  );
  await act(async () => root.unmount());
});

test("dirty state requires accessible confirmation; cancel preserves and confirm loads", async () => {
  const { window, container } = installDom();
  const loaded: string[] = [];
  const root = createRoot(container);
  await act(async () => {
    root.render(
      createElement(ModelSetupSection, {
        language: "en",
        templates,
        loadedTemplateId: "",
        changed: true,
        onLoadTemplate: (id) => loaded.push(id),
        onReturnToManual() {},
      })
    );
  });
  const select = window.document.querySelector("select");
  assert.ok(select);
  await act(async () => {
    chooseTemplate(select as HTMLSelectElement, templates[1].id, window);
  });
  const initialLoad = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Load template"
  );
  assert.ok(initialLoad);
  await act(async () => initialLoad.click());
  assert.equal(loaded.length, 0);
  assert.ok(window.document.querySelector('[role="alertdialog"]'));

  const cancel = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Cancel"
  );
  assert.ok(cancel);
  await act(async () => cancel.click());
  assert.equal(loaded.length, 0);
  assert.equal(window.document.querySelector('[role="alertdialog"]'), null);

  const secondLoad = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Load template"
  );
  assert.ok(secondLoad);
  await act(async () => secondLoad.click());
  const confirm = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Confirm and load"
  );
  assert.ok(confirm);
  await act(async () => confirm.click());
  assert.deepEqual(loaded, [templates[1].id]);
  await act(async () => root.unmount());
});

test("returning to manual is explicit and leaves presentation callbacks editable", async () => {
  const { window, container } = installDom();
  let manualCount = 0;
  const root = createRoot(container);
  await act(async () => {
    root.render(
      createElement(ModelSetupSection, {
        language: "en",
        templates,
        loadedTemplateId: templates[0].id,
        changed: false,
        onLoadTemplate() {},
        onReturnToManual: () => {
          manualCount += 1;
        },
      })
    );
  });
  const manual = Array.from(window.document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Return to manual configuration"
  );
  assert.ok(manual);
  await act(async () => manual.click());
  assert.equal(manualCount, 1);
  await act(async () => root.unmount());
});

test("toolbar relocation preserves case contracts and Executive Demo isolation", () => {
  const toolbarStart = PAGE.indexOf("Analysis mode:");
  const toolbarEnd = PAGE.indexOf("<WorkspaceConfigurationShell");
  const toolbar = PAGE.slice(toolbarStart, toolbarEnd);
  assert.doesNotMatch(toolbar, />Case<|>Custom</);
  assert.match(PAGE, /modelSetup=\{/);
  assert.match(PAGE, /templates=\{modelSetupTemplates\}/);
  assert.match(PAGE, /enabled=\{!executiveDemoMode\}/);
  assert.match(SHELL, /\{modelSetup\}/);
  assert.equal(PILOT_CASES.some((pilotCase) => pilotCase.id === "refinancing_squeeze"), true);
  assert.equal(PILOT_CASES.some((pilotCase) => pilotCase.id === "accessibility_push"), true);
  assert.doesNotMatch(
    MODEL_SETUP,
    /RealEstateEngine|runCascadeAnalysis|riskPropagation|actionEffects|calculate|propagat/i
  );
});

test("template application retains the previous exact state and reset operations", () => {
  const callbackStart = PAGE.indexOf("const loadPilotCaseTemplate");
  const callbackEnd = PAGE.indexOf("const returnToManualConfiguration", callbackStart);
  const callback = PAGE.slice(callbackStart, callbackEnd);
  for (const operation of [
    "setBaseRiskStateA(structuredClone(pilotCase.riskStateA))",
    "setBaseRiskStateB(structuredClone(pilotCase.riskStateB))",
    "setRiskStateA(structuredClone(pilotCase.riskStateA))",
    "setRiskStateB(structuredClone(pilotCase.riskStateB))",
    "setDriverScoresA(buildDriverScoreState(pilotCase.riskStateA))",
    "setDriverScoresB(buildDriverScoreState(pilotCase.riskStateB))",
    "setSelectedActionsA([])",
    "setSelectedActionsB([])",
    "setScenarioSchedules(clearAllScenarioSchedules())",
    "setHasSimulationCompleted(false)",
    "resetRunState()",
  ]) {
    assert.match(callback, new RegExp(operation.replace(/[()[\].]/g, "\\$&")));
  }
});
