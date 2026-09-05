import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const mediaSource = readFileSync("components/cascade-engine-media.ts", "utf8");
const homeSource = readFileSync("components/executive-home-page-content.tsx", "utf8");
const productSource = readFileSync("components/cascade-engine-page-content.tsx", "utf8");

const expectedAssets = [
  "/videos/cascade-engine-demo-sv.mp4",
  "/videos/cascade-engine-demo-en.mp4",
  "/images/cascade-engine-interface-sv.png",
  "/images/cascade-engine-interface-en.png",
  "/images/cascade-engine-structural-margin-sv.png",
  "/images/cascade-engine-structural-margin-en.png",
  "/images/cascade-engine-executive-proof-narrative-sv.png",
  "/images/cascade-engine-executive-proof-narrative-en.png",
];

test("the typed map contains every localized CE asset and every file exists", () => {
  for (const asset of expectedAssets) {
    assert.match(mediaSource, new RegExp(asset.replaceAll("/", "\\/")));
    assert.equal(existsSync(`public${asset}`), true, `${asset} should exist`);
  }
});

test("the homepage renders the locale-selected video and poster", () => {
  assert.match(homeSource, /const media = CASCADE_ENGINE_MEDIA\[lang\]/);
  assert.match(homeSource, /key=\{lang\}/);
  assert.match(homeSource, /poster=\{media\.interfacePreview\.src\}/);
  assert.match(homeSource, /<source src=\{media\.demoVideo\}/);
  assert.doesNotMatch(homeSource, /Demo01\.mp4/);
});

test("the homepage preserves its playback and layout contract", () => {
  for (const attribute of ["autoPlay", "muted", "loop", "playsInline", 'preload="metadata"']) {
    assert.match(homeSource, new RegExp(attribute));
  }
  assert.match(homeSource, /className="rounded-media"/);
  assert.match(homeSource, /aria-label=/);
});

test("the interface preview follows the selected locale", () => {
  assert.match(homeSource, /src=\{media\.interfacePreview\.src\}/);
  assert.match(homeSource, /alt=\{isSwedish/);
});

test("Structural Margin and proof narrative follow the selected locale", () => {
  assert.match(productSource, /src=\{media\.structuralMargin\.src\}/);
  assert.match(productSource, /src=\{media\.executiveProofNarrative\.src\}/);
  assert.match(productSource, /alt=\{copy\.margin\}/);
  assert.match(productSource, /alt=\{copy\.findings\}/);
});

test("no interactive Cascade Engine route is introduced", () => {
  assert.doesNotMatch(homeSource, /pilot-fastighet/);
  assert.doesNotMatch(productSource, /pilot-fastighet/);
});
