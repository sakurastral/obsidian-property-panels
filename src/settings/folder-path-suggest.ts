import { AbstractInputSuggest, TFolder, type App } from "obsidian";

export type FolderSuggestAttacher = (input: HTMLInputElement, onSelect: (path: string) => void) => void;

/** Inline Vault folder suggestions for settings text inputs. */
export class FolderPathSuggest extends AbstractInputSuggest<TFolder> {
  private readonly input: HTMLInputElement;

  constructor(app: App, input: HTMLInputElement, private readonly selectPath: (path: string) => void) {
    super(app, input);
    this.input = input;
    this.limit = 100;
  }

  protected getSuggestions(query: string): TFolder[] {
    const normalized = normalize(query);
    return this.app.vault.getAllFolders(true)
      .filter((folder) => normalized === "" || normalize(folder.path).includes(normalized))
      .sort((a, b) => rank(a.path, normalized) - rank(b.path, normalized) || a.path.localeCompare(b.path));
  }

  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.createDiv({ text: folder.isRoot() ? "Vault root" : folder.name, cls: "property-panels-folder-suggest-name" });
    el.createEl("small", { text: folder.isRoot() ? "/" : folder.path, cls: "property-panels-folder-suggest-path" });
  }

  selectSuggestion(folder: TFolder): void {
    const path = folder.isRoot() ? "" : folder.path;
    this.setValue(path);
    this.selectPath(path);
    this.close();
  }
}

const normalize = (value: string): string => value.toLocaleLowerCase().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
const rank = (path: string, query: string): number => {
  if (!query) return path.split("/").length;
  const normalized = normalize(path);
  if (normalized === query) return 0;
  if (normalized.startsWith(query)) return 1;
  if (normalized.split("/").some((part) => part.startsWith(query))) return 2;
  return 3;
};
