import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repositoryRoot = process.cwd();
const isolatedWorldEngineRoot = path.join(
  repositoryRoot,
  "src",
  "worldEngine"
);

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

test("the legacy root play route is retired while the public-site redirect remains", () => {
  assert.equal(existsSync(path.join(repositoryRoot, "app/play/page.tsx")), false);
  assert.equal(existsSync(path.join(repositoryRoot, "app/play/layout.tsx")), false);

  const nestedRedirect = readFileSync(
    path.join(repositoryRoot, "01systems-site/app/play/page.tsx"),
    "utf8"
  );
  assert.match(nestedRedirect, /permanentRedirect\("\/"\)/);
});

test("active tracked root source does not import the isolated World Engine", () => {
  const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
  const importPattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;

  for (const relativeFile of trackedFiles()) {
    const absoluteFile = path.join(repositoryRoot, relativeFile);
    if (!existsSync(absoluteFile)) continue;
    if (relativeFile.startsWith("01systems-site/")) continue;
    if (relativeFile.startsWith("src/worldEngine/")) continue;
    if (!sourceExtensions.has(path.extname(relativeFile))) continue;

    const source = readFileSync(absoluteFile, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      assert.doesNotMatch(
        specifier,
        /^(?:@\/worldEngine(?:\/|$)|src\/worldEngine(?:\/|$))/,
        `${relativeFile} imports the isolated World Engine through ${specifier}`
      );

      if (specifier.startsWith(".")) {
        const resolved = path.resolve(path.dirname(absoluteFile), specifier);
        assert.equal(
          resolved === isolatedWorldEngineRoot ||
            resolved.startsWith(`${isolatedWorldEngineRoot}${path.sep}`),
          false,
          `${relativeFile} imports the isolated World Engine through ${specifier}`
        );
      }
    }
  }
});

test("the TypeScript boundary isolates World Engine but retains Cascade Engine", () => {
  const config = JSON.parse(
    readFileSync(path.join(repositoryRoot, "tsconfig.json"), "utf8")
  ) as { include: string[]; exclude: string[] };

  assert.ok(config.exclude.includes("src/worldEngine/**"));
  assert.ok(config.include.includes("app/**/*.tsx"));
  assert.ok(config.include.includes("src/**/*.ts"));
  assert.equal(config.exclude.some((entry) => entry.includes("pilotFastighet")), false);
  assert.equal(existsSync(path.join(repositoryRoot, "app/pilot-fastighet/page.tsx")), true);
  assert.ok(
    trackedFiles().some((file) => file.startsWith("src/pilotFastighet/")),
    "Cascade Engine analytical source must remain tracked"
  );
});

test("tracked source does not rely on ignored World Engine UI or Waterloo files", () => {
  const tracked = new Set(trackedFiles());
  const ignoredLocalDependencies = [
    "src/worldEngine/ui/SpawnDock.tsx",
    "src/worldEngine/ui/SelectionHUD.tsx",
    "src/worldEngine/ui/CommandFeedbackHUD.tsx",
    "src/worldEngine/ui/ScreenBoundsHUD.tsx",
    "src/worldEngine/ui/RightHUDStack.tsx",
    "src/worldEngine/ui/WaterlooPanel.tsx",
    "src/worldEngine/ui/components/PulseButton.tsx",
    "src/worldEngine/ui/components/PulsePanel.tsx",
    "src/worldEngine/ui/components/pulse-ui.css",
    "src/worldEngine/waterloo/waterlooTrigger.ts",
  ];

  for (const dependency of ignoredLocalDependencies) {
    assert.equal(tracked.has(dependency), false, `${dependency} must remain untracked`);
  }
});
