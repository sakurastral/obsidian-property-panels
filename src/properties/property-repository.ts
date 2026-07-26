import type { App, EventRef, TFile } from "obsidian";
import type { PropertyValue } from "../types";

export class PropertyRepository {
  private readonly localWrites = new Map<string, number>();
  constructor(private readonly app: App, private readonly deleteEmpty: () => boolean) {}

  read(file: TFile, property: string): PropertyValue {
    const value: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.[property];
    if (value == null || ["string", "number", "boolean"].includes(typeof value)) return value as PropertyValue;
    if (Array.isArray(value)) return value.map(String);
    return String(value);
  }

  async write(file: TFile, property: string, value: PropertyValue): Promise<void> {
    this.localWrites.set(`${file.path}:${property}`, Date.now());
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
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
