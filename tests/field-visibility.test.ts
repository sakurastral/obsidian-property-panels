import { describe, expect, it } from "vitest";
import { isEmptyPropertyValue, shouldRenderField } from "../src/components/field-visibility";

describe("field visibility", () => {
  it.each([null, undefined, "", "   ", []])("recognizes an empty value: %j", (value) => {
    expect(isEmptyPropertyValue(value)).toBe(true);
  });

  it.each([0, false, "value", ["value"]])("preserves a meaningful value: %j", (value) => {
    expect(isEmptyPropertyValue(value)).toBe(false);
  });

  it("always renders dividers", () => {
    expect(shouldRenderField("divider", false, undefined)).toBe(true);
  });

  it("respects the field empty-value preference", () => {
    expect(shouldRenderField("text", false, "")).toBe(false);
    expect(shouldRenderField("text", true, "")).toBe(true);
    expect(shouldRenderField("number", false, 0)).toBe(true);
  });
});
