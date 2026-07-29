import { normalizePath, TFile, type App } from "obsidian";
import type { OptionContext, OptionItem, OptionSourceConfig } from "../types";
import { fileBelongsToFolder, optionSourceDependsOnPath, optionSourceKey } from "./option-dependency";
import { folderOptionValue } from "./folder-option-value";

const unique = (items: OptionItem[]): OptionItem[] => {
  const seen = new Set<string>();
  return items.filter((item) => item.value !== "" && !seen.has(item.value) && seen.add(item.value));
};

export class OptionService {
  private readonly cache = new Map<string, { time: number; items: OptionItem[]; source: OptionSourceConfig }>();
  constructor(private readonly app: App) {}
  clear(): void { this.cache.clear(); }
  getCacheSize(): number { return this.cache.size; }

  invalidatePath(path: string): void {
    for (const [key, cached] of this.cache) {
      if (optionSourceDependsOnPath(cached.source, path)) this.cache.delete(key);
    }
  }

  async load(source: OptionSourceConfig | undefined, context: OptionContext): Promise<OptionItem[]> {
    if (!source) return [];
    const key = optionSourceKey(source);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < 30_000) return cached.items;
    const items = unique(await this.loadUncached(source, context));
    this.cache.set(key, { time: Date.now(), items, source: structuredClone(source) });
    return items;
  }

  private async loadUncached(source: OptionSourceConfig, _context: OptionContext): Promise<OptionItem[]> {
    if (source.type === "static") return source.options;
    if (source.type === "folder") {
      const excluded = new Set((source.exclude ?? []).map((path) => normalizePath(path)));
      const files = this.app.vault.getMarkdownFiles()
        .filter((file) => fileBelongsToFolder(file.path, source.path, source.recursive) && !excluded.has(normalizePath(file.path)));
      const items = files.map((file) => {
        const frontmatter: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter;
        const labelValue = source.labelProperty && isRecord(frontmatter)
          ? frontmatter[source.labelProperty]
          : undefined;
        return {
          value: folderOptionValue(file.path, file.basename, source.value, source.wikilink),
          label: optionText(labelValue) ?? file.basename
        };
      });
      return source.sort ? items.sort((a, b) => a.label.localeCompare(b.label)) : items;
    }
    const abstract = this.app.vault.getAbstractFileByPath(normalizePath(source.path));
    if (!(abstract instanceof TFile)) throw new Error(`Option source file not found: ${source.path}`);
    if (source.type === "file-property") {
      const frontmatter: unknown = this.app.metadataCache.getFileCache(abstract)?.frontmatter;
      const value = isRecord(frontmatter) ? frontmatter[source.property] : undefined;
      const values: unknown[] = Array.isArray(value) ? value : value == null ? [] : [value];
      return values.flatMap((item) => {
        const text = optionText(item);
        return text === undefined ? [] : [{ value: text, label: text }];
      });
    }
    const text = await this.app.vault.cachedRead(abstract);
    const section = source.heading ? extractHeading(text, source.heading) : text;
    return [...section.matchAll(/^\s*[-*+]\s+(.+?)\s*$/gm)].map((match) => {
      const value = (match[1] ?? "").replace(/\s+<!--.*?-->\s*$/, "");
      return { value, label: value };
    });
  }

  openLink(linktext: string, sourcePath: string, newLeaf: boolean): Promise<void> {
    return this.app.workspace.openLinkText(linktext, sourcePath, newLeaf);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function extractHeading(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const wanted = heading.replace(/^#+\s*/, "").trim().toLowerCase();
  const start = lines.findIndex((line) => /^#{1,6}\s+/.test(line) && line.replace(/^#{1,6}\s+/, "").trim().toLowerCase() === wanted);
  if (start < 0) return "";
  const level = lines[start]!.match(/^#+/)?.[0].length ?? 1;
  const endOffset = lines.slice(start + 1).findIndex((line) => {
    const match = line.match(/^(#{1,6})\s+/);
    return match != null && match[1]!.length <= level;
  });
  return lines.slice(start + 1, endOffset < 0 ? undefined : start + 1 + endOffset).join("\n");
}
