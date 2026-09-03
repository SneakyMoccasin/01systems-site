import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import MarginGraph from "../../../app/pilot-fastighet/components/MarginGraph";
import {
  CASCADE_PRESENTATION,
  getCascadeGraphTickIndexes,
  getCascadeGraphPresentation,
  getCascadeGraphAnnotationBand,
  getCascadeVerificationBadgeStyle,
  hasCascadeGraphOverflow,
  resolveCascadeAnnotationLayout,
  resolveCascadeGraphChartWidth,
  resolveCascadeGraphFramePeriods,
  resolveCascadeGraphX,
  type CascadeThemeId,
} from "../cascadePresentation";

const PAGE = readFileSync("app/pilot-fastighet/page.tsx", "utf8");
const GRAPH = readFileSync("app/pilot-fastighet/components/MarginGraph.tsx", "utf8");
const AI = readFileSync("app/pilot-fastighet/components/AIInterpretationPanel.tsx", "utf8");

function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5]
      .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function renderExecutiveGraph(themeId: CascadeThemeId, periods: number) {
  const visual = getCascadeGraphPresentation(themeId);
  const valuesA = Array.from({ length: periods }, (_, index) => 1 - index * 0.01);
  const valuesB = Array.from({ length: periods }, (_, index) => 1 - index * 0.008);
  return renderToStaticMarkup(createElement(MarginGraph, {
    marginHistoryA: valuesA,
    marginHistoryB: valuesB,
    tippingMarginIndexA: null,
    tippingMarginIndexB: null,
    hoverIndex: null,
    showA: true,
    showB: true,
    simulationHorizon: 36,
    theme: {
      graphBg: visual.surface,
      graphBorder: visual.border,
      text: visual.text,
      subtext: visual.secondaryText,
      buttonBg: visual.controlSurface,
      buttonBorder: visual.border,
    },
    uiLanguage: "en",
    svgRef: createRef<SVGSVGElement>(),
    setHoverIndex() {},
    executiveDemoMode: true,
    caseType: "real-estate",
    executiveNarrativeMarkers: [
      { monthIndex: 2, label: "revealed marker" },
      { monthIndex: 20, label: "future marker" },
    ],
  }));
}

test("normal and Executive graphs share one resolved semantic foundation", () => {
  for (const theme of ["light", "dark"] as const) {
    const graph = getCascadeGraphPresentation(theme);
    assert.equal(graph.surface, theme === "light" ? "#FCFCFD" : "#0B0F14");
    assert.equal(graph.text, theme === "light" ? "#101828" : "#E5E7EB");
    assert.equal(graph.border, theme === "light" ? "#D0D5DD" : "#1F2937");
  }
  assert.match(PAGE, /getCascadeGraphPresentation\(uiTheme\)/);
  assert.match(GRAPH, /const graphBackground = theme\.graphBg/);
});

test("Executive frame period count is horizon-stable while normal remains data-driven", () => {
  assert.equal(resolveCascadeGraphFramePeriods({ executiveDemo: true, simulationHorizon: 36, revealedSeriesA: 1, revealedSeriesB: 1 }), 36);
  assert.equal(resolveCascadeGraphFramePeriods({ executiveDemo: true, simulationHorizon: 36, revealedSeriesA: 8, revealedSeriesB: 8 }), 36);
  assert.equal(resolveCascadeGraphFramePeriods({ executiveDemo: true, simulationHorizon: 36, revealedSeriesA: 36, revealedSeriesB: 36 }), 36);
  assert.equal(resolveCascadeGraphFramePeriods({ executiveDemo: false, simulationHorizon: 36, revealedSeriesA: 8, revealedSeriesB: 8 }), 8);
});

test("rendered Light and Dark Executive graphs use their resolved surfaces", () => {
  const light = renderExecutiveGraph("light", 8);
  const dark = renderExecutiveGraph("dark", 8);
  assert.match(light, /#FCFCFD/i);
  assert.doesNotMatch(light, /#0B1220/i);
  assert.match(dark, /#0B0F14/i);
  assert.match(light, /width="720"/);
  assert.match(dark, /width="720"/);
  assert.match(light, />M1<[\s\S]*>M36</);
});

test("responsive tick density retains endpoints and does not alter trajectory geometry", () => {
  const dense = getCascadeGraphTickIndexes(36, 1400, [7, 20]);
  const compact = getCascadeGraphTickIndexes(36, 654, [7, 20]);
  assert.equal(dense[0], 0);
  assert.equal(dense.at(-1), 35);
  assert.equal(compact[0], 0);
  assert.equal(compact.at(-1), 35);
  assert.ok(compact.includes(7));
  assert.ok(compact.includes(20));
  assert.ok(compact.length < dense.length);
  assert.equal(resolveCascadeGraphX(0, 36, 720), 48);
  assert.equal(resolveCascadeGraphX(35, 36, 720), 702);
  assert.equal(resolveCascadeGraphX(7, 36, 720), 178.8);
});

test("desktop fits M1 through M36 without scroll while narrow width keeps a bounded fallback", () => {
  const desktopWidth = resolveCascadeGraphChartWidth({ executiveDemo: true, containerWidth: 1180, totalPeriods: 36 });
  const narrowWidth = resolveCascadeGraphChartWidth({ executiveDemo: true, containerWidth: 680, totalPeriods: 36 });
  assert.equal(desktopWidth, 1180);
  assert.equal(desktopWidth - 1180, 0);
  assert.equal(narrowWidth, 720);
  assert.equal(narrowWidth - 680, 40);
  assert.equal(resolveCascadeGraphChartWidth({ executiveDemo: false, containerWidth: 1180, totalPeriods: 8 }), 480);
  assert.equal(hasCascadeGraphOverflow(1180.8, 1180), false);
  assert.equal(hasCascadeGraphOverflow(1182, 1180), true);
  assert.equal(hasCascadeGraphOverflow(720, 680), true);
  assert.match(GRAPH, /overflowX: hasHorizontalOverflow \? "auto" : "hidden"/);
  assert.match(GRAPH, /\{hasHorizontalOverflow && \(/);
});

test("annotation layout uses deterministic lanes and clamps labels inside the frame", () => {
  const first = resolveCascadeAnnotationLayout({ anchorX: 48, chartWidth: 720, ordinal: 0 });
  const nearby = resolveCascadeAnnotationLayout({ anchorX: 66, chartWidth: 720, ordinal: 1 });
  const rightEdge = resolveCascadeAnnotationLayout({ anchorX: 702, chartWidth: 720, ordinal: 4 });
  assert.equal(first.lane, 0);
  assert.equal(nearby.lane, 1);
  assert.equal(rightEdge.lane, 1);
  assert.ok(first.labelX >= 54);
  assert.ok(rightEdge.labelX + 116 <= 720 - 12);
  const band = getCascadeGraphAnnotationBand(true);
  assert.equal(new Set(band.lanes).size, 3);
  assert.ok(band.lanes.every((lane) => lane > 0 && lane < band.topInset));
  assert.ok(band.headingY > 0 && band.headingY < band.topInset);
  assert.ok(band.headingY - band.lanes.at(-1)! >= 12);
  assert.match(GRAPH, /y=\{annotationBand\.headingY\}/);
});

test("rendered verification badges use readable Light and Dark styles", () => {
  for (const theme of ["light", "dark"] as const) {
    const style = getCascadeVerificationBadgeStyle(theme);
    const markup = renderToStaticMarkup(createElement("span", { style }, "Verified"));
    assert.match(markup, /font-size:12px/);
    assert.match(markup, /opacity:1/);
    assert.doesNotMatch(markup, /#98A2B3/i);
    const visual = getCascadeGraphPresentation(theme);
    assert.equal(style.color, visual.text);
    assert.ok(contrastRatio(style.color, style.background) >= 4.5);
  }
  assert.match(PAGE, /data-testid="executive-verification-badge"/);
  assert.match(PAGE, /getCascadeVerificationBadgeStyle\(uiTheme\)/);
});

test("stable frame does not reveal future narrative evidence", () => {
  const intermediate = renderExecutiveGraph("light", 8);
  assert.match(intermediate, /revealed marker/);
  assert.doesNotMatch(intermediate, /future marker/);
  assert.match(GRAPH, /monthIndex >= revealedSteps/);
});

test("Executive surfaces are semantic and scenario identities remain canonical", () => {
  assert.equal(CASCADE_PRESENTATION.scenarios.A.color, "#3B82F6");
  assert.equal(CASCADE_PRESENTATION.scenarios.B.color, "#F59E0B");
  assert.equal(CASCADE_PRESENTATION.scenarios.B.lineDash, "6 4");
  assert.doesNotMatch(AI, /linear-gradient/);
  assert.match(AI, /var\(--ce-surface-primary\)/);
  assert.match(PAGE, /background: semanticTheme\.subtleSurface/);
  assert.doesNotMatch(PAGE, /<ScenarioLibrary\b/);
});

test("supported desktop layout retains a safe stacking rule", () => {
  assert.match(PAGE, /@media \(max-width: 820px\)/);
  assert.match(PAGE, /grid-template-columns: minmax\(0, 1fr\) !important/);
  assert.match(PAGE, /maxWidth: "100%"/);
  assert.match(PAGE, /overflowX: "hidden"/);
});
