import { describe, expect, it } from "vitest";
import { fileBelongsToFolder, optionSourceDependsOnPath, optionSourceKey } from "../src/options/option-dependency";
import type { OptionSourceConfig } from "../src/types";

describe("option source invalidation", () => {
  it("invalidates exact file sources only", () => {
    const source: OptionSourceConfig = { type: "file-property", path: "System/Options.md", property: "categories" };
    expect(optionSourceDependsOnPath(source, "System/Options.md")).toBe(true);
    expect(optionSourceDependsOnPath(source, "System/Other.md")).toBe(false);
  });

  it("respects recursive and direct folder sources", () => {
    const direct: OptionSourceConfig = { type: "folder", path: "Knowledge", recursive: false, value: "path", sort: true };
    const recursive: OptionSourceConfig = { ...direct, recursive: true };
    expect(optionSourceDependsOnPath(direct, "Knowledge/Note.md")).toBe(true);
    expect(optionSourceDependsOnPath(direct, "Knowledge/Tools/Note.md")).toBe(false);
    expect(optionSourceDependsOnPath(recursive, "Knowledge/Tools/Note.md")).toBe(true);
    expect(optionSourceDependsOnPath(recursive, "Archive/Note.md")).toBe(false);
  });

  it("does not invalidate static or Bases sources for vault file changes", () => {
    expect(optionSourceDependsOnPath({ type: "static", options: [] }, "Note.md")).toBe(false);
    expect(optionSourceDependsOnPath({ type: "bases", path: "cache" }, "Note.md")).toBe(false);
  });

  it("reloads options after an in-place folder source edit", () => {
    const source: OptionSourceConfig = { type: "folder", path: "Inbox", recursive: false, value: "basename", sort: true };
    const before = optionSourceKey(source);
    source.path = "Nexus/Categories/Other";
    expect(optionSourceKey(source)).not.toBe(before);
  });

  it("matches folder files consistently for direct and recursive sources", () => {
    expect(fileBelongsToFolder("Nexus/Categories/Other/AI Agent.md", "Nexus/Categories/Other", false)).toBe(true);
    expect(fileBelongsToFolder("Nexus/Categories/Other/Tools/Agent.md", "Nexus/Categories/Other", false)).toBe(false);
    expect(fileBelongsToFolder("Nexus/Categories/Other/Tools/Agent.md", "Nexus\\Categories\\Other", true)).toBe(true);
    expect(fileBelongsToFolder("Nexus/Categories/Elsewhere/Agent.md", "Nexus/Categories/Other", true)).toBe(false);
  });
});
