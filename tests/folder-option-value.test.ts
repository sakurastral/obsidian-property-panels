import { describe, expect, it } from "vitest";
import { folderOptionValue } from "../src/options/folder-option-value";

describe("folder option values", () => {
  it("stores basenames as wikilinks by default", () => {
    expect(folderOptionValue("Statuses/Sapling.md", "Sapling", "basename", true)).toBe("[[Sapling]]");
  });

  it("stores vault paths as extensionless wikilinks", () => {
    expect(folderOptionValue("Statuses/Sapling.md", "Sapling", "path", true)).toBe("[[Statuses/Sapling]]");
  });

  it("can preserve plain basename and path values", () => {
    expect(folderOptionValue("Statuses/Sapling.md", "Sapling", "basename", false)).toBe("Sapling");
    expect(folderOptionValue("Statuses/Sapling.md", "Sapling", "path", false)).toBe("Statuses/Sapling.md");
  });
});
