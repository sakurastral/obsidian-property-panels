import type { PluginSettings, PropertyFieldConfig } from "../types";

export const createField = (property = "description", type: PropertyFieldConfig["type"] = "textarea"): PropertyFieldConfig => ({
  id: crypto.randomUUID(), property: type === "divider" ? "" : property, type,
  ...(type === "divider" ? {} : { label: property }),
  ...(type === "divider" ? {} : { icon: "circle" }),
  labelDisplay: type === "divider" ? "hidden" : "visible",
  editable: type !== "readonly" && type !== "link" && type !== "divider",
  visible: true, showWhenEmpty: true,
  longText: "wrap", columnSpan: type === "divider" ? 12 : 1,
  allowCustom: true
});

export const DEFAULT_SETTINGS: PluginSettings = {
  defaultConfig: {
    layout: { columns: 1, density: "normal", labelPosition: "top", fieldGap: 10, panelGap: 12 },
    panels: []
  },
  rules: [],
  behavior: { textSaveDelay: 500, deleteEmptyValues: false, showInSourceView: false, debugLogging: false }
};
