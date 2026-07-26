import { describe, expect, it } from "vitest";
import { ConfigResolver, matchesFolder } from "../src/config/config-resolver";
import type { FolderRule, PluginSettings } from "../src/types";

const rule = (path: string, matchMode: FolderRule["matchMode"]): FolderRule => ({
  id: path || "root", name: path, path, enabled: true, matchMode,
  inheritance: "extend", priority: 0, config: {}
});

describe("folder matching", () => {
  it("matches direct children only", () => {
    expect(matchesFolder("Knowledge/Tools/note.md", rule("Knowledge/Tools", "folder-only"))).toBe(true);
    expect(matchesFolder("Knowledge/Tools/Obsidian/note.md", rule("Knowledge/Tools", "folder-only"))).toBe(false);
  });
  it("matches descendants", () => {
    expect(matchesFolder("Knowledge/Tools/Obsidian/note.md", rule("Knowledge/Tools", "folder-and-children"))).toBe(true);
  });
});

describe("config resolver", () => {
  it("applies parent before child and supports replace", () => {
    const settings: PluginSettings = {
      behavior: { textSaveDelay: 500, deleteEmptyValues: true, debugLogging: false },
      defaultConfig: { layout: { columns: 1, density: "normal", labelPosition: "top" }, panels: [] },
      folderRules: [
        { ...rule("Knowledge", "folder-and-children"), config: { layout: { columns: 2 } } },
        { ...rule("Knowledge/Tools", "folder-and-children"), inheritance: "replace", config: {
          panels: [{ id: "tools", name: "Tools", enabled: true, position: "after-properties", fields: [], collapsible: false, defaultCollapsed: false }]
        } }
      ]
    };
    const result = new ConfigResolver(settings).resolve("Knowledge/Tools/note.md");
    expect(result.layout.columns).toBe(2);
    expect(result.panels.map((panel) => panel.id)).toEqual(["tools"]);
  });
});
