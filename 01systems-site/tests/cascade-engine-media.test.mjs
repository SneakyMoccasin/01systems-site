import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const mediaSource = readFileSync("components/cascade-engine-media.ts", "utf8");
const homeSource = readFileSync("components/executive-home-page-content.tsx", "utf8");
const productSource = readFileSync("components/cascade-engine-page-content.tsx", "utf8");
const lightboxSource = readFileSync("components/localized-media-lightbox.tsx", "utf8");

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
  assert.doesNotMatch(homeSource, /LocalizedMediaLightbox/);
  assert.doesNotMatch(homeSource, /Klicka för att förstora|Click to enlarge/);
});

test("the homepage video remains separate and unchanged", () => {
  assert.equal((homeSource.match(/<video/g) ?? []).length, 1);
  assert.doesNotMatch(homeSource, /<LocalizedMediaLightbox[^>]*demoVideo/s);
  assert.match(homeSource, /<video[\s\S]*?key=\{lang\}[\s\S]*?autoPlay[\s\S]*?muted[\s\S]*?loop[\s\S]*?playsInline[\s\S]*?preload="metadata"[\s\S]*?poster=\{media\.interfacePreview\.src\}[\s\S]*?<source src=\{media\.demoVideo\}/);
});

test("Structural Margin and proof narrative follow locale in the correct sections", () => {
  assert.match(productSource, /title=\{copy\.margin\}>.*image=\{media\.structuralMargin\}/s);
  assert.match(productSource, /title=\{copy\.findings\}><Bullets.*title=\{copy\.consequences\}>.*image=\{media\.executiveProofNarrative\}/s);
  assert.doesNotMatch(productSource, /title=\{copy\.findings\}>.*image=\{media\.executiveProofNarrative\}.*title=\{copy\.consequences\}>/s);
  assert.doesNotMatch(productSource, /cascade-engine-propagation-results\.png/);
});

test("enlarge help and accessible controls are localized", () => {
  assert.match(productSource, /enlarge: "Click to enlarge"/);
  assert.match(productSource, /enlarge: "Klicka för att förstora"/);
  assert.match(productSource, /alt=\{copy\.margin\}/);
  assert.match(productSource, /alt=\{copy\.consequencesAlt\}/);
});

test("the lightbox opens, closes and supports Escape and backdrop dismissal", () => {
  assert.match(lightboxSource, /onClick=\{openLightbox\}/);
  assert.match(lightboxSource, /event\.key === "Escape"/);
  assert.match(lightboxSource, /event\.target === event\.currentTarget/);
  assert.match(lightboxSource, /aria-modal="true"/);
  assert.match(lightboxSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(lightboxSource, /document\.body\.style\.overflow = previousOverflow/);
});

test("the CE lightbox provides bounded zoom, reset and panning", () => {
  assert.equal((productSource.match(/<LocalizedMediaLightbox/g) ?? []).length, 2);
  assert.equal((productSource.match(/<LocalizedMediaLightbox key=\{media\./g) ?? []).length, 2);
  assert.match(lightboxSource, /const MIN_ZOOM = 1/);
  assert.match(lightboxSource, /const MAX_ZOOM = 3/);
  assert.match(lightboxSource, /Math\.min\(MAX_ZOOM, Math\.max\(MIN_ZOOM, nextZoom\)\)/);
  assert.match(lightboxSource, /aria-label="Zoom out"/);
  assert.match(lightboxSource, /aria-label="Reset zoom to 100%"/);
  assert.match(lightboxSource, /aria-label="Zoom in"/);
  assert.match(lightboxSource, /setZoom\(MIN_ZOOM\)/);
  assert.match(lightboxSource, /viewport\.scrollLeft = 0/);
  assert.match(lightboxSource, /viewport\.scrollTop = 0/);
  assert.match(lightboxSource, /onPointerMove=/);
});

test("no interactive Cascade Engine route is introduced", () => {
  assert.doesNotMatch(homeSource, /pilot-fastighet/);
  assert.doesNotMatch(productSource, /pilot-fastighet/);
});
