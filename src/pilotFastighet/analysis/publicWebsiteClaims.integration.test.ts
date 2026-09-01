import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const HOME_PAGE = readFileSync(
  "01systems-site/components/executive-home-page-content.tsx",
  "utf8"
);
const ARCHITECTURE_PAGE = readFileSync(
  "01systems-site/components/architecture-page-content.tsx",
  "utf8"
);
const DSA_ARTICLES = readFileSync(
  "01systems-site/data/insights.json",
  "utf8"
);
const SHARED_CTA = readFileSync(
  "01systems-site/components/site-cta.tsx",
  "utf8"
);
const CASCADE_ENGINE_PAGE = readFileSync(
  "01systems-site/components/cascade-engine-page-content.tsx",
  "utf8"
);
const HEADER = readFileSync("01systems-site/components/site-header.tsx", "utf8");
const FOOTER = readFileSync("01systems-site/components/site-footer.tsx", "utf8");
const ACTIVE_HOME_ROUTE = readFileSync("01systems-site/app/page.tsx", "utf8");

const ACTIVE_PRIMARY_CTA_SOURCES = [
  HOME_PAGE,
  SHARED_CTA,
  CASCADE_ENGINE_PAGE,
  HEADER,
  FOOTER,
];

test("active homepage states the bounded configured-model sequencing capability", () => {
  assert.match(HOME_PAGE, /Within a configured model, Cascade Engine can compare the same starting conditions and actions in different orders or at different times/);
  assert.match(HOME_PAGE, /showing where the modelled paths diverge and whether they later converge/);
  assert.match(HOME_PAGE, /Inom en konfigurerad modell kan Cascade Engine jämföra samma startförhållanden och åtgärder i olika ordning eller vid olika tidpunkter/);
  assert.match(HOME_PAGE, /visa var de modellerade vägarna skiljer sig och om de senare konvergerar/);
  assert.match(ACTIVE_HOME_ROUTE, /ExecutiveHomePageContent/);
  assert.match(HOME_PAGE, /<source src="\/videos\/Demo01\.mp4" type="video\/mp4"/);
  assert.match(HOME_PAGE, /Autoplaying Cascade Engine demonstration/);
  assert.match(HOME_PAGE, /Autospelande demonstration av Cascade Engine/);
  assert.doesNotMatch(HOME_PAGE, /video[^\n]*(same starting conditions|samma startförhållanden)/i);
});

test("architecture describes configured relationships and propagation without enumerating paths", () => {
  assert.match(ARCHITECTURE_PAGE, /represented states and effects propagate through explicitly configured structural relationships/);
  assert.match(ARCHITECTURE_PAGE, /representerade tillstånd och effekter sprids genom uttryckligen konfigurerade strukturella samband/);
  assert.doesNotMatch(ARCHITECTURE_PAGE, /increasing structural dependencies|how dependencies develop|narrowing available execution paths/);
  assert.doesNotMatch(ARCHITECTURE_PAGE, /öka strukturella beroenden|hur beroenden utvecklas|minska antalet tillgängliga vägar/);
  assert.match(ARCHITECTURE_PAGE, /does not enumerate every future choice/);
  assert.match(ARCHITECTURE_PAGE, /räknar inte upp alla framtida val/);
});

test("DSA article uses configured timing, capacities, and constraints rather than general resource allocation", () => {
  assert.doesNotMatch(DSA_ARTICLES, /alternative sequences and resource allocations affect the represented decision space/);
  assert.match(DSA_ARTICLES, /configured action timing and order, represented capacities and configured constraints affect the represented decision space within the model/);
});

test("all active primary CTA sources use the canonical labels and contact destination", () => {
  for (const source of ACTIVE_PRIMARY_CTA_SOURCES) {
    assert.match(source, /Book an initial conversation/);
    assert.match(source, /Boka ett inledande samtal/);
    assert.match(source, /mailto:christian@01systems\.se/);
    assert.doesNotMatch(source, /\/pilot-fastighet|Book a walkthrough|Boka en genomgång|self-service trial|demo access/i);
  }
});

test("website claim gate does not activate the legacy homepage", () => {
  assert.doesNotMatch(ACTIVE_HOME_ROUTE, /@\/components\/home-page-content/);
  assert.match(ACTIVE_HOME_ROUTE, /ExecutiveHomePageContent/);
});
