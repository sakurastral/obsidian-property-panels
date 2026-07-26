import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/settings/settings-normalizer";

describe("settings normalization", () => {
  it("clamps behavior and layout values", () => {
    const result = normalizeSettings({
      behavior: { textSaveDelay: 10 },
      defaultConfig: { panels: [], layout: { columns: 99, density: "invalid", labelPosition: "left", fieldGap: -5 } }
    });
    expect(result.behavior.textSaveDelay).toBe(100);
    expect(result.defaultConfig.layout.columns).toBe(12);
    expect(result.defaultConfig.layout.density).toBe("normal");
    expect(result.defaultConfig.layout.labelPosition).toBe("left");
    expect(result.defaultConfig.layout.fieldGap).toBe(0);
    expect(result.defaultConfig.panels).toEqual([]);
  });

  it("normalizes panels, readonly fields, sources, and paths", () => {
    const result = normalizeSettings({
      defaultConfig: {
        layout: {},
        panels: [{
          id: "", name: "", position: "wrong", fields: [{
            id: "", property: "", type: "readonly", editable: true,
            optionSource: { type: "static", options: [{ value: "draft" }] }
          }]
        }]
      },
      folderRules: [{ path: "\\Knowledge//Tools/", inheritance: "replace", config: { layout: { columns: 0 } } }]
    });
    const panel = result.defaultConfig.panels[0]!;
    const field = panel.fields[0]!;
    expect(panel.name).toBe("");
    expect(panel.position).toBe("after-properties");
    expect(field.property).toBe("property");
    expect(field.editable).toBe(false);
    expect(field.optionSource).toEqual({ type: "static", options: [{ value: "draft", label: "draft" }] });
    expect(result.folderRules[0]!.path).toBe("Knowledge/Tools");
    expect(result.folderRules[0]!.config.layout?.columns).toBe(1);
  });

  it("drops unknown option-source types", () => {
    const result = normalizeSettings({
      defaultConfig: { layout: {}, panels: [{ fields: [{ type: "select", optionSource: { type: "unknown" } }] }] }
    });
    expect(result.defaultConfig.panels[0]!.fields[0]!.optionSource).toBeUndefined();
  });

  it("accepts date and datetime field types", () => {
    const result = normalizeSettings({
      defaultConfig: { layout: {}, panels: [{ fields: [{ type: "date" }, { type: "datetime" }] }] }
    });
    expect(result.defaultConfig.panels[0]!.fields.map((field) => field.type)).toEqual(["date", "datetime"]);
  });

  it("normalizes field long-value display modes", () => {
    const result = normalizeSettings({
      defaultConfig: {
        layout: {},
        panels: [{ fields: [{ type: "text", longText: "truncate" }, { type: "text", longText: "invalid" }] }]
      }
    });
    expect(result.defaultConfig.panels[0]!.fields.map((field) => field.longText)).toEqual(["truncate", "wrap"]);
  });

  it("defaults and clamps field column spans", () => {
    const result = normalizeSettings({
      defaultConfig: {
        layout: {},
        panels: [{ fields: [{ type: "text" }, { type: "text", columnSpan: 2 }, { type: "text", columnSpan: 99 }] }]
      }
    });
    expect(result.defaultConfig.panels[0]!.fields.map((field) => field.columnSpan)).toEqual([1, 2, 12]);
  });

  it("migrates folder sources to wikilink values by default", () => {
    const result = normalizeSettings({
      defaultConfig: {
        layout: {},
        panels: [{ fields: [{ type: "select", optionSource: {
          type: "folder", path: "Statuses", recursive: false, value: "basename", sort: true
        } }] }]
      }
    });
    expect(result.defaultConfig.panels[0]!.fields[0]!.optionSource).toMatchObject({
      type: "folder",
      wikilink: true
    });
  });
});
