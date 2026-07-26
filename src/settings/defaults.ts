import type { PluginSettings, PropertyFieldConfig } from "../types";

export const createField = (property = "description", type: PropertyFieldConfig["type"] = "textarea"): PropertyFieldConfig => ({
  id: crypto.randomUUID(), property, type, label: property,
  labelDisplay: "visible", editable: type !== "readonly", visible: true,
  longText: "wrap", columnSpan: 1,
  allowCustom: true
});

export const DEFAULT_SETTINGS: PluginSettings = {
  defaultConfig: {
    layout: { columns: 1, density: "normal", labelPosition: "top", fieldGap: 10, panelGap: 12 },
    panels: [{
      id: "summary", name: "Summary", enabled: true, position: "after-properties",
      fields: [createField()], collapsible: false, defaultCollapsed: false
    }]
  },
  folderRules: [],
  behavior: { textSaveDelay: 500, deleteEmptyValues: true, debugLogging: false }
};
