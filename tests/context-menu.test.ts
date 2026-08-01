import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/property-panel.tsx"), "utf8");

describe("field context menus", () => {
  it("offers edit, copy, and clear actions for link fields", () => {
    expect(source).toMatch(/function LinkControl[\s\S]*?setTitle\("Edit value"\)[\s\S]*?setTitle\("Copy value"\)[\s\S]*?setTitle\("Clear value"\)/);
  });

  it("marks clear and remove actions as warnings", () => {
    expect(source).toMatch(/setTitle\("Clear value"\)\.setIcon\("trash"\)\.setWarning\(true\)/);
    expect(source).toMatch(/setTitle\("Remove"\)\.setIcon\("trash"\)\.setWarning\(true\)/);
  });
});
