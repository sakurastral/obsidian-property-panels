import { AbstractInputSuggest, getIconIds, setIcon, type App, type IconName } from "obsidian";

export type IconSuggestAttacher = (input: HTMLInputElement, onSelect: (icon: string) => void) => void;

/** Autocomplete for every icon currently registered in Obsidian. */
export class IconSuggest extends AbstractInputSuggest<IconName> {
  constructor(app: App, input: HTMLInputElement, private readonly selectIcon: (icon: string) => void) {
    super(app, input);
    this.limit = 100;
  }

  protected getSuggestions(query: string): IconName[] {
    const normalized = query.trim().toLocaleLowerCase();
    return getIconIds()
      .filter((icon) => normalized === "" || icon.toLocaleLowerCase().includes(normalized))
      .sort((left, right) => rank(left, normalized) - rank(right, normalized) || left.localeCompare(right));
  }

  renderSuggestion(icon: IconName, el: HTMLElement): void {
    const preview = el.createSpan({ cls: "property-panels-icon-suggest-preview" });
    setIcon(preview, icon);
    el.createSpan({ text: icon });
  }

  selectSuggestion(icon: IconName): void {
    this.setValue(icon);
    this.selectIcon(icon);
    this.close();
  }
}

const rank = (icon: string, query: string): number => {
  if (!query) return 0;
  const normalized = icon.toLocaleLowerCase();
  if (normalized === query) return 0;
  if (normalized.startsWith(query)) return 1;
  if (normalized.split("-").some((part) => part.startsWith(query))) return 2;
  return 3;
};
