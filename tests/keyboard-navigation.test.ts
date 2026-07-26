import { describe, expect, it } from "vitest";
import { multiSelectKeyboardResult, nextOptionIndex, ratingKeyboardResult } from "../src/components/keyboard-navigation";

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

  it("does not remove selected values when Backspace is pressed", () => {
    expect(multiSelectKeyboardResult("Backspace", 0, 0)).toEqual({ type: "none" });
    expect(multiSelectKeyboardResult("ArrowDown", 0, 3)).toEqual({ type: "navigate", index: 1 });
    expect(multiSelectKeyboardResult("Enter", 1, 3)).toEqual({ type: "select", index: 1 });
    expect(multiSelectKeyboardResult("Escape", 1, 3)).toEqual({ type: "clear-query" });
  });
});
