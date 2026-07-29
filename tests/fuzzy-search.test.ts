import { describe, expect, it } from "vitest";
import { appendCustomOption, fuzzyFilter } from "../src/components/fuzzy-search";

const values = ["apple tree", "app store", "banana", "Application toolkit"];

describe("fuzzy search", () => {
  it("returns every item before a query is entered", () => {
    expect(fuzzyFilter(values, "", (value) => value)).toEqual(values);
  });

  it("matches multiple fuzzy query fragments", () => {
    expect(fuzzyFilter(values, "app t", (value) => value)).toEqual([
      "app store",
      "apple tree",
      "Application toolkit"
    ]);
  });

  it("supports non-contiguous characters and ignores case", () => {
    expect(fuzzyFilter(values, "APTK", (value) => value)).toContain("Application toolkit");
  });

  it("excludes candidates missing any query fragment", () => {
    expect(fuzzyFilter(values, "app z", (value) => value)).toEqual([]);
  });

  it("appends the typed custom value after matching options", () => {
    expect(appendCustomOption(["apple tree", "app store"], "app t", [], true, (value) => `Add “${value}”`)).toEqual([
      "apple tree",
      "app store",
      "Add “app t”"
    ]);
  });
});
