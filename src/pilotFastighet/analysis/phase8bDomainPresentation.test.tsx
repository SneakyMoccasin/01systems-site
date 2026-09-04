import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import DomainSelector from "../../../app/pilot-fastighet/components/DomainSelector";
import type { DomainKey } from "../../i18n/pulseLanguage";
import { DOMAIN_ACTIONS } from "../actionEffects";
import {
  getDomainPresentation,
  getDomainPresentationLabels,
  type DomainAnalysisGoal,
} from "../domainPresentation";
import { getExecutableProfileIdForDomain } from "../executableDomainProfile";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const PRESENTATION = readFileSync("src/pilotFastighet/domainPresentation.ts", "utf8");
const DOMAINS = ["realEstate", "municipal", "consulting"] as const;
const GOALS = ["accessibility", "congestion", "margin_stability", "avoid_tipping"] as const;

function renderContext(domain: DomainKey, language: "sv" | "en", goal: DomainAnalysisGoal) {
  const presentation = getDomainPresentation(domain, language, goal);
  return renderToStaticMarkup(createElement("section", null,
    createElement("h1", null, presentation.name),
    createElement(DomainSelector, {
      language,
      value: domain,
      labels: getDomainPresentationLabels(language),
      onChange: () => undefined,
      colors: { background: "#fff", text: "#111", border: "#aaa" },
    }),
    createElement("select", { value: goal, readOnly: true },
      GOALS.map((id) => createElement("option", { key: id, value: id }, presentation.goals[id]))
    ),
    createElement("p", { "data-testid": "analysis-focus" }, presentation.analysisFocus),
    createElement("h2", null, presentation.graphSectionTitle),
    createElement("p", { "data-testid": "graph-focus" }, presentation.graphFocus),
    createElement("p", { "data-testid": "graph-description" }, presentation.graphDescription)
  ));
}

function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

test("Consulting has explicit natural Swedish and English presentation before analysis", () => {
  const sv = renderContext("consulting", "sv", "accessibility");
  assert.match(sv, /Besluts- och scenariomiljö/);
  assert.match(sv, /Stärk projektstabilitet|Minska resursbelastning|Bevara leveranskapacitet|Undvik leveransbegränsningar/);
  assert.match(sv, /Projektstabilitet och leveransförmåga i beslutsmiljön/);
  assert.match(sv, /projektstabilitet, resursbelastning, budgetexponering och leveransbacklog/);

  const en = renderContext("consulting", "en", "avoid_tipping");
  assert.match(en, /Decision Environment/);
  assert.match(en, /Strengthen project stability|Reduce resource strain|Preserve delivery capacity|Avoid delivery constraints/);
  assert.match(en, /Project stability and delivery capacity in the decision environment/);
  assert.match(en, /project stability, resource strain, budget exposure, and delivery backlog/);
});

test("Consulting presentation contains no Transport or Real Estate fallback language", () => {
  for (const language of ["sv", "en"] as const) {
    for (const goal of GOALS) {
      const presentation = getDomainPresentation("consulting", language, goal);
      const text = visibleText(Object.values({
        name: presentation.name,
        goals: Object.values(presentation.goals).join(" "),
        analysisFocus: presentation.analysisFocus,
        graphFocus: presentation.graphFocus,
        graphDescription: presentation.graphDescription,
      }).join(" "));
      assert.doesNotMatch(text, /transportsystem|transport system|tillgänglighet|accessibility|trängsel|congestion|färdmedel|hyresgäst|tenant|lease|fastighetsportfölj|real estate|refinansiering|refinancing|belåning|leverage/i);
    }
  }
});

test("Transport and Real Estate preserve their established bilingual copy", () => {
  assert.equal(getDomainPresentation("municipal", "en", "accessibility").goals.accessibility, "Increase accessibility");
  assert.equal(getDomainPresentation("municipal", "sv", "congestion").graphFocus, "Kapacitetstryckets påverkan på systemets handlingsutrymme");
  assert.equal(getDomainPresentation("realEstate", "en", "accessibility").goals.accessibility, "Strengthen leasing attractiveness");
  assert.equal(getDomainPresentation("realEstate", "sv", "avoid_tipping").graphDescription, "Grafen visar hur portföljens handlingsutrymme förändras över tid när refinansiering, kapitalbindning, kassaflöde, beläggning och underhållsstrategi utvecklas tillsammans.");
});

test("all six domain-switch directions resolve only destination presentation and a valid goal", () => {
  for (const from of DOMAINS) {
    for (const to of DOMAINS) {
      if (from === to) continue;
      for (const goal of GOALS) {
        const destination = getDomainPresentation(to, "en", goal);
        assert.equal(destination.name, getDomainPresentationLabels("en")[to]);
        assert.ok(destination.goals[goal]);
        assert.ok(destination.graphFocus);
        assert.ok(destination.graphDescription);
      }
    }
  }
});

test("normal page consumes the exhaustive domain contract without implicit Transport fallback", () => {
  for (const expression of [
    "domainPresentation.goals.accessibility",
    "domainPresentation.goals.congestion",
    "domainPresentation.goals.margin_stability",
    "domainPresentation.goals.avoid_tipping",
    "domainPresentation.graphSectionTitle",
    "domainPresentation.graphFocus",
    "domainPresentation.graphDescription",
  ]) assert.match(PAGE, new RegExp(expression.replaceAll(".", "\\.")));
  assert.doesNotMatch(PAGE, /TOP_LEVEL_GOAL_LABELS/);
  assert.match(PRESENTATION, /satisfies Record<DomainKey, DomainPresentationDefinition>/);
  assert.doesNotMatch(PRESENTATION, /DOMAIN_PRESENTATION\[domain\]\s*\?\?/);
});

test("presentation correction leaves executable profiles and intervention inventories unchanged", () => {
  assert.deepEqual(
    Object.fromEntries(DOMAINS.map((domain) => [domain, getExecutableProfileIdForDomain(domain)])),
    { realEstate: "legacy-real-estate-v1", municipal: "legacy-municipal-v1", consulting: "legacy-consulting-v1" }
  );
  assert.deepEqual(
    Object.fromEntries(DOMAINS.map((domain) => [domain, DOMAIN_ACTIONS[domain].length])),
    { realEstate: 8, municipal: 7, consulting: 10 }
  );
  assert.doesNotMatch(PRESENTATION, /RealEstateEngine|runCascadeAnalysis|ACTION_EFFECTS|riskPropagation|simulateConstraintsStep/);
});
