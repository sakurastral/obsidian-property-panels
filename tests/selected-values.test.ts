import { describe, expect, it } from "vitest";
import { editSelectedValue, moveSelectedValue } from "../src/components/selected-values";

describe("selected Multi-select values", () => {
  it("moves an item without changing the others", () => {
    expect(moveSelectedValue(["one", "two", "three"], 0, 2)).toEqual(["two", "three", "one"]);
    expect(moveSelectedValue(["one", "two", "three"], 2, 0)).toEqual(["three", "one", "two"]);
  });

  it("ignores invalid moves", () => {
    const values = ["one", "two"];
    expect(moveSelectedValue(values, -1, 1)).toBe(values);
    expect(moveSelectedValue(values, 0, 4)).toBe(values);
  });

  it("edits values while preventing blanks and duplicates", () => {
    expect(editSelectedValue(["one", "two"], 1, " second ")).toEqual(["one", "second"]);
    expect(editSelectedValue(["one", "two"], 1, "one")).toEqual(["one", "two"]);
    expect(editSelectedValue(["one", "two"], 1, " ")).toEqual(["one", "two"]);
  });
});
