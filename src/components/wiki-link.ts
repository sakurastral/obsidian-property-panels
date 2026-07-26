export interface WikiLinkParts {
  target: string;
  label: string;
}

export function parseWikiLink(value: string): WikiLinkParts | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[[") || !trimmed.endsWith("]]")) return undefined;
  const content = trimmed.slice(2, -2);
  const separator = content.indexOf("|");
  const target = (separator < 0 ? content : content.slice(0, separator)).trim();
  if (!target) return undefined;
  const alias = separator < 0 ? "" : content.slice(separator + 1).trim();
  return { target, label: alias || target };
}

export function optionDisplayText(value: string): string {
  return parseWikiLink(value)?.label ?? value;
}
