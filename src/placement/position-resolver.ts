import type { MarkdownView } from "obsidian";
import type { PanelPosition } from "../types";

export interface Placement {
  parent: HTMLElement;
  reference: Element | null;
  where: "before" | "after" | "prepend" | "append";
  resolvedBy: string;
}

const SELECTORS = {
  properties: [".metadata-container", ".markdown-preview-section > .metadata-container", ".cm-editor .metadata-container"],
  linkedMentions: [".embedded-backlinks", ".backlink-pane", ".workspace-leaf-content[data-type='backlink']"],
  readingContent: [".markdown-preview-sizer", ".markdown-preview-section"],
  editingContent: [".cm-sizer", ".markdown-source-view"]
} as const;

/** Isolates all version-sensitive Obsidian DOM selectors and fallback behavior. */
export class PositionResolver {
  constructor(private readonly debug: (message: string) => void) {}

  resolve(view: MarkdownView, position: PanelPosition): Placement | null {
    const root = view.containerEl;
    const properties = this.find(root, SELECTORS.properties);
    const linked = this.find(root, SELECTORS.linkedMentions);
    const content = this.find(root, view.getMode() === "preview" ? SELECTORS.readingContent : SELECTORS.editingContent);
    const scrollHost = content ?? root.querySelector<HTMLElement>(".view-content");
    if (!scrollHost) { this.debug(`No scroll content found for ${position}`); return null; }

    if (position.includes("properties") && properties?.parentElement) {
      return { parent: properties.parentElement, reference: properties, where: position.startsWith("before") ? "before" : "after", resolvedBy: "properties selector" };
    }
    if (position.includes("linked-mentions") && linked?.parentElement) {
      return { parent: linked.parentElement, reference: linked, where: position.startsWith("before") ? "before" : "after", resolvedBy: "linked mentions selector" };
    }
    if (position === "before-content") return { parent: scrollHost, reference: scrollHost.firstElementChild, where: "prepend", resolvedBy: "content fallback" };
    if (position === "after-content") return { parent: scrollHost, reference: null, where: "append", resolvedBy: "content fallback" };
    if (position === "before-linked-mentions") return { parent: scrollHost, reference: null, where: "append", resolvedBy: "missing linked mentions fallback" };
    if (position === "after-linked-mentions") return { parent: scrollHost, reference: null, where: "append", resolvedBy: "missing linked mentions fallback" };
    return {
      parent: scrollHost,
      reference: position === "before-properties" ? scrollHost.firstElementChild : properties?.nextElementSibling ?? scrollHost.firstElementChild,
      where: position === "before-properties" ? "prepend" : "before",
      resolvedBy: "missing properties fallback"
    };
  }

  place(container: HTMLElement, placement: Placement): void {
    if (this.isPlaced(container, placement)) return;
    if (placement.where === "prepend") placement.parent.prepend(container);
    else if (placement.where === "append") placement.parent.append(container);
    else if (placement.reference) placement.reference[placement.where](container);
    else placement.parent.append(container);
  }

  private isPlaced(container: HTMLElement, placement: Placement): boolean {
    if (container.parentElement !== placement.parent) return false;
    if (placement.where === "prepend") return placement.parent.firstElementChild === container;
    if (placement.where === "append") return placement.parent.lastElementChild === container;
    if (!placement.reference) return false;
    return placement.where === "before"
      ? placement.reference.previousElementSibling === container
      : placement.reference.nextElementSibling === container;
  }

  private find(root: HTMLElement, selectors: readonly string[]): HTMLElement | null {
    for (const selector of selectors) {
      const match = root.querySelector<HTMLElement>(selector);
      if (match) return match;
    }
    return null;
  }
}
