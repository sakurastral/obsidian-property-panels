import type { MarkdownViewModeType } from "obsidian";

export function shouldMountPanels(mode: MarkdownViewModeType, isLivePreview: boolean, showInSourceView: boolean): boolean {
  return mode !== "source" || isLivePreview || showInSourceView;
}
