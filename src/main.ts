import { getAllTags, MarkdownView, Notice, Plugin } from "obsidian";
import { ConfigResolver } from "./config/config-resolver";
import { OptionService } from "./options/option-service";
import { PanelMountManager } from "./panels/panel-mount-manager";
import { PositionResolver } from "./placement/position-resolver";
import { PropertyRepository } from "./properties/property-repository";
import { DEFAULT_SETTINGS } from "./settings/defaults";
import { PropertyPanelsSettingTab } from "./settings/settings-tab";
import { normalizeSettings } from "./settings/settings-normalizer";
import type { PluginSettings, RuleMatchContext } from "./types";

export default class PropertyPanelsPlugin extends Plugin {
  settings: PluginSettings = structuredClone(DEFAULT_SETTINGS);
  configResolver = new ConfigResolver(this.settings);
  private repository!: PropertyRepository;
  private options!: OptionService;
  private mounts!: PanelMountManager;

  async onload(): Promise<void> {
    this.settings = this.normalizeSettings(await this.loadData());
    this.configResolver = new ConfigResolver(this.settings, (path) => this.getRuleContext(path));
    this.repository = new PropertyRepository(this.app, () => this.settings.behavior.deleteEmptyValues);
    this.options = new OptionService(this.app);
    const positionResolver = new PositionResolver((message) => {
      if (this.settings.behavior.debugLogging) console.debug(`[Property Panels] ${message}`);
    });
    this.mounts = new PanelMountManager(
      this.configResolver,
      this.repository,
      this.options,
      positionResolver,
      () => this.settings.behavior.textSaveDelay,
      () => this.settings.behavior.showInSourceView
    );
    this.addSettingTab(new PropertyPanelsSettingTab(this.app, this));
    this.app.workspace.trigger("parse-style-settings");
    this.addCommand({
      id: "copy-diagnostics",
      name: "Copy diagnostics",
      callback: () => void this.copyDiagnostics()
    });

    this.registerEvent(this.app.workspace.on("layout-change", () => this.refresh()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.refresh()));
    this.registerEvent(this.app.workspace.on("file-open", () => this.refresh()));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      this.configResolver.clear();
      this.options.invalidatePath(oldPath);
      this.options.invalidatePath(file.path);
      this.refresh();
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => this.options.invalidatePath(file.path)));
    this.registerEvent(this.app.vault.on("create", (file) => this.options.invalidatePath(file.path)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.options.invalidatePath(file.path)));
    this.registerEvent(this.app.metadataCache.on("changed", () => {
      this.configResolver.clear();
      this.refresh();
    }));
    this.app.workspace.onLayoutReady(() => this.refresh());
  }

  onunload(): void { this.mounts.destroy(); }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.configResolver.update(this.settings);
    this.options.clear();
    this.refresh();
  }

  normalizeSettings(input: unknown): PluginSettings {
    return normalizeSettings(input);
  }

  getDiagnostics(): Record<string, unknown> {
    return {
      pluginVersion: this.manifest.version,
      markdownViews: this.app.workspace.getLeavesOfType("markdown").length,
      ...this.mounts.getDiagnostics(),
      optionCacheEntries: this.options.getCacheSize(),
      defaultPanels: this.settings.defaultConfig.panels.length,
      rules: this.settings.rules.length
    };
  }

  async copyDiagnostics(): Promise<void> {
    const text = JSON.stringify(this.getDiagnostics(), null, 2);
    try {
      await window.navigator.clipboard.writeText(text);
      new Notice("Property panels diagnostics copied.");
    } catch {
      new Notice("Clipboard unavailable. Open settings to view diagnostics.");
    }
  }

  private refresh(): void {
    window.setTimeout(() => {
      const views = this.app.workspace.getLeavesOfType("markdown")
        .map((leaf) => leaf.view)
        .filter((view): view is MarkdownView => view instanceof MarkdownView);
      this.mounts.refreshAll(views);
    });
  }

  private getRuleContext(path: string): RuleMatchContext {
    const cache = this.app.metadataCache.getCache(path);
    const tags = cache ? getAllTags(cache) ?? [] : [];
    const links = [...(cache?.links ?? []), ...(cache?.frontmatterLinks ?? [])].map((link) => link.link);
    return { path, tags, links };
  }
}
