export interface WikiLinkParts {
  target: string;
  label: string;
}

export interface DisplayLinkParts {
  kind: "internal" | "external";
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

export function parseDisplayLink(value: string): DisplayLinkParts | undefined {
  const wikiLink = parseWikiLink(value);
  if (wikiLink) return { kind: "internal", ...wikiLink };

  const trimmed = value.trim();
  const markdownLink = parseMarkdownLink(trimmed);
  if (markdownLink) return markdownLink;
  if (isHttpUrl(trimmed)) return { kind: "external", target: trimmed, label: trimmed };
  return undefined;
}

export function optionDisplayText(value: string): string {
  return parseDisplayLink(value)?.label ?? value;
}

function parseMarkdownLink(value: string): DisplayLinkParts | undefined {
  const match = value.match(/^\[([^\]]+)\]\((.+)\)$/s);
  const label = match?.[1]?.trim();
  const rawTarget = match?.[2]?.trim();
  if (!label || !rawTarget) return undefined;
  const target = rawTarget.startsWith("<") && rawTarget.endsWith(">")
    ? rawTarget.slice(1, -1).trim()
    : rawTarget;
  if (!target || (!rawTarget.startsWith("<") && /\s/.test(target))) return undefined;
  if (isHttpUrl(target)) return { kind: "external", target, label };
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return undefined;
  return { kind: "internal", target, label };
}

function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
