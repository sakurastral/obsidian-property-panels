export function moveSelectedValue(values: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= values.length || to >= values.length) return values;
  const next = [...values];
  const [item] = next.splice(from, 1);
  if (item === undefined) return values;
  next.splice(to, 0, item);
  return next;
}

export function editSelectedValue(values: string[], index: number, value: string): string[] {
  const nextValue = value.trim();
  if (!nextValue || index < 0 || index >= values.length) return values;
  if (values.some((item, itemIndex) => itemIndex !== index && item === nextValue)) return values;
  if (values[index] === nextValue) return values;
  return values.map((item, itemIndex) => itemIndex === index ? nextValue : item);
}
