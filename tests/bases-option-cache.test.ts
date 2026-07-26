import { describe, expect, it, vi } from "vitest";
import { BasesOptionCache } from "../src/options/bases-option-cache";

describe("Bases option cache", () => {
  it("normalizes keys, removes empty and duplicate values, and returns a copy", () => {
    const updated = vi.fn();
    const cache = new BasesOptionCache(updated);
    cache.set("\\System//Categories.base/", [
      { value: "AI", label: "Artificial intelligence" },
      { value: "AI", label: "AI" },
      { value: "", label: "Empty" }
    ]);
    expect(cache.get("System/Categories.base")).toEqual([{ value: "AI", label: "AI" }]);
    const result = cache.get("System/Categories.base")!;
    result[0]!.label = "Changed";
    expect(cache.get("System/Categories.base")![0]!.label).toBe("AI");
    expect(updated).toHaveBeenCalledOnce();
  });
});
