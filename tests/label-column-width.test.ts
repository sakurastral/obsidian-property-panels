import { describe, expect, it } from "vitest";
import { calculateLabelColumnWidth } from "../src/components/label-column-width";

describe("left-end label column width", () => {
  it("uses the longest label plus a small amount of space", () => {
    expect(calculateLabelColumnWidth([42, 63.2, 51])).toBe(72);
  });

  it("ignores negative padding and handles an empty panel", () => {
    expect(calculateLabelColumnWidth([42], -4)).toBe(42);
    expect(calculateLabelColumnWidth([])).toBeUndefined();
  });
});
