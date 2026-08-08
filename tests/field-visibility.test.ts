import { describe, expect, it } from "vitest";
import { fieldsToRender, isEmptyPropertyValue, shouldRenderField } from "../src/components/field-visibility";
import type { PropertyFieldConfig } from "../src/types";

const field = (id: string, showWhenEmpty = true): PropertyFieldConfig => ({
  id,
  property: id,
  type: "text",
  labelDisplay: "visible",
  editable: true,
  visible: true,
  longText: "wrap",
  columnSpan: 1,
  showWhenEmpty
});

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

  it("filters filled values when a panel shows only empty fields", () => {
    const fields = [field("empty"), field("filled")];
    const values = new Map([["empty", ""], ["filled", "value"]]);
    expect(fieldsToRender(fields, true, (item) => values.get(item.id)).map((item) => item.id)).toEqual(["empty"]);
  });

  it("keeps field-level empty visibility and panel visibility compatible", () => {
    const fields = [field("hidden-empty", false), field("filled")];
    const values = new Map([["hidden-empty", ""], ["filled", "value"]]);
    expect(fieldsToRender(fields, true, (item) => values.get(item.id))).toEqual([]);
  });

  it("keeps dividers only while an empty field remains", () => {
    const divider: PropertyFieldConfig = {
      ...field("divider"),
      property: "",
      type: "divider",
      labelDisplay: "hidden",
      editable: false,
      columnSpan: 12
    };
    const emptyFields = [divider, field("empty")];
    expect(fieldsToRender(emptyFields, true, (item) => item.id === "empty" ? "" : undefined).map((item) => item.id)).toEqual(["divider", "empty"]);
    expect(fieldsToRender([divider, field("filled")], true, (item) => item.id === "filled" ? "value" : undefined)).toEqual([]);
  });
});
