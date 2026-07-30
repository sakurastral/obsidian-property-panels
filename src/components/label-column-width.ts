const LABEL_COLUMN_PADDING = 8;

export function calculateLabelColumnWidth(widths: readonly number[], padding = LABEL_COLUMN_PADDING): number | undefined {
  if (widths.length === 0) return undefined;
  return Math.ceil(Math.max(...widths) + Math.max(0, padding));
}

export function syncLabelColumnWidth(panel: HTMLElement): void {
  const labels = Array.from(panel.querySelectorAll<HTMLElement>(
    ".property-panels-field > label:not(.property-panels-visually-hidden)"
  ));
  const width = calculateLabelColumnWidth(labels.map((label) => label.scrollWidth));
  if (width === undefined) {
    panel.style.removeProperty("--property-panels-label-column-width");
    return;
  }
  const value = `${width}px`;
  if (panel.style.getPropertyValue("--property-panels-label-column-width") !== value) {
    panel.style.setProperty("--property-panels-label-column-width", value);
  }
}
