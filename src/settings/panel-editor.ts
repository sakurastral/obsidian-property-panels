import { Setting } from "obsidian";
import type PropertyPanelsPlugin from "../main";
import type { LayoutConfig, PanelConfig, PanelPosition } from "../types";
import { createField } from "./defaults";
import { clonePanel, createPanel, moveItem } from "./editor-utils";
import { renderFieldEditor } from "./field-editor";
import type { FolderSuggestAttacher } from "./folder-path-suggest";

const POSITIONS: PanelPosition[] = [
  "before-properties", "after-properties", "before-content",
  "after-content", "before-linked-mentions", "after-linked-mentions"
];

export function renderPanelEditor(
  parent: HTMLElement,
  panels: PanelConfig[],
  plugin: PropertyPanelsPlugin,
  rerender: () => void,
  attachFolderSuggest: FolderSuggestAttacher,
  options: { title: string; description?: string; allowEmpty?: boolean; scope?: string }
): void {
  const section = parent.createDiv({ cls: "property-panels-editor-section" });
  section.createEl("h3", { text: options.title });
  if (options.description) section.createEl("p", { text: options.description });
  new Setting(section).setName("Add panel").addButton((button) => button.setButtonText("Add").setCta().onClick(async () => {
    panels.push(createPanel());
    await plugin.saveSettings();
    rerender();
  }));
  if (panels.length === 0) section.createDiv({ text: options.allowEmpty ? "No panel overrides. The inherited panels remain unchanged." : "No panels configured.", cls: "property-panels-editor-empty" });

  panels.forEach((panel, index) => {
    const details = section.createEl("details", { cls: "property-panels-editor-panel" });
    details.dataset.propertyPanelsEditorKey = `${options.scope ?? "panels"}:panel:${panel.id}`;
    details.open = true;
    const summary = details.createEl("summary");
    summary.createSpan({ text: panel.name || "Unnamed panel" });
    summary.createSpan({ text: panel.enabled ? panel.position : "disabled", cls: "property-panels-editor-summary-meta" });
    const body = details.createDiv({ cls: "property-panels-editor-panel-body" });

    const actions = body.createDiv({ cls: "property-panels-editor-actions property-panels-editor-panel-actions" });
    button(actions, "↑", "Move panel up", index === 0, async () => { moveItem(panels, index, -1); await persist(plugin, rerender); });
    button(actions, "↓", "Move panel down", index === panels.length - 1, async () => { moveItem(panels, index, 1); await persist(plugin, rerender); });
    button(actions, "Duplicate", "Duplicate panel", false, async () => { panels.splice(index + 1, 0, clonePanel(panel)); await persist(plugin, rerender); });
    button(actions, "Delete", "Delete panel", false, async () => { panels.splice(index, 1); await persist(plugin, rerender); }, true);

    const grid = body.createDiv({ cls: "property-panels-editor-grid" });
    new Setting(grid).setName("Name").addText((text) => text.setValue(panel.name).onChange(async (value) => { panel.name = value; await plugin.saveSettings(); }));
    new Setting(grid).setName("Panel ID").setDesc("Folder rules use this ID to replace an inherited panel.").addText((text) => text.setValue(panel.id).onChange(async (value) => {
      if (value.trim()) { panel.id = value.trim(); await plugin.saveSettings(); }
    }));
    new Setting(grid).setName("Enabled").addToggle((toggle) => toggle.setValue(panel.enabled).onChange(async (value) => { panel.enabled = value; await plugin.saveSettings(); }));
    new Setting(grid).setName("Position").addDropdown((dropdown) => {
      POSITIONS.forEach((position) => dropdown.addOption(position, position));
      dropdown.setValue(panel.position).onChange(async (value) => { panel.position = value as PanelPosition; await plugin.saveSettings(); });
    });
    new Setting(grid).setName("CSS class").addText((text) => text.setValue(panel.cssClass ?? "").onChange(async (value) => {
      if (value.trim()) panel.cssClass = value.trim(); else delete panel.cssClass;
      await plugin.saveSettings();
    }));
    new Setting(grid).setName("Collapsible").addToggle((toggle) => toggle.setValue(panel.collapsible).onChange(async (value) => { panel.collapsible = value; await plugin.saveSettings(); rerender(); }));
    if (panel.collapsible) new Setting(grid).setName("Collapsed by default").addToggle((toggle) => toggle.setValue(panel.defaultCollapsed).onChange(async (value) => { panel.defaultCollapsed = value; await plugin.saveSettings(); }));

    renderLayoutOverrides(body, panel, plugin, rerender, options.scope ?? "panels");
    body.createEl("h4", { text: "Fields" });
    new Setting(body).setName("Add field").addButton((add) => add.setButtonText("Add").onClick(async () => {
      panel.fields.push(createField("property", "text"));
      await plugin.saveSettings();
      rerender();
    }));
    renderFieldEditor(body, panel.fields, plugin, rerender, attachFolderSuggest);
  });
}

function renderLayoutOverrides(parent: HTMLElement, panel: PanelConfig, plugin: PropertyPanelsPlugin, rerender: () => void, scope: string): void {
  const details = parent.createEl("details", { cls: "property-panels-editor-layout" });
  details.dataset.propertyPanelsEditorKey = `${scope}:panel-layout:${panel.id}`;
  details.createEl("summary", { text: "Panel layout override" });
  const body = details.createDiv();
  new Setting(body).setName("Override global layout").addToggle((toggle) => toggle.setValue(panel.layout !== undefined).onChange(async (value) => {
    if (value) panel.layout = {}; else delete panel.layout;
    await persist(plugin, rerender);
  }));
  if (!panel.layout) return;
  numberOverride(body, "Columns", panel.layout.columns, async (value) => { setOrDelete(panel.layout!, "columns", value); await plugin.saveSettings(); });
  dropdownOverride(body, "Density", panel.layout.density, { "": "Inherit", compact: "Compact", normal: "Normal", comfortable: "Comfortable" }, async (value) => {
    if (value) panel.layout!.density = value as LayoutConfig["density"]; else delete panel.layout!.density;
    await plugin.saveSettings();
  });
  dropdownOverride(body, "Label position", panel.layout.labelPosition, { "": "Inherit", top: "Top", left: "Left", inline: "Inline" }, async (value) => {
    if (value) panel.layout!.labelPosition = value as LayoutConfig["labelPosition"]; else delete panel.layout!.labelPosition;
    await plugin.saveSettings();
  });
  numberOverride(body, "Field gap", panel.layout.fieldGap, async (value) => { setOrDelete(panel.layout!, "fieldGap", value); await plugin.saveSettings(); });
}

function numberOverride(parent: HTMLElement, name: string, value: number | undefined, change: (value: number | undefined) => Promise<void>): void {
  new Setting(parent).setName(name).addText((text) => {
    text.inputEl.type = "number";
    text.setPlaceholder("Inherit").setValue(value === undefined ? "" : String(value)).onChange((next) => {
      const parsed = next.trim() === "" ? undefined : Number(next);
      if (parsed === undefined || Number.isFinite(parsed)) void change(parsed);
    });
  });
}
function dropdownOverride(parent: HTMLElement, name: string, value: string | undefined, options: Record<string, string>, change: (value: string) => Promise<void>): void {
  new Setting(parent).setName(name).addDropdown((dropdown) => dropdown.addOptions(options).setValue(value ?? "").onChange((next) => void change(next)));
}
function setOrDelete<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value === undefined) delete target[key]; else target[key] = value;
}
function button(parent: HTMLElement, text: string, label: string, disabled: boolean, action: () => Promise<void>, warning = false): void {
  const el = parent.createEl("button", { text, attr: { type: "button", "aria-label": label } });
  el.disabled = disabled;
  if (warning) el.addClass("mod-warning");
  el.addEventListener("click", (event) => { event.preventDefault(); void action(); });
}
const persist = async (plugin: PropertyPanelsPlugin, rerender: () => void): Promise<void> => { await plugin.saveSettings(); rerender(); };
