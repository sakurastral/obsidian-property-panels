import { describe, expect, it } from "vitest";
import { optionDisplayText, parseDisplayLink, parseWikiLink } from "../src/components/wiki-link";

describe("wikilink values", () => {
  it("removes wikilink brackets while preserving the target", () => {
    expect(parseWikiLink("[[AI Agent 與 SKILL.MD]]")).toEqual({
      target: "AI Agent 與 SKILL.MD",
      label: "AI Agent 與 SKILL.MD"
    });
    expect(optionDisplayText("[[AI Agent 與 SKILL.MD]]")).toBe("AI Agent 與 SKILL.MD");
  });

  it("uses aliases for display without changing the link target", () => {
    expect(parseWikiLink("[[Notes/Agent|Agent note]]")).toEqual({
      target: "Notes/Agent",
      label: "Agent note"
    });
  });

  it("leaves ordinary option values unchanged", () => {
    expect(parseWikiLink("Agent note")).toBeUndefined();
    expect(optionDisplayText("Agent note")).toBe("Agent note");
  });

  it("recognizes raw HTTP and HTTPS URLs", () => {
    expect(parseDisplayLink("https://example.com/path?q=1")).toEqual({
      kind: "external",
      target: "https://example.com/path?q=1",
      label: "https://example.com/path?q=1"
    });
    expect(parseDisplayLink("http://example.com")).toMatchObject({ kind: "external" });
  });

  it("recognizes external and internal Markdown links", () => {
    expect(parseDisplayLink("[Obsidian Help](https://help.obsidian.md/)")).toEqual({
      kind: "external",
      target: "https://help.obsidian.md/",
      label: "Obsidian Help"
    });
    expect(parseDisplayLink("[Welcome](Notes/Welcome)")).toEqual({
      kind: "internal",
      target: "Notes/Welcome",
      label: "Welcome"
    });
    expect(optionDisplayText("[Obsidian Help](https://help.obsidian.md/)")).toBe("Obsidian Help");
  });

  it("rejects unsafe or malformed link schemes", () => {
    expect(parseDisplayLink("[Unsafe](javascript:alert(1))")).toBeUndefined();
    expect(parseDisplayLink("javascript:alert(1)")).toBeUndefined();
    expect(parseDisplayLink("[Broken](not a path)")).toBeUndefined();
  });
});
