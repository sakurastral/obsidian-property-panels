import type { OptionSourceConfig, PanelConfig, PropertyFieldConfig } from "../types";

export const moveItem = <T>(items: T[], index: number, offset: -1 | 1): void => {
  const target = index + offset;
  if (target < 0 || target >= items.length) return;
  const current = items[index];
  const other = items[target];
  if (current === undefined || other === undefined) return;
  items[index] = other;
  items[target] = current;
};

export const cloneField = (field: PropertyFieldConfig): PropertyFieldConfig => ({
  ...structuredClone(field),
  id: crypto.randomUUID()
});

export const clonePanel = (panel: PanelConfig): PanelConfig => ({
  ...structuredClone(panel),
  id: crypto.randomUUID(),
  name: `${panel.name} copy`,
  fields: panel.fields.map(cloneField)
});

export const createPanel = (name = "New panel"): PanelConfig => ({
  id: crypto.randomUUID(),
  name,
  enabled: true,
  position: "after-properties",
  fields: [],
  showTitle: true,
  collapsible: false,
  defaultCollapsed: false
});

export const sourceForType = (type: OptionSourceConfig["type"]): OptionSourceConfig => {
  switch (type) {
    case "static": return { type, options: [] };
    case "file-property": return { type, path: "", property: "" };
    case "markdown-list": return { type, path: "" };
    case "folder": return { type, path: "", recursive: false, value: "basename", wikilink: true, sort: true };
    case "bases": return { type, path: "" };
  }
};

export const parseOptionalNumber = (value: string): number | undefined => {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
