export type FolderOptionValueMode = "path" | "basename";

export function folderOptionValue(filePath: string, basename: string, mode: FolderOptionValueMode, wikilink: boolean): string {
  const raw = mode === "path" ? filePath : basename;
  if (!wikilink) return raw;
  const target = mode === "path" ? filePath.replace(/\.md$/i, "") : basename;
  return `[[${target}]]`;
}
