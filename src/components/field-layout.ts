export function effectiveColumnSpan(configuredSpan: number, columnCount: number): number {
  const columns = Math.max(1, Math.round(columnCount));
  const span = Math.max(1, Math.round(configuredSpan));
  return Math.min(span, columns);
}
