import type { OptionSourceConfig } from "../types";

export function optionSourceDependsOnPath(source: OptionSourceConfig, changedPath: string): boolean {
  if (source.type === "static" || source.type === "bases") return false;
  const changed = normalize(changedPath);
  if (source.type === "file-property" || source.type === "markdown-list") return normalize(source.path) === changed;
  const folder = normalize(source.path);
  if (changed === folder) return true;
  if (folder && !changed.startsWith(`${folder}/`)) return false;
  if (!folder && changed === "") return true;
  const relative = folder ? changed.slice(folder.length + 1) : changed;
  return source.recursive || !relative.includes("/");
}

const normalize = (value: string): string => value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
