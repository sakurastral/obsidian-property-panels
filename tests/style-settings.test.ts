import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface StyleSetting {
  id: string;
  type: string;
  default?: string | number;
  options?: Array<string | { label: string; value: string }>;
}
interface StyleSettingsDefinition { name: string; id: string; settings: StyleSetting[] }

const css = readFileSync(resolve(process.cwd(), "styles.css"), "utf8");
const yaml = css.match(/\/\*\s*@settings\s*\n([\s\S]*?)\*\//)?.[1] ?? "";
const definition = parse(yaml) as StyleSettingsDefinition;

describe("Style Settings definition", () => {
  it("is valid YAML with unique setting IDs", () => {
    expect(definition.name).toBe("Property Panels");
    const ids = definition.settings.map((setting) => setting.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("offers official Obsidian variables and custom color fallbacks", () => {
    const selects = definition.settings.filter((setting) => setting.type === "variable-select");
    const values = selects.flatMap((setting) => setting.options ?? []).map((option) => typeof option === "string" ? option : option.value);
    expect(values).toContain("var(--background-primary)");
    expect(values).toContain("var(--interactive-accent)");
    expect(values).toContain("var(--color-accent)");
    expect(values).toContain("var(--property-panels-background)");
  });

  it("keeps the default panel background transparent", () => {
    const background = definition.settings.find((setting) => setting.id === "property-panels-background-choice");
    expect(background?.default).toBe("transparent");
  });

  it("offers official Obsidian typography variables and a custom field value size", () => {
    const size = definition.settings.find((setting) => setting.id === "property-panels-field-value-size-choice");
    const values = (size?.options ?? []).map((option) => typeof option === "string" ? option : option.value);
    expect(size?.default).toBe("var(--font-text-size)");
    expect(values).toContain("var(--font-smallest)");
    expect(values).toContain("var(--font-smaller)");
    expect(values).toContain("var(--font-small)");
    expect(values).toContain("var(--font-ui-small)");
    expect(values).toContain("var(--property-panels-field-value-size-custom)");
  });

  it("offers a borderless field-input style", () => {
    const inputStyle = definition.settings.find((setting) => setting.id === "property-panels-field-input-style");
    const values = (inputStyle?.options ?? []).map((option) => typeof option === "string" ? option : option.value);
    expect(inputStyle?.default).toBe("property-panels-input-theme");
    expect(values).toContain("property-panels-input-borderless");
  });

  it("offers theme-aware field input text and background colors", () => {
    const text = definition.settings.find((setting) => setting.id === "property-panels-input-text-color-choice");
    const background = definition.settings.find((setting) => setting.id === "property-panels-input-background-choice");
    const textValues = (text?.options ?? []).map((option) => typeof option === "string" ? option : option.value);
    const backgroundValues = (background?.options ?? []).map((option) => typeof option === "string" ? option : option.value);
    expect(text?.default).toBe("var(--text-normal)");
    expect(textValues).toContain("var(--text-accent)");
    expect(textValues).toContain("var(--property-panels-input-text-custom)");
    expect(background?.default).toBe("var(--interactive-normal)");
    expect(backgroundValues).toContain("var(--background-primary)");
    expect(backgroundValues).toContain("var(--property-panels-input-background-custom)");
  });
});
