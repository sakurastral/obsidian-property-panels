import { describe, expect, it } from "vitest";
import { optionDisplayText, parseWikiLink } from "../src/components/wiki-link";

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
});
