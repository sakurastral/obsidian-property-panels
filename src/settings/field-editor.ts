import { Setting } from "obsidian";
import type PropertyPanelsPlugin from "../main";
import type { OptionItem, OptionSourceConfig, PropertyFieldConfig, PropertyFieldType } from "../types";
import { cloneField, moveItem, parseOptionalNumber, sourceForType } from "./editor-utils";
import type { FolderSuggestAttacher } from "./folder-path-suggest";

const FIELD_TYPES: PropertyFieldType[] = ["text", "textarea", "number", "toggle", "select", "multi-select", "date", "datetime", "progress", "rating", "readonly", "divider"];
const SOURCE_TYPES: OptionSourceConfig["type"][] = ["static", "file-property", "markdown-list", "folder", "bases"];

export function renderFieldEditor(
  parent: HTMLElement,
  fields: PropertyFieldConfig[],
  plugin: PropertyPanelsPlugin,
  rerender: () => void,
  attachFolderSuggest: FolderSuggestAttacher
): void {
  const list = parent.createDiv({ cls: "property-panels-editor-list property-panels-field-editor-list" });
  fields.forEach((field, index) => {
    const divider = field.type === "divider";
    const card = list.createDiv({ cls: "property-panels-editor-card property-panels-field-editor" });
    const header = card.createDiv({ cls: "property-panels-editor-card-header" });
    header.createEl("strong", { text: divider ? "Horizontal divider" : field.label || field.property || "Unnamed field" });
    const actions = header.createDiv({ cls: "property-panels-editor-actions" });
    actionButton(actions, "↑", "Move field up", index === 0, async () => { moveItem(fields, index, -1); await persist(plugin, rerender); });
    actionButton(actions, "↓", "Move field down", index === fields.length - 1, async () => { moveItem(fields, index, 1); await persist(plugin, rerender); });
    actionButton(actions, "Copy", "Duplicate field", false, async () => { fields.splice(index + 1, 0, cloneField(field)); await persist(plugin, rerender); });
    actionButton(actions, "Delete", "Delete field", false, async () => { fields.splice(index, 1); await persist(plugin, rerender); }, true);

    const grid = card.createDiv({ cls: "property-panels-editor-grid" });
    if (!divider) {
      new Setting(grid).setName("Property").addText((text) => text.setValue(field.property).setPlaceholder("Description").onChange(async (value) => {
        field.property = value.trim(); await plugin.saveSettings();
      }));
      new Setting(grid).setName("Label").addText((text) => text.setValue(field.label ?? "").setPlaceholder(field.property).onChange(async (value) => {
        if (value.trim()) field.label = value; else delete field.label;
        await plugin.saveSettings();
      }));
    }
    new Setting(grid).setName("Type").addDropdown((dropdown) => {
      FIELD_TYPES.forEach((type) => { dropdown.addOption(type, type); });
      dropdown.setValue(field.type).onChange(async (value) => {
        const wasDivider = field.type === "divider";
        field.type = value as PropertyFieldType;
        field.editable = field.type !== "readonly" && field.type !== "divider";
        if (field.type === "divider") {
          field.property = "";
          field.labelDisplay = "hidden";
          field.columnSpan = 12;
          delete field.label;
          delete field.placeholder;
        } else if (wasDivider) {
          field.property = "property";
          field.labelDisplay = "visible";
          field.columnSpan = 1;
        }
        await persist(plugin, rerender);
      });
    });
    if (!divider) {
      new Setting(grid).setName("Label display").addDropdown((dropdown) => dropdown
        .addOptions({ visible: "Visible", "icon-only": "Icon only", hidden: "Hidden" })
        .setValue(field.labelDisplay).onChange(async (value) => { field.labelDisplay = value as PropertyFieldConfig["labelDisplay"]; await plugin.saveSettings(); }));
    }
    new Setting(grid).setName("Visible").addToggle((toggle) => toggle.setValue(field.visible).onChange(async (value) => { field.visible = value; await plugin.saveSettings(); }));
    if (!divider) {
      new Setting(grid).setName("Show when empty").setDesc("Keep this field visible when its frontmatter value is empty.")
        .addToggle((toggle) => toggle.setValue(field.showWhenEmpty).onChange(async (value) => { field.showWhenEmpty = value; await plugin.saveSettings(); }));
      new Setting(grid).setName("Editable").addToggle((toggle) => toggle.setValue(field.editable).setDisabled(field.type === "readonly").onChange(async (value) => { field.editable = value; await plugin.saveSettings(); }));
    }
    new Setting(grid)
      .setName("Column span")
      .setDesc("Number of panel grid columns occupied. Limited by the panel's column count.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = "12";
        text.inputEl.step = "1";
        text.setValue(String(field.columnSpan)).onChange(async (value) => {
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            field.columnSpan = Math.max(1, Math.min(12, Math.round(parsed)));
            await plugin.saveSettings();
          }
        });
      });
    if (!divider) {
      new Setting(grid).setName("Long value display").addDropdown((dropdown) => dropdown
        .addOptions({ wrap: "Wrap long words", truncate: "Truncate with ellipsis" })
        .setValue(field.longText)
        .onChange(async (value) => {
          field.longText = value as PropertyFieldConfig["longText"];
          await plugin.saveSettings();
        }));
    }
    if (field.type === "text" || field.type === "textarea") {
      new Setting(grid).setName("Placeholder").addText((text) => text.setValue(field.placeholder ?? "").onChange(async (value) => {
        if (value) field.placeholder = value; else delete field.placeholder;
        await plugin.saveSettings();
      }));
    }
    if (!divider) renderTypeSettings(card, field, plugin, rerender, attachFolderSuggest);
  });
}

function renderTypeSettings(card: HTMLElement, field: PropertyFieldConfig, plugin: PropertyPanelsPlugin, rerender: () => void, attachFolderSuggest: FolderSuggestAttacher): void {
  if (field.type === "number") {
    field.number ??= {};
    const advanced = card.createDiv({ cls: "property-panels-editor-subsection" });
    advanced.createEl("h6", { text: "Number settings" });
    numberSetting(advanced, "Minimum", field.number.min, async (value) => { if (value === undefined) delete field.number?.min; else field.number!.min = value; await plugin.saveSettings(); });
    numberSetting(advanced, "Maximum", field.number.max, async (value) => { if (value === undefined) delete field.number?.max; else field.number!.max = value; await plugin.saveSettings(); });
    numberSetting(advanced, "Step", field.number.step, async (value) => { if (value === undefined) delete field.number?.step; else field.number!.step = value; await plugin.saveSettings(); });
  }
  if (field.type === "progress") {
    field.progress ??= { min: 0, max: 100, step: 1, display: "percent", showValue: true };
    const progress = field.progress;
    const advanced = card.createDiv({ cls: "property-panels-editor-subsection" });
    advanced.createEl("h6", { text: "Progress settings" });
    numberSetting(advanced, "Minimum", progress.min, async (value) => { progress.min = value ?? 0; await plugin.saveSettings(); });
    numberSetting(advanced, "Maximum", progress.max, async (value) => { progress.max = value ?? 100; await plugin.saveSettings(); });
    numberSetting(advanced, "Step", progress.step, async (value) => { progress.step = value ?? 1; await plugin.saveSettings(); });
    new Setting(advanced).setName("Display").addDropdown((dropdown) => dropdown.addOptions({ percent: "Percent", value: "Raw value" }).setValue(progress.display).onChange(async (value) => { progress.display = value as "percent" | "value"; await plugin.saveSettings(); }));
    new Setting(advanced).setName("Show value").addToggle((toggle) => toggle.setValue(progress.showValue).onChange(async (value) => { progress.showValue = value; await plugin.saveSettings(); }));
  }
  if (field.type === "rating") {
    field.rating ??= { max: 5, allowClear: true };
    const rating = field.rating;
    const advanced = card.createDiv({ cls: "property-panels-editor-subsection" });
    advanced.createEl("h6", { text: "Rating settings" });
    numberSetting(advanced, "Maximum rating", rating.max, async (value) => { rating.max = Math.max(1, Math.round(value ?? 5)); await plugin.saveSettings(); });
    new Setting(advanced).setName("Allow clear").addToggle((toggle) => toggle.setValue(rating.allowClear).onChange(async (value) => { rating.allowClear = value; await plugin.saveSettings(); }));
  }
  if (field.type === "select" || field.type === "multi-select") renderOptionSource(card, field, plugin, rerender, attachFolderSuggest);
}

function renderOptionSource(card: HTMLElement, field: PropertyFieldConfig, plugin: PropertyPanelsPlugin, rerender: () => void, attachFolderSuggest: FolderSuggestAttacher): void {
  field.optionSource ??= sourceForType("static");
  const source = field.optionSource;
  const advanced = card.createDiv({ cls: "property-panels-editor-subsection" });
  advanced.createEl("h6", { text: "Option source" });
  new Setting(advanced).setName("Source type").addDropdown((dropdown) => {
    SOURCE_TYPES.forEach((type) => { dropdown.addOption(type, type === "bases" ? "Bases cache (experimental)" : type); });
    dropdown.setValue(source.type).onChange(async (value) => { field.optionSource = sourceForType(value as OptionSourceConfig["type"]); await persist(plugin, rerender); });
  });
  if (field.type === "multi-select") {
    new Setting(advanced).setName("Allow custom values").addToggle((toggle) => toggle.setValue(field.allowCustom ?? true).onChange(async (value) => { field.allowCustom = value; await plugin.saveSettings(); }));
  }
  if (source.type === "static") {
    const setting = new Setting(advanced).setName("Options").setDesc("One option per line. Use value | label for a custom label.");
    setting.addTextArea((area) => area.setValue(formatOptions(source.options)).setPlaceholder("One option per line").onChange(async (value) => {
      source.options = parseOptions(value); await plugin.saveSettings();
    }));
  } else {
    new Setting(advanced).setName(source.type === "folder" ? "Folder path" : source.type === "bases" ? "Base cache key" : "File path")
      .setDesc(source.type === "folder" ? "Start typing to select a folder from this Vault." : source.type === "bases" ? "Must match the cache key configured in the Property Panels Options Bases view." : "")
      .addText((text) => {
        text.setValue(source.path).onChange(async (value) => { source.path = value.trim(); await plugin.saveSettings(); });
        if (source.type === "folder") {
          attachFolderSuggest(text.inputEl, (path) => {
            source.path = path;
            void plugin.saveSettings();
          });
        }
      });
    if (source.type === "file-property") {
      new Setting(advanced).setName("Property").addText((text) => text.setValue(source.property).onChange(async (value) => { source.property = value.trim(); await plugin.saveSettings(); }));
    } else if (source.type === "markdown-list") {
      new Setting(advanced).setName("Heading").setDesc("Leave blank to read every list in the file.").addText((text) => text.setValue(source.heading ?? "").onChange(async (value) => {
        if (value.trim()) source.heading = value.trim(); else delete source.heading;
        await plugin.saveSettings();
      }));
    } else if (source.type === "folder") {
      new Setting(advanced).setName("Include subfolders").addToggle((toggle) => toggle.setValue(source.recursive).onChange(async (value) => { source.recursive = value; await plugin.saveSettings(); }));
      new Setting(advanced).setName("Value").addDropdown((dropdown) => dropdown.addOptions({ basename: "Basename", path: "Full path" }).setValue(source.value).onChange(async (value) => { source.value = value as "path" | "basename"; await plugin.saveSettings(); }));
      new Setting(advanced).setName("Store as wikilink").setDesc("Write selected notes as [[note]] links while displaying their labels without brackets.")
        .addToggle((toggle) => toggle.setValue(source.wikilink).onChange(async (value) => { source.wikilink = value; await plugin.saveSettings(); }));
      new Setting(advanced).setName("Label property").addText((text) => text.setValue(source.labelProperty ?? "").onChange(async (value) => {
        if (value.trim()) source.labelProperty = value.trim(); else delete source.labelProperty;
        await plugin.saveSettings();
      }));
      new Setting(advanced).setName("Sort by label").addToggle((toggle) => toggle.setValue(source.sort).onChange(async (value) => { source.sort = value; await plugin.saveSettings(); }));
      new Setting(advanced).setName("Excluded files").setDesc("One full vault path per line.").addTextArea((area) => area.setValue((source.exclude ?? []).join("\n")).onChange(async (value) => {
        const paths = value.split("\n").map((item) => item.trim()).filter(Boolean);
        if (paths.length) source.exclude = paths; else delete source.exclude;
        await plugin.saveSettings();
      }));
    }
  }
}

function actionButton(parent: HTMLElement, text: string, label: string, disabled: boolean, action: () => Promise<void>, warning = false): void {
  const button = parent.createEl("button", { text, attr: { "aria-label": label, type: "button" } });
  button.disabled = disabled;
  if (warning) button.addClass("mod-warning");
  button.addEventListener("click", () => void action());
}
function numberSetting(parent: HTMLElement, name: string, value: number | undefined, action: (value: number | undefined) => Promise<void>): void {
  new Setting(parent).setName(name).addText((text) => {
    text.inputEl.type = "number";
    text.setValue(value === undefined ? "" : String(value)).onChange((next) => void action(parseOptionalNumber(next)));
  });
}
const formatOptions = (options: OptionItem[]): string => options.map((item) => item.label === item.value ? item.value : `${item.value} | ${item.label}`).join("\n");
const parseOptions = (value: string): OptionItem[] => value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
  const [rawValue, ...rawLabel] = line.split("|");
  const optionValue = (rawValue ?? "").trim();
  const label = rawLabel.join("|").trim() || optionValue;
  return { value: optionValue, label };
});
const persist = async (plugin: PropertyPanelsPlugin, rerender: () => void): Promise<void> => { await plugin.saveSettings(); rerender(); };
