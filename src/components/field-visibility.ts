import type { PropertyFieldConfig, PropertyFieldType, PropertyValue } from "../types";

export function isEmptyPropertyValue(value: PropertyValue): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function shouldRenderField(
  type: PropertyFieldType,
  showWhenEmpty: boolean,
  value: PropertyValue,
  showOnlyEmpty = false
): boolean {
  if (type === "divider") return true;
  const empty = isEmptyPropertyValue(value);
  if (showOnlyEmpty && !empty) return false;
  return showWhenEmpty || !empty;
}

export function fieldsToRender(
  fields: PropertyFieldConfig[],
  showOnlyEmpty: boolean,
  readValue: (field: PropertyFieldConfig) => PropertyValue
): PropertyFieldConfig[] {
  const visible = fields.filter((field) => field.visible);
  if (!showOnlyEmpty) return visible;

  const emptyFieldIds = new Set(visible
    .filter((field) => field.type !== "divider" && shouldRenderField(field.type, field.showWhenEmpty, readValue(field), true))
    .map((field) => field.id));
  if (emptyFieldIds.size === 0) return [];
  return visible.filter((field) => field.type === "divider" || emptyFieldIds.has(field.id));
}
