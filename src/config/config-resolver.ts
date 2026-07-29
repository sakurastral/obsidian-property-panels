import type { BasePanelConfig, LayoutConfig, PanelConfig, PanelRule, PluginSettings, ResolvedConfig, RuleMatchContext } from "../types";

const normalize = (path: string): string => path.replace(/^\/+|\/+$/g, "");
const folderOf = (filePath: string): string => filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : "";
const depth = (path: string): number => normalize(path).split("/").filter(Boolean).length;

export function matchesFolder(filePath: string, rule: PanelRule): boolean {
  const folder = folderOf(filePath);
  const target = normalize(rule.value);
  return rule.matchMode === "folder-only"
    ? folder === target
    : folder === target || (target === "" ? true : folder.startsWith(`${target}/`));
}

export function matchesRule(context: RuleMatchContext, rule: PanelRule): boolean {
  if (rule.matchType === "folder") return matchesFolder(context.path, rule);
  if (rule.matchType === "tag") {
    const target = normalizeTag(rule.value);
    return target !== "" && context.tags.some((tag) => normalizeTag(tag) === target);
  }
  const target = normalizeWikiLink(rule.value);
  return target !== "" && context.links.some((link) => normalizeWikiLink(link) === target);
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

function applyRule(base: BasePanelConfig, rule: PanelRule): BasePanelConfig {
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
  constructor(
    private settings: PluginSettings,
    private readonly contextForPath: (filePath: string) => RuleMatchContext = (path) => ({ path, tags: [], links: [] })
  ) {}

  update(settings: PluginSettings): void { this.settings = settings; this.cache.clear(); }
  clear(): void { this.cache.clear(); }

  resolve(filePath: string): ResolvedConfig {
    return this.resolveContext(this.contextForPath(filePath));
  }

  resolveContext(context: RuleMatchContext): ResolvedConfig {
    const cacheKey = JSON.stringify([context.path, context.tags, context.links]);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    const matching = this.settings.rules
      .filter((rule) => rule.enabled && matchesRule(context, rule))
      .sort((a, b) => ruleDepth(a) - ruleDepth(b) || a.priority - b.priority);
    let result: BasePanelConfig = {
      layout: { ...this.settings.defaultConfig.layout },
      panels: this.settings.defaultConfig.panels.map((panel) => ({ ...panel, fields: [...panel.fields] }))
    };
    for (const rule of matching) result = applyRule(result, rule);
    this.cache.set(cacheKey, result);
    return result;
  }
}

const ruleDepth = (rule: PanelRule): number => rule.matchType === "folder" ? depth(rule.value) : 0;
const normalizeTag = (value: string): string => value.trim().replace(/^#+/, "").toLocaleLowerCase();
const normalizeWikiLink = (value: string): string => {
  const trimmed = value.trim();
  const content = trimmed.startsWith("[[") && trimmed.endsWith("]]") ? trimmed.slice(2, -2) : trimmed;
  return (content.split("|", 1)[0] ?? "").trim().replace(/\.md$/i, "").replace(/^\/+/, "").toLocaleLowerCase();
};
