import type {
  BasePanelConfig, LabelDisplay, LayoutConfig, LongTextDisplay, PanelRule,
  NumberConfig, OptionItem, OptionSourceConfig, PanelConfig, PanelPosition,
  PluginSettings, ProgressConfig, PropertyFieldConfig, PropertyFieldType, RatingConfig,
  RuleMatchType, RulePanelConfig
} from "../types";
import { DEFAULT_SETTINGS } from "./defaults";

const FIELD_TYPES: PropertyFieldType[] = ["text", "textarea", "number", "toggle", "select", "multi-select", "date", "datetime", "progress", "rating", "readonly", "link", "divider"];
const POSITIONS: PanelPosition[] = ["before-properties", "after-properties", "before-content", "after-content", "before-linked-mentions", "after-linked-mentions"];
const LABELS: LabelDisplay[] = ["visible", "icon-only", "hidden"];
const LONG_TEXT_DISPLAYS: LongTextDisplay[] = ["wrap", "truncate"];
const DENSITIES: LayoutConfig["density"][] = ["compact", "normal", "comfortable"];
const LABEL_POSITIONS: LayoutConfig["labelPosition"][] = ["top", "left", "inline"];
const RULE_MATCH_TYPES: RuleMatchType[] = ["folder", "tag", "wikilink"];

export function normalizeSettings(input: unknown): PluginSettings {
  const source = record(input);
  const behavior = record(source.behavior);
  return {
    defaultConfig: normalizeBaseConfig(source.defaultConfig),
    rules: array(Array.isArray(source.rules) ? source.rules : source.folderRules).map(normalizeRule),
    behavior: {
      textSaveDelay: clamp(number(behavior.textSaveDelay, DEFAULT_SETTINGS.behavior.textSaveDelay), 100, 5000),
      deleteEmptyValues: boolean(behavior.deleteEmptyValues, DEFAULT_SETTINGS.behavior.deleteEmptyValues),
      showInSourceView: boolean(behavior.showInSourceView, DEFAULT_SETTINGS.behavior.showInSourceView),
      debugLogging: boolean(behavior.debugLogging, DEFAULT_SETTINGS.behavior.debugLogging)
    }
  };
}

function normalizeBaseConfig(input: unknown): BasePanelConfig {
  const source = record(input);
  return {
    panels: Array.isArray(source.panels) ? source.panels.map(normalizePanel) : structuredClone(DEFAULT_SETTINGS.defaultConfig.panels),
    layout: normalizeLayout(source.layout, DEFAULT_SETTINGS.defaultConfig.layout)
  };
}

function normalizePanel(input: unknown): PanelConfig {
  const source = record(input);
  const rawLayout = source.layout;
  const cssClass = optionalString(source.cssClass);
  return {
    id: nonEmptyString(source.id, crypto.randomUUID()),
    name: string(source.name, "Unnamed panel"),
    enabled: boolean(source.enabled, true),
    position: enumValue(source.position, POSITIONS, "after-properties"),
    fields: array(source.fields).map(normalizeField),
    showTitle: boolean(source.showTitle, true),
    collapsible: boolean(source.collapsible, false),
    defaultCollapsed: boolean(source.defaultCollapsed, false),
    ...(isRecord(rawLayout) ? { layout: normalizePartialLayout(rawLayout) } : {}),
    ...(cssClass ? { cssClass } : {})
  };
}

function normalizeField(input: unknown): PropertyFieldConfig {
  const source = record(input);
  const type = enumValue(source.type, FIELD_TYPES, "text");
  const divider = type === "divider";
  const label = optionalString(source.label);
  const supportsPlaceholder = type === "text" || type === "textarea";
  const placeholder = supportsPlaceholder ? optionalString(source.placeholder) : undefined;
  const optionSource = normalizeOptionSource(source.optionSource);
  const numberConfig = normalizeNumberConfig(source.number);
  const progress = normalizeProgress(source.progress);
  const rating = normalizeRating(source.rating);
  return {
    id: nonEmptyString(source.id, crypto.randomUUID()),
    property: divider ? string(source.property, "") : nonEmptyString(source.property, "property"),
    type,
    labelDisplay: divider ? "hidden" : enumValue(source.labelDisplay, LABELS, "visible"),
    editable: type === "readonly" || type === "link" || divider ? false : boolean(source.editable, true),
    visible: boolean(source.visible, true),
    showWhenEmpty: boolean(source.showWhenEmpty, true),
    longText: enumValue(source.longText, LONG_TEXT_DISPLAYS, "wrap"),
    columnSpan: clamp(Math.round(number(source.columnSpan, divider ? 12 : 1)), 1, 12),
    ...(!divider && label ? { label } : {}),
    ...(placeholder ? { placeholder } : {}),
    ...(typeof source.allowCustom === "boolean" ? { allowCustom: source.allowCustom } : {}),
    ...(optionSource ? { optionSource } : {}),
    ...(progress ? { progress } : {}),
    ...(rating ? { rating } : {}),
    ...(numberConfig ? { number: numberConfig } : {})
  };
}

function normalizeRule(input: unknown): PanelRule {
  const source = record(input);
  const matchType = enumValue(source.matchType, RULE_MATCH_TYPES, "folder");
  const legacyPath = string(source.path, "");
  return {
    id: nonEmptyString(source.id, crypto.randomUUID()),
    name: nonEmptyString(source.name, "Unnamed rule"),
    matchType,
    value: matchType === "folder"
      ? normalizePath(string(source.value, legacyPath))
      : normalizeRuleValue(string(source.value, legacyPath), matchType),
    enabled: boolean(source.enabled, true),
    matchMode: source.matchMode === "folder-only" ? "folder-only" : "folder-and-children",
    inheritance: source.inheritance === "replace" ? "replace" : "extend",
    priority: number(source.priority, 0),
    config: normalizeRuleConfig(source.config)
  };
}

function normalizeRuleConfig(input: unknown): RulePanelConfig {
  const source = record(input);
  const panels = Array.isArray(source.panels) ? source.panels.map(normalizePanel) : undefined;
  const layout = isRecord(source.layout) ? normalizePartialLayout(source.layout) : undefined;
  return { ...(panels ? { panels } : {}), ...(layout ? { layout } : {}) };
}

function normalizeLayout(input: unknown, fallback: LayoutConfig): LayoutConfig {
  const source = record(input);
  return {
    columns: clamp(Math.round(number(source.columns, fallback.columns)), 1, 12),
    density: enumValue(source.density, DENSITIES, fallback.density),
    labelPosition: enumValue(source.labelPosition, LABEL_POSITIONS, fallback.labelPosition),
    fieldGap: clamp(number(source.fieldGap, fallback.fieldGap ?? 10), 0, 100),
    panelGap: clamp(number(source.panelGap, fallback.panelGap ?? 12), 0, 100)
  };
}

function normalizePartialLayout(source: Record<string, unknown>): Partial<LayoutConfig> {
  const columns = optionalNumber(source.columns);
  const fieldGap = optionalNumber(source.fieldGap);
  const panelGap = optionalNumber(source.panelGap);
  const density = optionalEnum(source.density, DENSITIES);
  const labelPosition = optionalEnum(source.labelPosition, LABEL_POSITIONS);
  return {
    ...(columns !== undefined ? { columns: clamp(Math.round(columns), 1, 12) } : {}),
    ...(density ? { density } : {}),
    ...(labelPosition ? { labelPosition } : {}),
    ...(fieldGap !== undefined ? { fieldGap: clamp(fieldGap, 0, 100) } : {}),
    ...(panelGap !== undefined ? { panelGap: clamp(panelGap, 0, 100) } : {})
  };
}

function normalizeOptionSource(input: unknown): OptionSourceConfig | undefined {
  if (!isRecord(input)) return undefined;
  switch (input.type) {
    case "static":
      return { type: "static", options: array(input.options).map(normalizeOption).filter((item) => item.value !== "") };
    case "file-property":
      return { type: "file-property", path: string(input.path, ""), property: string(input.property, "") };
    case "markdown-list": {
      const heading = optionalString(input.heading);
      return { type: "markdown-list", path: string(input.path, ""), ...(heading ? { heading } : {}) };
    }
    case "folder": {
      const labelProperty = optionalString(input.labelProperty);
      const exclude = array(input.exclude).filter((item): item is string => typeof item === "string");
      return {
        type: "folder", path: string(input.path, ""), recursive: boolean(input.recursive, false),
        value: input.value === "path" ? "path" : "basename",
        wikilink: boolean(input.wikilink, true),
        sort: boolean(input.sort, true),
        ...(labelProperty ? { labelProperty } : {}), ...(exclude.length ? { exclude } : {})
      };
    }
    default:
      return undefined;
  }
}

function normalizeOption(input: unknown): OptionItem {
  const source = record(input);
  const value = string(source.value, "");
  const icon = optionalString(source.icon);
  return { value, label: string(source.label, value), ...(icon ? { icon } : {}) };
}
function normalizeNumberConfig(input: unknown): NumberConfig | undefined {
  if (!isRecord(input)) return undefined;
  const min = optionalNumber(input.min); const max = optionalNumber(input.max); const step = optionalNumber(input.step);
  return { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}), ...(step !== undefined ? { step } : {}) };
}
function normalizeProgress(input: unknown): ProgressConfig | undefined {
  if (!isRecord(input)) return undefined;
  const min = number(input.min, 0); const max = number(input.max, 100);
  return { min, max: max > min ? max : min + 100, step: Math.max(number(input.step, 1), 0.0001), display: input.display === "value" ? "value" : "percent", showValue: boolean(input.showValue, true) };
}
function normalizeRating(input: unknown): RatingConfig | undefined {
  if (!isRecord(input)) return undefined;
  return { max: clamp(Math.round(number(input.max, 5)), 1, 20), allowClear: boolean(input.allowClear, true) };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const record = (value: unknown): Record<string, unknown> => isRecord(value) ? value : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const string = (value: unknown, fallback: string): string => typeof value === "string" ? value : fallback;
const nonEmptyString = (value: unknown, fallback: string): string => typeof value === "string" && value.trim() ? value.trim() : fallback;
const optionalString = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;
const boolean = (value: unknown, fallback: boolean): boolean => typeof value === "boolean" ? value : fallback;
const number = (value: unknown, fallback: number): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const optionalNumber = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const enumValue = <T extends string>(value: unknown, values: readonly T[], fallback: T): T => typeof value === "string" && values.includes(value as T) ? value as T : fallback;
const optionalEnum = <T extends string>(value: unknown, values: readonly T[]): T | undefined => typeof value === "string" && values.includes(value as T) ? value as T : undefined;
const normalizePath = (value: string): string => value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
const normalizeRuleValue = (value: string, type: Exclude<RuleMatchType, "folder">): string => {
  const trimmed = value.trim();
  if (type === "tag") return trimmed.replace(/^#+/, "");
  const content = trimmed.startsWith("[[") && trimmed.endsWith("]]") ? trimmed.slice(2, -2) : trimmed;
  return content.split("|", 1)[0]?.trim() ?? "";
};
