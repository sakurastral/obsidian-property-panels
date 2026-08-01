import { App, Modal, Notice, PluginSettingTab, Setting, type SettingDefinitionItem, type SettingDefinitionRender } from "obsidian";
import type PropertyPanelsPlugin from "../main";
import type { PanelRule, RuleMatchContext } from "../types";
import { matchesRule } from "../config/config-resolver";
import { renderRuleEditor } from "./folder-rule-editor";
import { renderPanelEditor } from "./panel-editor";
import { FolderPathSuggest } from "./folder-path-suggest";
import { IconSuggest, type IconSuggestAttacher } from "./icon-suggest";
import { DEFAULT_SETTINGS } from "./defaults";
import { captureSettingsViewState, restoreSettingsViewState } from "./settings-view-state";

type PropertyPanelsSettingKey =
  | "behavior.textSaveDelay"
  | "behavior.deleteEmptyValues"
  | "behavior.showInSourceView"
  | "behavior.debugLogging"
  | "layout.columns"
  | "layout.density"
  | "layout.labelPosition"
  | "layout.fieldGap"
  | "layout.panelGap";

export class PropertyPanelsSettingTab extends PluginSettingTab {
  private readonly folderSuggests = new Set<FolderPathSuggest>();
  private readonly iconSuggests = new Set<IconSuggest>();
  constructor(app: App, private readonly plugin: PropertyPanelsPlugin) {
    super(app, plugin);
    this.containerEl.addClass("property-panels-settings");
  }

  getSettingDefinitions(): SettingDefinitionItem<PropertyPanelsSettingKey>[] {
    const rerender = this.rerenderPreservingViewState;

    return [
      {
        type: "group",
        heading: "Behavior",
        cls: "property-panels-editor-section",
        items: [
          {
            name: "Text save delay",
            desc: "Milliseconds to wait before saving text and textarea fields.",
            aliases: ["debounce", "save interval"],
            control: { type: "number", key: "behavior.textSaveDelay", min: 100, max: 5000, step: 100, defaultValue: 500 }
          },
          {
            name: "Delete empty values",
            desc: "Remove the frontmatter key when a field is cleared.",
            aliases: ["frontmatter", "clear property"],
            control: { type: "toggle", key: "behavior.deleteEmptyValues", defaultValue: false }
          },
          {
            name: "Show in source mode",
            desc: "Display panels in plain Markdown source mode. Live preview is not affected.",
            aliases: ["source view", "live preview"],
            control: { type: "toggle", key: "behavior.showInSourceView", defaultValue: false }
          },
          {
            name: "Debug logging",
            desc: "Log placement fallbacks to the developer console.",
            aliases: ["diagnostics", "developer console"],
            control: { type: "toggle", key: "behavior.debugLogging", defaultValue: false }
          }
        ]
      },
      {
        type: "group",
        heading: "Default layout",
        cls: "property-panels-editor-section",
        items: [
          {
            name: "Columns",
            aliases: ["grid"],
            control: { type: "dropdown", key: "layout.columns", options: { "1": "1", "2": "2", "3": "3", "4": "4" }, defaultValue: "1" }
          },
          {
            name: "Density",
            aliases: ["spacing"],
            control: { type: "dropdown", key: "layout.density", options: { compact: "Compact", normal: "Normal", comfortable: "Comfortable" }, defaultValue: "normal" }
          },
          {
            name: "Label position",
            aliases: ["field label", "inline label"],
            control: { type: "dropdown", key: "layout.labelPosition", options: { top: "Top", left: "Left", "left-end": "Left, align end", inline: "Inline" }, defaultValue: "top" }
          },
          {
            name: "Field gap",
            desc: "Space between fields in pixels.",
            control: { type: "number", key: "layout.fieldGap", min: 0, step: 1, defaultValue: 10 }
          },
          {
            name: "Panel gap",
            desc: "Space between panels in pixels.",
            control: { type: "number", key: "layout.panelGap", min: 0, step: 1, defaultValue: 12 }
          }
        ]
      },
      this.customDefinition("Default panels", "Configure the panels and fields used as the starting point for every note.", ["fields", "properties", "position", "icons"], (container) => {
        renderPanelEditor(container, this.plugin.settings.defaultConfig.panels, this.plugin, rerender, this.attachFolderSuggest, this.attachIconSuggest, {
          title: "Default panels",
          description: "These panels are the starting configuration for every note.",
          scope: "default"
        });
      }),
      this.customDefinition("Note rules", "Apply panel configurations by folder, tag, or wikilink.", ["inheritance", "folder rule", "tag rule", "wikilink rule"], (container) => {
        renderRuleEditor(container, this.plugin, rerender, this.attachFolderSuggest, this.attachIconSuggest);
      }),
      this.customDefinition("Rule tester", "Test a note path, tags, and wikilinks against the configured rules.", ["match rules", "resolved panels"], (container) => this.renderRuleTester(container)),
      this.customDefinition("Diagnostics", "Inspect and copy privacy-preserving runtime diagnostics.", ["debug", "copy diagnostics"], (container) => this.renderDiagnostics(container)),
      this.customDefinition("Advanced JSON editor", "Copy, validate, import, or restore the complete plugin configuration.", ["backup", "restore defaults", "configuration JSON"], (container) => this.renderAdvancedJson(container))
    ];
  }

  getControlValue(key: string): unknown {
    const behavior = this.plugin.settings.behavior;
    const layout = this.plugin.settings.defaultConfig.layout;
    switch (key as PropertyPanelsSettingKey) {
      case "behavior.textSaveDelay": return behavior.textSaveDelay;
      case "behavior.deleteEmptyValues": return behavior.deleteEmptyValues;
      case "behavior.showInSourceView": return behavior.showInSourceView;
      case "behavior.debugLogging": return behavior.debugLogging;
      case "layout.columns": return String(layout.columns);
      case "layout.density": return layout.density;
      case "layout.labelPosition": return layout.labelPosition;
      case "layout.fieldGap": return layout.fieldGap ?? 10;
      case "layout.panelGap": return layout.panelGap ?? 12;
    }
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const behavior = this.plugin.settings.behavior;
    const layout = this.plugin.settings.defaultConfig.layout;
    switch (key as PropertyPanelsSettingKey) {
      case "behavior.textSaveDelay":
        if (typeof value !== "number" || !Number.isFinite(value)) return;
        behavior.textSaveDelay = Math.max(100, Math.min(5000, value));
        break;
      case "behavior.deleteEmptyValues":
        if (typeof value !== "boolean") return;
        behavior.deleteEmptyValues = value;
        break;
      case "behavior.showInSourceView":
        if (typeof value !== "boolean") return;
        behavior.showInSourceView = value;
        break;
      case "behavior.debugLogging":
        if (typeof value !== "boolean") return;
        behavior.debugLogging = value;
        break;
      case "layout.columns": {
        const columns = Number(value);
        if (!Number.isFinite(columns)) return;
        layout.columns = Math.max(1, Math.min(4, Math.round(columns)));
        break;
      }
      case "layout.density":
        if (value !== "compact" && value !== "normal" && value !== "comfortable") return;
        layout.density = value;
        break;
      case "layout.labelPosition":
        if (value !== "top" && value !== "left" && value !== "left-end" && value !== "inline") return;
        layout.labelPosition = value;
        break;
      case "layout.fieldGap":
        if (typeof value !== "number" || !Number.isFinite(value)) return;
        layout.fieldGap = Math.max(0, value);
        break;
      case "layout.panelGap":
        if (typeof value !== "number" || !Number.isFinite(value)) return;
        layout.panelGap = Math.max(0, value);
        break;
      default: return;
    }
    await this.plugin.saveSettings();
  }

  private customDefinition(name: string, desc: string, aliases: string[], render: (container: HTMLElement) => void): SettingDefinitionRender {
    return {
      name,
      desc,
      aliases,
      render: (setting) => {
        setting.settingEl.empty();
        setting.settingEl.addClass("property-panels-custom-setting-definition");
        render(setting.settingEl);
        return () => this.closeSuggests();
      }
    };
  }

  private readonly rerenderPreservingViewState = (): void => {
    const state = captureSettingsViewState(this.containerEl);
    this.closeSuggests();
    this.update();
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

  private renderRuleTester(parent: HTMLElement): void {
    const section = parent.createDiv({ cls: "property-panels-editor-section" });
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

  private renderAdvancedJson(parent: HTMLElement): void {
    const details = parent.createEl("details", { cls: "property-panels-editor-section property-panels-advanced-json" });
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
            this.rerenderPreservingViewState();
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
        this.rerenderPreservingViewState();
        new Notice("Property panels settings saved.");
      } catch (error) {
        new Notice(`Invalid settings: ${error instanceof Error ? error.message : String(error)}`);
      }
    }));
  }

  private renderDiagnostics(parent: HTMLElement): void {
    const section = parent.createDiv({ cls: "property-panels-editor-section" });
    new Setting(section).setName("Diagnostics").setHeading();
    const diagnostics = this.plugin.getDiagnostics();
    section.createEl("pre", { text: JSON.stringify(diagnostics, null, 2), cls: "property-panels-rule-test" });
    new Setting(section).setName("Copy diagnostics").setDesc("Copies counts only; note paths and property values are not included.")
      .addButton((button) => button.setButtonText("Copy").onClick(() => void this.plugin.copyDiagnostics()));
  }
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
