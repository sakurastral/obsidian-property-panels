export interface SettingsViewState {
  scrollHost: HTMLElement;
  scrollTop: number;
  openDetails: Map<string, boolean>;
}

/** Captures transient UI state before the imperative settings page is rebuilt. */
export function captureSettingsViewState(container: HTMLElement): SettingsViewState {
  const scrollHost = findScrollHost(container);
  const openDetails = new Map<string, boolean>();
  container.querySelectorAll<HTMLDetailsElement>("details[data-property-panels-editor-key]").forEach((details) => {
    const key = details.dataset.propertyPanelsEditorKey;
    if (key) openDetails.set(key, details.open);
  });
  return { scrollHost, scrollTop: scrollHost.scrollTop, openDetails };
}

export function restoreSettingsViewState(container: HTMLElement, state: SettingsViewState): void {
  container.querySelectorAll<HTMLDetailsElement>("details[data-property-panels-editor-key]").forEach((details) => {
    const key = details.dataset.propertyPanelsEditorKey;
    if (key && state.openDetails.has(key)) details.open = state.openDetails.get(key) ?? false;
  });
  state.scrollHost.scrollTop = state.scrollTop;
}

function findScrollHost(container: HTMLElement): HTMLElement {
  let current: HTMLElement | null = container;
  while (current) {
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (style && /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) return current;
    current = current.parentElement;
  }
  return container;
}
