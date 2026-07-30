import type { TFile } from "obsidian";

export type PanelPosition =
  | "before-properties" | "after-properties"
  | "before-content" | "after-content"
  | "before-linked-mentions" | "after-linked-mentions";
export type PropertyFieldType =
  | "text" | "textarea" | "number" | "toggle" | "select"
  | "multi-select" | "date" | "datetime" | "progress" | "rating" | "readonly" | "link" | "divider";
export type LabelDisplay = "visible" | "icon-label" | "icon-only" | "hidden";
export type LongTextDisplay = "wrap" | "truncate";
export type FolderMatchMode = "folder-only" | "folder-and-children";
export type RuleMatchType = "folder" | "tag" | "wikilink";

export interface OptionItem { value: string; label: string; icon?: string }
export type OptionSourceConfig =
  | { type: "static"; options: OptionItem[] }
  | { type: "file-property"; path: string; property: string }
  | { type: "markdown-list"; path: string; heading?: string }
  | { type: "folder"; path: string; recursive: boolean; value: "path" | "basename"; wikilink: boolean; labelProperty?: string; exclude?: string[]; sort: boolean };

export interface ProgressConfig {
  min: number; max: number; step: number;
  display: "percent" | "value"; showValue: boolean;
}
export interface RatingConfig { max: number; allowClear: boolean }
export interface NumberConfig { min?: number; max?: number; step?: number }
export interface PropertyFieldConfig {
  id: string; property: string; type: PropertyFieldType;
  label?: string; icon?: string; labelDisplay: LabelDisplay; editable: boolean; visible: boolean;
  longText: LongTextDisplay; columnSpan: number; showWhenEmpty: boolean;
  placeholder?: string; allowCustom?: boolean; optionSource?: OptionSourceConfig;
  progress?: ProgressConfig; rating?: RatingConfig; number?: NumberConfig;
}
export interface LayoutConfig {
  columns: number; density: "compact" | "normal" | "comfortable";
  labelPosition: "top" | "left" | "left-end" | "inline"; fieldGap?: number; panelGap?: number;
}
export interface PanelConfig {
  id: string; name: string; enabled: boolean; position: PanelPosition;
  fields: PropertyFieldConfig[]; layout?: Partial<LayoutConfig>;
  showTitle: boolean; collapsible: boolean; defaultCollapsed: boolean; cssClass?: string;
}
export interface BasePanelConfig { panels: PanelConfig[]; layout: LayoutConfig }
export interface RulePanelConfig { panels?: PanelConfig[]; layout?: Partial<LayoutConfig> }
export interface PanelRule {
  id: string; name: string; matchType: RuleMatchType; value: string; enabled: boolean;
  matchMode: FolderMatchMode; inheritance: "extend" | "replace";
  priority: number; config: RulePanelConfig;
}
export interface RuleMatchContext { path: string; tags: string[]; links: string[] }
export interface BehaviorSettings {
  textSaveDelay: number; deleteEmptyValues: boolean; showInSourceView: boolean; debugLogging: boolean;
}
export interface PluginSettings {
  defaultConfig: BasePanelConfig; rules: PanelRule[]; behavior: BehaviorSettings;
}
export interface ResolvedConfig { panels: PanelConfig[]; layout: LayoutConfig }
export interface OptionContext { file: TFile }
export interface OptionProvider {
  load(source: OptionSourceConfig, context: OptionContext): Promise<OptionItem[]>;
}
export type PropertyValue = string | number | boolean | string[] | null | undefined;
