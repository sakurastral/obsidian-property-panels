import type { BasePanelConfig, FolderRule, LayoutConfig, PanelConfig, PluginSettings, ResolvedConfig } from "../types";

const normalize = (path: string): string => path.replace(/^\/+|\/+$/g, "");
const folderOf = (filePath: string): string => filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : "";
const depth = (path: string): number => normalize(path).split("/").filter(Boolean).length;

export function matchesFolder(filePath: string, rule: FolderRule): boolean {
  const folder = folderOf(filePath);
  const target = normalize(rule.path);
  return rule.matchMode === "folder-only"
    ? folder === target
    : folder === target || (target === "" ? true : folder.startsWith(`${target}/`));
}

function mergePanels(base: PanelConfig[], additions: PanelConfig[]): PanelConfig[] {
  const result = base.map((panel) => ({ ...panel, fields: [...panel.fields] }));
  for (const next of additions) {
    const index = result.findIndex((panel) => panel.id === next.id);
    if (index < 0) result.push(next);
    else result[index] = { ...result[index]!, ...next, fields: next.fields };
  }
  return result;
}

function applyRule(base: BasePanelConfig, rule: FolderRule): BasePanelConfig {
  const layout: LayoutConfig = { ...base.layout, ...rule.config.layout };
  if (rule.inheritance === "replace") {
    return { layout, panels: rule.config.panels ? [...rule.config.panels] : [] };
  }
  return {
    layout,
    panels: rule.config.panels ? mergePanels(base.panels, rule.config.panels) : base.panels
  };
}

export class ConfigResolver {
  private readonly cache = new Map<string, ResolvedConfig>();
  constructor(private settings: PluginSettings) {}

  update(settings: PluginSettings): void { this.settings = settings; this.cache.clear(); }
  clear(): void { this.cache.clear(); }

  resolve(filePath: string): ResolvedConfig {
    const folder = folderOf(filePath);
    const cached = this.cache.get(folder);
    if (cached) return cached;
    const matching = this.settings.folderRules
      .filter((rule) => rule.enabled && matchesFolder(filePath, rule))
      .sort((a, b) => depth(a.path) - depth(b.path) || a.priority - b.priority);
    let result: BasePanelConfig = {
      layout: { ...this.settings.defaultConfig.layout },
      panels: this.settings.defaultConfig.panels.map((panel) => ({ ...panel, fields: [...panel.fields] }))
    };
    for (const rule of matching) result = applyRule(result, rule);
    this.cache.set(folder, result);
    return result;
  }
}
