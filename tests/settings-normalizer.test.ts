import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/settings/settings-normalizer";

describe("settings normalization", () => {
  it("clamps behavior and layout values", () => {
    const result = normalizeSettings({
      behavior: { textSaveDelay: 10 },
      defaultConfig: { panels: [], layout: { columns: 99, density: "invalid", labelPosition: "left", fieldGap: -5 } }
    });
    expect(result.behavior.textSaveDelay).toBe(100);
    expect(result.behavior.showInSourceView).toBe(false);
    expect(result.behavior.deleteEmptyValues).toBe(false);
    expect(result.defaultConfig.layout.columns).toBe(12);
    expect(result.defaultConfig.layout.density).toBe("normal");
    expect(result.defaultConfig.layout.labelPosition).toBe("left");
    expect(result.defaultConfig.layout.fieldGap).toBe(0);
    expect(result.defaultConfig.panels).toEqual([]);
  });

  it("accepts end-aligned labels in global and inherited layouts", () => {
    const result = normalizeSettings({
      defaultConfig: {
        layout: { labelPosition: "left-end" },
        panels: [{ layout: { labelPosition: "left-end" }, fields: [] }]
      },
      rules: [{ config: { layout: { labelPosition: "left-end" } } }]
    });
    expect(result.defaultConfig.layout.labelPosition).toBe("left-end");
    expect(result.defaultConfig.panels[0]!.layout?.labelPosition).toBe("left-end");
    expect(result.rules[0]!.config.layout?.labelPosition).toBe("left-end");
  });

  it("preserves the new visibility preferences", () => {
    const result = normalizeSettings({
      behavior: { showInSourceView: false },
      defaultConfig: {
        layout: {},
        panels: [{ showTitle: false, showOnlyEmptyFields: true, fields: [{ type: "text", showWhenEmpty: false }] }]
      }
    });
    expect(result.behavior.showInSourceView).toBe(false);
    expect(result.defaultConfig.panels[0]!.showTitle).toBe(false);
    expect(result.defaultConfig.panels[0]!.showOnlyEmptyFields).toBe(true);
    expect(result.defaultConfig.panels[0]!.fields[0]!.showWhenEmpty).toBe(false);
  });

  it("keeps the panel empty-only filter opt-in", () => {
    const result = normalizeSettings({
      defaultConfig: { layout: {}, panels: [{ fields: [] }] }
    });
    expect(result.defaultConfig.panels[0]!.showOnlyEmptyFields).toBe(false);
  });

  it("normalizes dividers as full-width non-editable fields", () => {
    const result = normalizeSettings({
      defaultConfig: { layout: {}, panels: [{ fields: [{ type: "divider", property: "ignored", columnSpan: 99 }] }] }
    });
    expect(result.defaultConfig.panels[0]!.fields[0]).toMatchObject({
      type: "divider",
      property: "ignored",
      labelDisplay: "hidden",
      editable: false,
      columnSpan: 12
    });
  });

  it("keeps placeholders only for supported text inputs", () => {
    const result = normalizeSettings({
      defaultConfig: {
        layout: {},
        panels: [{ fields: [
          { type: "text", placeholder: "Text hint" },
          { type: "multi-select", placeholder: "Unused hint" }
        ] }]
      }
    });
    expect(result.defaultConfig.panels[0]!.fields[0]!.placeholder).toBe("Text hint");
    expect(result.defaultConfig.panels[0]!.fields[1]!.placeholder).toBeUndefined();
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
    expect(result.rules[0]).toMatchObject({ matchType: "folder", value: "Knowledge/Tools" });
    expect(result.rules[0]!.config.layout?.columns).toBe(1);
  });

  it("normalizes tag and wikilink rules", () => {
    const result = normalizeSettings({
      rules: [
        { matchType: "tag", value: "#project" },
        { matchType: "wikilink", value: "[[Notes/Welcome|Welcome]]" }
      ]
    });
    expect(result.rules[0]).toMatchObject({ matchType: "tag", value: "project" });
    expect(result.rules[1]).toMatchObject({ matchType: "wikilink", value: "Notes/Welcome" });
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

  it("accepts link fields as dedicated readonly link displays", () => {
    const result = normalizeSettings({
      defaultConfig: { layout: {}, panels: [{ fields: [{ type: "link", editable: true }] }] }
    });
    expect(result.defaultConfig.panels[0]!.fields[0]).toMatchObject({
      type: "link",
      editable: false
    });
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

  it("normalizes field label icon modes and icon names", () => {
    const result = normalizeSettings({
      defaultConfig: {
        layout: {},
        panels: [{ fields: [
          { type: "text", labelDisplay: "icon-label", icon: "bookmark" },
          { type: "text", labelDisplay: "unsupported", icon: "" }
        ] }]
      }
    });
    expect(result.defaultConfig.panels[0]!.fields[0]).toMatchObject({
      labelDisplay: "icon-label",
      icon: "bookmark"
    });
    expect(result.defaultConfig.panels[0]!.fields[1]).toMatchObject({
      labelDisplay: "visible",
      icon: "circle"
    });
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
