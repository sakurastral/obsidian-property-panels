import { describe, expect, it } from "vitest";
import { effectiveColumnSpan } from "../src/components/field-layout";

describe("field column span", () => {
  it("uses the configured span when it fits the panel grid", () => {
    expect(effectiveColumnSpan(2, 3)).toBe(2);
  });

  it("does not create implicit columns beyond the panel grid", () => {
    expect(effectiveColumnSpan(4, 2)).toBe(2);
  });

  it("keeps both span and column count at valid integer values", () => {
    expect(effectiveColumnSpan(0, 3)).toBe(1);
    expect(effectiveColumnSpan(2.6, 4.2)).toBe(3);
  });
});
