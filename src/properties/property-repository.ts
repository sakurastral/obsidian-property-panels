import type { App, EventRef, TFile } from "obsidian";
import type { PropertyValue } from "../types";

export class PropertyRepository {
  private readonly localWrites = new Map<string, number>();
  constructor(private readonly app: App, private readonly deleteEmpty: () => boolean) {}

  read(file: TFile, property: string): PropertyValue {
    const frontmatter: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const value = isRecord(frontmatter) ? frontmatter[property] : undefined;
    return toPropertyValue(value);
  }

  async write(file: TFile, property: string, value: PropertyValue): Promise<void> {
    this.localWrites.set(`${file.path}:${property}`, Date.now());
    await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
      const empty = value == null || value === "" || (Array.isArray(value) && value.length === 0);
      if (empty && this.deleteEmpty()) delete frontmatter[property];
      else frontmatter[property] = value;
    });
  }

  recentlyWritten(file: TFile, property: string): boolean {
    return Date.now() - (this.localWrites.get(`${file.path}:${property}`) ?? 0) < 1000;
  }

  subscribe(file: TFile, callback: () => void): () => void {
    const ref: EventRef = this.app.metadataCache.on("changed", (changed) => {
      if (changed.path === file.path) callback();
    });
    return () => this.app.metadataCache.offref(ref);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPropertyValue(value: unknown): PropertyValue {
  if (value == null) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (typeof item === "number" || typeof item === "boolean") return [String(item)];
      return [];
    });
  }
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}
