import { describe, expect, it } from "vitest";
import { ConfigResolver, matchesFolder, matchesRule } from "../src/config/config-resolver";
import type { PanelRule, PluginSettings, RuleMatchContext } from "../src/types";

const rule = (value: string, matchMode: PanelRule["matchMode"], matchType: PanelRule["matchType"] = "folder"): PanelRule => ({
  id: value || "root", name: value, matchType, value, enabled: true, matchMode,
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

describe("metadata matching", () => {
  const context: RuleMatchContext = {
    path: "Knowledge/Tools/note.md",
    tags: ["#project", "#writing/draft"],
    links: ["Notes/Welcome", "People/Ada"]
  };

  it("matches tags with or without a leading hash", () => {
    expect(matchesRule(context, rule("project", "folder-and-children", "tag"))).toBe(true);
    expect(matchesRule(context, rule("#missing", "folder-and-children", "tag"))).toBe(false);
  });

  it("matches wikilink syntax, paths, and aliases", () => {
    expect(matchesRule(context, rule("[[Notes/Welcome|Welcome]]", "folder-and-children", "wikilink"))).toBe(true);
    expect(matchesRule(context, rule("[[Missing]]", "folder-and-children", "wikilink"))).toBe(false);
  });
});

describe("config resolver", () => {
  it("applies parent before child and supports replace", () => {
    const settings: PluginSettings = {
      behavior: { textSaveDelay: 500, deleteEmptyValues: true, showInSourceView: true, debugLogging: false },
      defaultConfig: { layout: { columns: 1, density: "normal", labelPosition: "top" }, panels: [] },
      rules: [
        { ...rule("Knowledge", "folder-and-children"), config: { layout: { columns: 2 } } },
        { ...rule("Knowledge/Tools", "folder-and-children"), inheritance: "replace", config: {
          panels: [{ id: "tools", name: "Tools", enabled: true, position: "after-properties", fields: [], showTitle: true, collapsible: false, defaultCollapsed: false }]
        } }
      ]
    };
    const result = new ConfigResolver(settings).resolve("Knowledge/Tools/note.md");
    expect(result.layout.columns).toBe(2);
    expect(result.panels.map((panel) => panel.id)).toEqual(["tools"]);
  });
});
