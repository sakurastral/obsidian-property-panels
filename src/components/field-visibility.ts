import type { PropertyFieldType, PropertyValue } from "../types";

export function isEmptyPropertyValue(value: PropertyValue): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function shouldRenderField(type: PropertyFieldType, showWhenEmpty: boolean, value: PropertyValue): boolean {
  return type === "divider" || showWhenEmpty || !isEmptyPropertyValue(value);
}
