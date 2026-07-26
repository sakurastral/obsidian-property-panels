import { BasesView, type BasesAllOptions, type QueryController } from "obsidian";
import type { OptionItem } from "../types";
import type { BasesOptionCache } from "./bases-option-cache";

export const PROPERTY_PANELS_BASES_VIEW = "property-panels-options";

export const basesViewOptions = (): BasesAllOptions[] => [
  {
    type: "text",
    key: "cacheKey",
    displayName: "Property Panels cache key",
    placeholder: "System/Categories.base"
  },
  {
    type: "property",
    key: "valueProperty",
    displayName: "Option value property",
    default: "file.path"
  },
  {
    type: "property",
    key: "labelProperty",
    displayName: "Option label property",
    default: "file.name"
  }
];

/**
 * Custom Bases view that publishes the current query result to OptionService.
 * The cache remains available while the plugin is loaded, even after this view closes.
 */
export class PropertyPanelsBasesView extends BasesView {
  readonly type = PROPERTY_PANELS_BASES_VIEW;
  private readonly container: HTMLElement;

  constructor(controller: QueryController, container: HTMLElement, private readonly cache: BasesOptionCache) {
    super(controller);
    this.container = container;
  }

  onDataUpdated(): void {
    const key = String(this.config.get("cacheKey") ?? "").trim();
    const valueProperty = this.config.getAsPropertyId("valueProperty");
    const labelProperty = this.config.getAsPropertyId("labelProperty");
    const items: OptionItem[] = this.data.data.map((entry) => {
      const value = valueProperty ? entry.getValue(valueProperty)?.toString() : entry.file.path;
      const label = labelProperty ? entry.getValue(labelProperty)?.toString() : entry.file.basename;
      return { value: value || entry.file.path, label: label || value || entry.file.basename };
    });
    if (key) this.cache.set(key, items);
    this.renderStatus(key, items);
  }

  private renderStatus(key: string, items: OptionItem[]): void {
    this.container.empty();
    const root = this.container.createDiv({ cls: "property-panels-bases-view" });
    root.createEl("h3", { text: "Property Panels option cache" });
    if (!key) {
      root.createEl("p", { text: "Set “Property Panels cache key” in this view's options before using it as an option source.", cls: "property-panels-bases-warning" });
      return;
    }
    root.createEl("p", { text: `${items.length} option${items.length === 1 ? "" : "s"} cached as “${key}”.` });
    const list = root.createEl("ul");
    items.slice(0, 20).forEach((item) => list.createEl("li", { text: item.label === item.value ? item.value : `${item.label} — ${item.value}` }));
    if (items.length > 20) root.createEl("p", { text: `…and ${items.length - 20} more.` });
  }
}
