import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import type PropertyPanelsPlugin from "../main";
import type { LayoutConfig, PanelRule, RuleMatchContext } from "../types";
import { matchesRule } from "../config/config-resolver";
import { renderRuleEditor } from "./folder-rule-editor";
import { renderPanelEditor } from "./panel-editor";
import { FolderPathSuggest } from "./folder-path-suggest";
import { IconSuggest, type IconSuggestAttacher } from "./icon-suggest";
import { DEFAULT_SETTINGS } from "./defaults";
import { captureSettingsViewState, restoreSettingsViewState } from "./settings-view-state";

export class PropertyPanelsSettingTab extends PluginSettingTab {
  private readonly folderSuggests = new Set<FolderPathSuggest>();
  private readonly iconSuggests = new Set<IconSuggest>();
  constructor(app: App, private readonly plugin: PropertyPanelsPlugin) { super(app, plugin); }

  display(): void {
    this.closeSuggests();
    this.containerEl.empty();
    this.containerEl.addClass("property-panels-settings");
    this.containerEl.createEl("p", { text: "Configure editable frontmatter panels and note-specific rules. Changes are applied to every open Markdown view." });
    const rerender = this.rerenderPreservingViewState;

    this.renderBehavior();
    this.renderGlobalLayout();
    renderPanelEditor(this.containerEl, this.plugin.settings.defaultConfig.panels, this.plugin, rerender, this.attachFolderSuggest, this.attachIconSuggest, {
      title: "Default panels",
      description: "These panels are the starting configuration for every note.",
      scope: "default"
    });
    renderRuleEditor(this.containerEl, this.plugin, rerender, this.attachFolderSuggest, this.attachIconSuggest);
    this.renderRuleTester();
    this.renderDiagnostics();
    this.renderAdvancedJson();
  }

  private readonly rerenderPreservingViewState = (): void => {
    const state = captureSettingsViewState(this.containerEl);
    this.display();
    window.requestAnimationFrame(() => {
      restoreSettingsViewState(this.containerEl, state);
      window.requestAnimationFrame(() => restoreSettingsViewState(this.containerEl, state));
    });
  };

  hide(): void {
    this.closeSuggests();
    super.hide();
  }

  private readonly attachFolderSuggest = (input: HTMLInputElement, onSelect: (path: string) => void): void => {
    const suggest = new FolderPathSuggest(this.app, input, onSelect);
    this.folderSuggests.add(suggest);
    input.placeholder ||= "Start typing a vault folder…";
  };

  private readonly attachIconSuggest: IconSuggestAttacher = (input, onSelect) => {
    const suggest = new IconSuggest(this.app, input, onSelect);
    this.iconSuggests.add(suggest);
    input.placeholder ||= "Start typing an Obsidian icon…";
  };

  private closeSuggests(): void {
    for (const suggest of this.folderSuggests) suggest.close();
    for (const suggest of this.iconSuggests) suggest.close();
    this.folderSuggests.clear();
    this.iconSuggests.clear();
  }

  private renderBehavior(): void {
    const section = this.containerEl.createDiv({ cls: "property-panels-editor-section" });
    new Setting(section).setName("Behavior").setHeading();
    new Setting(section).setName("Text save delay").setDesc("Milliseconds to wait before saving text and textarea fields.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.setValue(String(this.plugin.settings.behavior.textSaveDelay)).onChange(async (value) => {
          const delay = Number(value);
          if (Number.isFinite(delay)) { this.plugin.settings.behavior.textSaveDelay = Math.max(100, Math.min(5000, delay)); await this.plugin.saveSettings(); }
        });
      });
    new Setting(section).setName("Delete empty values").setDesc("Remove the frontmatter key when a field is cleared.")
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.behavior.deleteEmptyValues).onChange(async (value) => {
        this.plugin.settings.behavior.deleteEmptyValues = value; await this.plugin.saveSettings();
      }));
    new Setting(section).setName("Show in source mode").setDesc("Display panels in plain Markdown source mode. Live preview is not affected.")
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.behavior.showInSourceView).onChange(async (value) => {
        this.plugin.settings.behavior.showInSourceView = value; await this.plugin.saveSettings();
      }));
    new Setting(section).setName("Debug logging").setDesc("Log placement fallbacks to the developer console.")
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.behavior.debugLogging).onChange(async (value) => {
        this.plugin.settings.behavior.debugLogging = value; await this.plugin.saveSettings();
      }));
  }

  private renderGlobalLayout(): void {
    const section = this.containerEl.createDiv({ cls: "property-panels-editor-section" });
    new Setting(section).setName("Default layout").setHeading();
    const layout = this.plugin.settings.defaultConfig.layout;
    new Setting(section).setName("Columns").addDropdown((dropdown) => dropdown.addOptions({ "1": "1", "2": "2", "3": "3", "4": "4" }).setValue(String(layout.columns)).onChange(async (value) => {
      layout.columns = Number(value); await this.plugin.saveSettings();
    }));
    new Setting(section).setName("Density").addDropdown((dropdown) => dropdown.addOptions({ compact: "Compact", normal: "Normal", comfortable: "Comfortable" }).setValue(layout.density).onChange(async (value) => {
      layout.density = value as LayoutConfig["density"]; await this.plugin.saveSettings();
    }));
    new Setting(section).setName("Label position").addDropdown((dropdown) => dropdown.addOptions({
      top: "Top", left: "Left", "left-end": "Left, align end", inline: "Inline"
    }).setValue(layout.labelPosition).onChange(async (value) => {
      layout.labelPosition = value as LayoutConfig["labelPosition"]; await this.plugin.saveSettings();
    }));
    numberSetting(section, "Field gap", layout.fieldGap ?? 10, async (value) => { layout.fieldGap = Math.max(0, value); await this.plugin.saveSettings(); });
    numberSetting(section, "Panel gap", layout.panelGap ?? 12, async (value) => { layout.panelGap = Math.max(0, value); await this.plugin.saveSettings(); });
  }

  private renderRuleTester(): void {
    const section = this.containerEl.createDiv({ cls: "property-panels-editor-section" });
    new Setting(section).setName("Rule tester").setHeading();
    let testPath = "";
    let testTags: string[] = [];
    let testLinks: string[] = [];
    const output = section.createEl("pre", { cls: "property-panels-rule-test" });
    const update = () => {
      const context: RuleMatchContext = { path: testPath, tags: testTags, links: testLinks };
      this.plugin.configResolver.clear();
      const matched = this.plugin.settings.rules
        .filter((rule) => rule.enabled && matchesRule(context, rule))
        .sort((a, b) => ruleDepth(a) - ruleDepth(b) || a.priority - b.priority);
      const resolved = this.plugin.configResolver.resolveContext(context);
      output.setText(`Matched rules:\n${matched.length ? matched.map((rule, i) => `${i + 1}. ${rule.name} (${rule.inheritance})`).join("\n") : "(default only)"}\n\nFinal panels:\n${resolved.panels.map((panel) => `${panel.enabled ? "✓" : "○"} ${panel.name}`).join("\n") || "(none)"}\n\nLayout:\n${resolved.layout.columns} column(s), ${resolved.layout.density}, labels ${resolved.layout.labelPosition}`);
    };
    new Setting(section).setName("Test note path").addText((text) => text.setPlaceholder("Knowledge/Tools/Obsidian.md").onChange((value) => { testPath = value; update(); }));
    new Setting(section).setName("Test tags").setDesc("Separate tags with commas or spaces.").addText((text) => text.setPlaceholder("Project, writing").onChange((value) => {
      testTags = value.split(/[\s,]+/).filter(Boolean);
      update();
    }));
    new Setting(section).setName("Test wikilinks").setDesc("Enter one target per line.").addTextArea((text) => text.setPlaceholder("[[notes/welcome]]").onChange((value) => {
      testLinks = value.split("\n").map((item) => item.trim()).filter(Boolean);
      update();
    }));
    update();
  }

  private renderAdvancedJson(): void {
    const details = this.containerEl.createEl("details", { cls: "property-panels-editor-section property-panels-advanced-json" });
    details.dataset.propertyPanelsEditorKey = "advanced-json";
    details.createEl("summary", { text: "Advanced JSON editor" });
    details.createEl("p", { text: "Use this for bulk changes or settings not exposed by the visual editor. Saving validates and normalizes the configuration." });
    new Setting(details).setName("Configuration tools")
      .addButton((button) => button.setButtonText("Copy JSON").onClick(async () => {
        try {
          await window.navigator.clipboard.writeText(JSON.stringify(this.plugin.settings, null, 2));
          new Notice("Property panels configuration copied.");
        } catch {
          new Notice("Clipboard unavailable. Copy the JSON from the editor below.");
        }
      }))
      .addButton((button) => {
        button.setButtonText("Restore defaults").onClick(() => {
          new RestoreDefaultsModal(this.app, async () => {
            this.plugin.settings = structuredClone(DEFAULT_SETTINGS);
            await this.plugin.saveSettings();
            this.display();
          }).open();
        });
        button.buttonEl.addClass("mod-warning");
      });
    const editor = details.createEl("textarea", { cls: "property-panels-settings-json" });
    editor.value = JSON.stringify(this.plugin.settings, null, 2);
    new Setting(details).addButton((button) => button.setCta().setButtonText("Validate and save").onClick(async () => {
      try {
        const parsed: unknown = JSON.parse(editor.value);
        this.plugin.settings = this.plugin.normalizeSettings(parsed);
        await this.plugin.saveSettings();
        this.display();
        new Notice("Property panels settings saved.");
      } catch (error) {
        new Notice(`Invalid settings: ${error instanceof Error ? error.message : String(error)}`);
      }
    }));
  }

  private renderDiagnostics(): void {
    const section = this.containerEl.createDiv({ cls: "property-panels-editor-section" });
    new Setting(section).setName("Diagnostics").setHeading();
    const diagnostics = this.plugin.getDiagnostics();
    section.createEl("pre", { text: JSON.stringify(diagnostics, null, 2), cls: "property-panels-rule-test" });
    new Setting(section).setName("Copy diagnostics").setDesc("Copies counts only; note paths and property values are not included.")
      .addButton((button) => button.setButtonText("Copy").onClick(() => void this.plugin.copyDiagnostics()));
  }
}

function numberSetting(parent: HTMLElement, name: string, value: number, change: (value: number) => Promise<void>): void {
  new Setting(parent).setName(name).addText((text) => {
    text.inputEl.type = "number";
    text.setValue(String(value)).onChange((next) => { const parsed = Number(next); if (Number.isFinite(parsed)) void change(parsed); });
  });
}
const ruleDepth = (rule: PanelRule): number => rule.matchType === "folder" ? rule.value.split("/").filter(Boolean).length : 0;

class RestoreDefaultsModal extends Modal {
  constructor(app: App, private readonly restore: () => Promise<void>) { super(app); }
  onOpen(): void {
    this.contentEl.createEl("h2", { text: "Restore property panels defaults?" });
    this.contentEl.createEl("p", { text: "This replaces every panel, field, note rule, and behavior setting. Copy the JSON configuration first if you may need it later." });
    const actions = this.contentEl.createDiv({ cls: "property-panels-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    const restore = actions.createEl("button", { text: "Restore defaults", cls: "mod-warning" });
    restore.addEventListener("click", () => {
      restore.disabled = true;
      void this.restore()
        .then(() => { new Notice("Property panels defaults restored."); this.close(); })
        .catch((error: unknown) => {
          restore.disabled = false;
          new Notice(`Unable to restore defaults: ${error instanceof Error ? error.message : String(error)}`);
        });
    });
  }
  onClose(): void { this.contentEl.empty(); }
}
