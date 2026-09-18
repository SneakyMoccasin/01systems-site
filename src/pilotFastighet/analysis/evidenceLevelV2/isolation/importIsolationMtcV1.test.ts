import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const REPOSITORY_ROOT = process.cwd();
const MTC_MARKER = `${path.sep}evidenceLevelV2${path.sep}`;
const TEST_SUPPORT_MARKER = `${path.sep}testSupport${path.sep}`;

function sourceFilesUnder(relativeRoot: string): string[] {
  const root = path.join(REPOSITORY_ROOT, relativeRoot);
  const files: string[] = [];
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFilesUnder(path.relative(REPOSITORY_ROOT, absolute)));
    else if (/\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

const allFiles = [...sourceFilesUnder("app"), ...sourceFilesUnder("src")];
const configPath = ts.findConfigFile(REPOSITORY_ROOT, ts.sys.fileExists, "tsconfig.json");
assert.ok(configPath, "tsconfig.json must exist");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, REPOSITORY_ROOT);
const host: ts.ModuleResolutionHost = ts.sys;

function isTestFile(file: string): boolean {
  return /\.test\.tsx?$/.test(file);
}

function resolvedImports(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers: string[] = [];
  source.forEachChild((node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }
  });
  return specifiers.flatMap((specifier) => {
    const resolution = ts.resolveModuleName(specifier, file, parsed.options, host).resolvedModule;
    return resolution && !resolution.isExternalLibraryImport
      ? [path.resolve(resolution.resolvedFileName)]
      : [];
  });
}

const graph = new Map(allFiles.map((file) => [file, resolvedImports(file)]));

function reachableFrom(roots: readonly string[]): Set<string> {
  const reached = new Set<string>();
  const pending = [...roots];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (reached.has(current)) continue;
    reached.add(current);
    pending.push(...(graph.get(current) ?? []));
  }
  return reached;
}

test("V1 and application production modules cannot reach the Two-layer MTC", () => {
  const v1ProductionRoots = allFiles.filter(
    (file) => !file.includes(MTC_MARKER) && !isTestFile(file) && !file.includes(TEST_SUPPORT_MARKER),
  );
  const leaked = [...reachableFrom(v1ProductionRoots)].filter((file) => file.includes(MTC_MARKER));
  assert.deepEqual(leaked, []);
});
test("MTC production modules cannot import V1 analysis/runtime modules", () => {
  const mtcProduction = allFiles.filter(
    (file) => file.includes(MTC_MARKER) && !isTestFile(file) && !file.includes(TEST_SUPPORT_MARKER),
  );
  const escaped = mtcProduction.flatMap((file) =>
    (graph.get(file) ?? [])
      .filter((dependency) => !dependency.includes(MTC_MARKER))
      .map((dependency) => ({ file, dependency })),
  );
  assert.deepEqual(escaped, []);
});

test("production roots cannot reach test support", () => {
  const productionRoots = allFiles.filter(
    (file) => !isTestFile(file) && !file.includes(TEST_SUPPORT_MARKER),
  );
  const leaked = [...reachableFrom(productionRoots)].filter((file) => file.includes(TEST_SUPPORT_MARKER));
  assert.deepEqual(leaked, []);
});

test("application barrels, routes, and persistence have no MTC module edge", () => {
  const protectedFiles = allFiles.filter(
    (file) =>
      !file.includes(MTC_MARKER) &&
      (file.includes(`${path.sep}app${path.sep}`) ||
        /(?:^|\/|\\)index\.tsx?$/.test(file) ||
        file.endsWith(`${path.sep}savedRunPersistence.ts`)),
  );
  const edges = protectedFiles.flatMap((file) =>
    (graph.get(file) ?? [])
      .filter((dependency) => dependency.includes(MTC_MARKER))
      .map((dependency) => ({ file, dependency })),
  );
  assert.deepEqual(edges, []);
});

test("Layer 1 and the CP4A boundary cannot depend on Layer 2 evaluation", () => {
  const protectedMarkers = [
    `${MTC_MARKER}scenario${path.sep}`,
    `${MTC_MARKER}execution${path.sep}`,
    `${MTC_MARKER}observationSource${path.sep}`,
  ];
  const evaluationMarker = `${MTC_MARKER}observationEvaluation${path.sep}`;
  const protectedRoots = allFiles.filter(
    (file) =>
      !isTestFile(file) &&
      !file.includes(TEST_SUPPORT_MARKER) &&
      protectedMarkers.some((marker) => file.includes(marker)),
  );
  const leaked = [...reachableFrom(protectedRoots)].filter((file) =>
    file.includes(evaluationMarker),
  );
  assert.deepEqual(leaked, []);
});

test("CP1 through CP4 production modules cannot depend on CP5A read models", () => {
  const protectedMarkers = [
    `${MTC_MARKER}canonical${path.sep}`,
    `${MTC_MARKER}contract${path.sep}`,
    `${MTC_MARKER}scenario${path.sep}`,
    `${MTC_MARKER}execution${path.sep}`,
    `${MTC_MARKER}observationSource${path.sep}`,
    `${MTC_MARKER}observationEvaluation${path.sep}`,
  ];
  const cp5Markers = [
    `${MTC_MARKER}decisionSpace${path.sep}`,
    `${MTC_MARKER}singleRunResult${path.sep}`,
  ];
  const protectedRoots = allFiles.filter(
    (file) => !isTestFile(file) && !file.includes(TEST_SUPPORT_MARKER) && protectedMarkers.some((marker) => file.includes(marker)),
  );
  const leaked = [...reachableFrom(protectedRoots)].filter((file) => cp5Markers.some((marker) => file.includes(marker)));
  assert.deepEqual(leaked, []);
});
