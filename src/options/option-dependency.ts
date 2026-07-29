import type { OptionSourceConfig } from "../types";

export function optionSourceKey(source: OptionSourceConfig | undefined): string {
  return JSON.stringify(source ?? null);
}

export function fileBelongsToFolder(filePath: string, folderPath: string, recursive: boolean): boolean {
  const file = normalize(filePath);
  const folder = normalize(folderPath);
  if (folder && !file.startsWith(`${folder}/`)) return false;
  const relative = folder ? file.slice(folder.length + 1) : file;
  return relative !== "" && (recursive || !relative.includes("/"));
}

export function optionSourceDependsOnPath(source: OptionSourceConfig, changedPath: string): boolean {
  if (source.type === "static") return false;
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
