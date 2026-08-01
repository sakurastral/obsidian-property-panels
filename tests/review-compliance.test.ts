import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Community review compliance", () => {
  it("uses Node's native builtin module list", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as { devDependencies?: Record<string, string> };
    expect(packageJson.devDependencies).not.toHaveProperty("builtin-modules");
    expect(readProjectFile("esbuild.config.mjs")).toContain('from "node:module"');
  });

  it("uses declarative searchable settings", () => {
    const settingsTab = readProjectFile("src/settings/settings-tab.ts");
    expect(settingsTab).toContain("getSettingDefinitions()");
    expect(settingsTab).not.toMatch(/\bdisplay\s*\(/);
  });

  it("avoids flagged CSS overrides", () => {
    const styles = readProjectFile("styles.css");
    expect(styles).not.toContain("!important");
    expect(styles).not.toContain("text-decoration-line");
  });
});
