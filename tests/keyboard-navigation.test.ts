import { describe, expect, it } from "vitest";
import { nextOptionIndex, ratingKeyboardResult } from "../src/components/keyboard-navigation";

describe("keyboard navigation", () => {
  it("wraps option navigation in both directions", () => {
    expect(nextOptionIndex(2, 3, "ArrowDown")).toBe(0);
    expect(nextOptionIndex(0, 3, "ArrowUp")).toBe(2);
    expect(nextOptionIndex(0, 0, "ArrowDown")).toBe(0);
  });

  it("maps rating navigation and clear commands", () => {
    expect(ratingKeyboardResult("ArrowRight", 5, 5, true)).toEqual({ type: "select", value: 1 });
    expect(ratingKeyboardResult("Home", 4, 5, true)).toEqual({ type: "select", value: 1 });
    expect(ratingKeyboardResult("End", 2, 5, true)).toEqual({ type: "select", value: 5 });
    expect(ratingKeyboardResult("Delete", 2, 5, true)).toEqual({ type: "clear" });
    expect(ratingKeyboardResult("Delete", 2, 5, false)).toEqual({ type: "none" });
  });
});
