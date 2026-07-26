import { Setting } from "obsidian";
import type PropertyPanelsPlugin from "../main";
import type { FolderRule, LayoutConfig } from "../types";
import { createPanel, moveItem } from "./editor-utils";
import { renderPanelEditor } from "./panel-editor";
import type { FolderSuggestAttacher } from "./folder-path-suggest";

export function renderFolderRuleEditor(parent: HTMLElement, plugin: PropertyPanelsPlugin, rerender: () => void, attachFolderSuggest: FolderSuggestAttacher): void {
  const section = parent.createDiv({ cls: "property-panels-editor-section" });
  section.createEl("h3", { text: "Folder rules" });
  section.createEl("p", { text: "Rules are applied from shallower folders to deeper folders, then by priority at the same depth." });
  new Setting(section).setName("Add folder rule").addButton((button) => button.setButtonText("Add").setCta().onClick(async () => {
    plugin.settings.folderRules.push(createRule());
    await plugin.saveSettings();
    rerender();
  }));
  if (plugin.settings.folderRules.length === 0) section.createDiv({ text: "No folder rules. All notes use the default configuration.", cls: "property-panels-editor-empty" });

  plugin.settings.folderRules.forEach((rule, index) => {
    const details = section.createEl("details", { cls: "property-panels-editor-rule" });
    details.dataset.propertyPanelsEditorKey = `rule:${rule.id}`;
    const summary = details.createEl("summary");
    summary.createSpan({ text: rule.name || rule.path || "Unnamed rule" });
    summary.createSpan({ text: rule.enabled ? `${rule.inheritance} · ${rule.path || "/"}` : "disabled", cls: "property-panels-editor-summary-meta" });
    const body = details.createDiv({ cls: "property-panels-editor-rule-body" });
    const actions = body.createDiv({ cls: "property-panels-editor-actions" });
    button(actions, "↑", index === 0, async () => { moveItem(plugin.settings.folderRules, index, -1); await persist(plugin, rerender); });
    button(actions, "↓", index === plugin.settings.folderRules.length - 1, async () => { moveItem(plugin.settings.folderRules, index, 1); await persist(plugin, rerender); });
    button(actions, "Duplicate", false, async () => {
      const clone = structuredClone(rule);
      clone.id = crypto.randomUUID();
      clone.name = `${rule.name} copy`;
      if (clone.config.panels) {
        clone.config.panels = clone.config.panels.map((panel) => ({ ...panel, id: crypto.randomUUID(), fields: panel.fields.map((field) => ({ ...field, id: crypto.randomUUID() })) }));
      }
      plugin.settings.folderRules.splice(index + 1, 0, clone);
      await persist(plugin, rerender);
    });
    button(actions, "Delete", false, async () => { plugin.settings.folderRules.splice(index, 1); await persist(plugin, rerender); }, true);

    const grid = body.createDiv({ cls: "property-panels-editor-grid" });
    new Setting(grid).setName("Name").addText((text) => text.setValue(rule.name).onChange(async (value) => { rule.name = value; await plugin.saveSettings(); }));
    new Setting(grid).setName("Folder path").setDesc("Start typing to select a vault folder. Use an empty path for the vault root.").addText((text) => {
      text.setValue(rule.path).setPlaceholder("Knowledge/tools").onChange(async (value) => { rule.path = normalizePath(value); await plugin.saveSettings(); });
      attachFolderSuggest(text.inputEl, (path) => {
        rule.path = normalizePath(path);
        void plugin.saveSettings();
      });
    });
    new Setting(grid).setName("Enabled").addToggle((toggle) => toggle.setValue(rule.enabled).onChange(async (value) => { rule.enabled = value; await plugin.saveSettings(); }));
    new Setting(grid).setName("Match").addDropdown((dropdown) => dropdown.addOptions({ "folder-only": "Folder only", "folder-and-children": "Folder and children" }).setValue(rule.matchMode).onChange(async (value) => { rule.matchMode = value as FolderRule["matchMode"]; await plugin.saveSettings(); }));
    new Setting(grid).setName("Inheritance").addDropdown((dropdown) => dropdown.addOptions({ extend: "Extend", replace: "Replace" }).setValue(rule.inheritance).onChange(async (value) => { rule.inheritance = value as FolderRule["inheritance"]; await plugin.saveSettings(); rerender(); }));
    new Setting(grid).setName("Priority").setDesc("Higher numbers are applied later at the same folder depth.").addText((text) => {
      text.inputEl.type = "number";
      text.setValue(String(rule.priority)).onChange(async (value) => { const parsed = Number(value); if (Number.isFinite(parsed)) { rule.priority = parsed; await plugin.saveSettings(); } });
    });

    renderRuleLayout(body, rule, plugin, rerender);
    body.createEl("h4", { text: "Panel overrides" });
    body.createEl("p", { text: rule.inheritance === "extend" ? "Panels with matching IDs replace inherited panels; new IDs are appended." : "Only the panels listed here are used for this rule." });
    rule.config.panels ??= [];
    renderPanelEditor(body, rule.config.panels, plugin, rerender, attachFolderSuggest, { title: "Rule panels", allowEmpty: true, scope: `rule:${rule.id}` });
    if (rule.config.panels.length === 0) {
      new Setting(body).setName("Create starter panel").addButton((add) => add.setButtonText("Create").onClick(async () => {
        rule.config.panels = [createPanel(`${rule.name} panel`)];
        await persist(plugin, rerender);
      }));
    }
  });
}

function renderRuleLayout(parent: HTMLElement, rule: FolderRule, plugin: PropertyPanelsPlugin, rerender: () => void): void {
  const details = parent.createEl("details", { cls: "property-panels-editor-layout" });
  details.dataset.propertyPanelsEditorKey = `rule-layout:${rule.id}`;
  details.createEl("summary", { text: "Folder layout override" });
  const body = details.createDiv();
  new Setting(body).setName("Override inherited layout").addToggle((toggle) => toggle.setValue(rule.config.layout !== undefined).onChange(async (value) => {
    if (value) rule.config.layout = {}; else delete rule.config.layout;
    await persist(plugin, rerender);
  }));
  const layout = rule.config.layout;
  if (!layout) return;
  numeric(body, "Columns", layout.columns, async (value) => { if (value === undefined) delete layout.columns; else layout.columns = Math.max(1, Math.round(value)); await plugin.saveSettings(); });
  new Setting(body).setName("Density").addDropdown((dropdown) => dropdown.addOptions({ "": "Inherit", compact: "Compact", normal: "Normal", comfortable: "Comfortable" }).setValue(layout.density ?? "").onChange(async (value) => {
    if (value) layout.density = value as LayoutConfig["density"]; else delete layout.density;
    await plugin.saveSettings();
  }));
  new Setting(body).setName("Label position").addDropdown((dropdown) => dropdown.addOptions({ "": "Inherit", top: "Top", left: "Left", inline: "Inline" }).setValue(layout.labelPosition ?? "").onChange(async (value) => {
    if (value) layout.labelPosition = value as LayoutConfig["labelPosition"]; else delete layout.labelPosition;
    await plugin.saveSettings();
  }));
  numeric(body, "Field gap", layout.fieldGap, async (value) => { if (value === undefined) delete layout.fieldGap; else layout.fieldGap = value; await plugin.saveSettings(); });
  numeric(body, "Panel gap", layout.panelGap, async (value) => { if (value === undefined) delete layout.panelGap; else layout.panelGap = value; await plugin.saveSettings(); });
}

function createRule(): FolderRule {
  return { id: crypto.randomUUID(), name: "New folder rule", path: "", enabled: true, matchMode: "folder-and-children", inheritance: "extend", priority: 0, config: {} };
}
function normalizePath(value: string): string { return value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/"); }
function numeric(parent: HTMLElement, name: string, value: number | undefined, change: (value: number | undefined) => Promise<void>): void {
  new Setting(parent).setName(name).addText((text) => {
    text.inputEl.type = "number";
    text.setPlaceholder("Inherit").setValue(value === undefined ? "" : String(value)).onChange((next) => {
      const parsed = next.trim() === "" ? undefined : Number(next);
      if (parsed === undefined || Number.isFinite(parsed)) void change(parsed);
    });
  });
}
function button(parent: HTMLElement, text: string, disabled: boolean, action: () => Promise<void>, warning = false): void {
  const el = parent.createEl("button", { text, attr: { type: "button" } });
  el.disabled = disabled;
  if (warning) el.addClass("mod-warning");
  el.addEventListener("click", (event) => { event.preventDefault(); void action(); });
}
const persist = async (plugin: PropertyPanelsPlugin, rerender: () => void): Promise<void> => { await plugin.saveSettings(); rerender(); };
