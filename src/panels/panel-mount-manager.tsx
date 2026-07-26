import { createRoot, type Root } from "react-dom/client";
import type { MarkdownView, TFile } from "obsidian";
import type { ConfigResolver } from "../config/config-resolver";
import { PropertyPanel } from "../components/property-panel";
import type { OptionService } from "../options/option-service";
import { PositionResolver } from "../placement/position-resolver";
import type { PropertyRepository } from "../properties/property-repository";

interface MountedPanel { key: string; container: HTMLElement; root: Root; view: MarkdownView; panelId: string }
interface ObservedView { observer: MutationObserver; timer?: number }
export interface MountDiagnostics {
  mountedPanels: number;
  observedViews: number;
  disconnectedContainers: number;
}

export class PanelMountManager {
  private readonly mounted = new Map<string, MountedPanel>();
  private readonly observed = new Map<MarkdownView, ObservedView>();
  private readonly viewIds = new WeakMap<MarkdownView, string>();
  constructor(
    private readonly config: ConfigResolver,
    private readonly repository: PropertyRepository,
    private readonly options: OptionService,
    private readonly resolver: PositionResolver,
    private readonly saveDelay: () => number
  ) {}

  refresh(view: MarkdownView): void {
    const file = view.file;
    if (!file) { this.unmountView(view); return; }
    this.observe(view);
    const resolved = this.config.resolve(file.path);
    const activeKeys = new Set<string>();
    for (const panel of resolved.panels.filter((item) => item.enabled)) {
      const key = this.key(view, file, panel.id);
      activeKeys.add(key);
      const placement = this.resolver.resolve(view, panel.position);
      if (!placement) continue;
      let mounted = this.mounted.get(key);
      if (!mounted || !mounted.container.isConnected) {
        if (mounted) mounted.root.unmount();
        const container = document.createElement("div");
        container.className = "property-panels-root";
        container.dataset.propertyPanelId = panel.id;
        container.dataset.propertyPanelKey = key;
        this.resolver.place(container, placement);
        mounted = { key, container, root: createRoot(container), view, panelId: panel.id };
        this.mounted.set(key, mounted);
      } else {
        this.resolver.place(mounted.container, placement);
      }
      const panelGap = panel.layout?.panelGap ?? resolved.layout.panelGap ?? 12;
      mounted.container.style.setProperty("--property-panels-panel-gap", `${panelGap}px`);
      mounted.root.render(<PropertyPanel file={file} panel={panel} layout={resolved.layout} repository={this.repository} options={this.options} saveDelay={this.saveDelay()} />);
    }
    for (const [key, item] of this.mounted) if (item.view === view && !activeKeys.has(key)) this.unmount(key);
  }

  refreshAll(views: MarkdownView[]): void {
    const active = new Set(views);
    for (const view of [...this.observed.keys()]) if (!active.has(view)) this.unmountView(view);
    views.forEach((view) => this.refresh(view));
  }
  unmountView(view: MarkdownView): void {
    for (const [key, item] of this.mounted) if (item.view === view) this.unmount(key);
    const observed = this.observed.get(view);
    if (observed) { observed.observer.disconnect(); window.clearTimeout(observed.timer); this.observed.delete(view); }
  }
  destroy(): void {
    [...this.mounted.keys()].forEach((key) => this.unmount(key));
    for (const view of [...this.observed.keys()]) this.unmountView(view);
  }
  getDiagnostics(): MountDiagnostics {
    return {
      mountedPanels: this.mounted.size,
      observedViews: this.observed.size,
      disconnectedContainers: [...this.mounted.values()].filter((item) => !item.container.isConnected).length
    };
  }

  private observe(view: MarkdownView): void {
    if (this.observed.has(view)) return;
    const target = view.containerEl.querySelector<HTMLElement>(".view-content") ?? view.containerEl;
    const state: ObservedView = { observer: new MutationObserver((records) => {
      const external = records.some((record) => !(record.target instanceof Element) || !record.target.closest(".property-panels-root"));
      if (!external) return;
      window.clearTimeout(state.timer);
      state.timer = window.setTimeout(() => this.refresh(view), 100);
    }) };
    state.observer.observe(target, { childList: true, subtree: true });
    this.observed.set(view, state);
  }
  private unmount(key: string): void {
    const item = this.mounted.get(key);
    if (!item) return;
    item.root.unmount(); item.container.remove(); this.mounted.delete(key);
  }
  private key(view: MarkdownView, file: TFile, panelId: string): string {
    let viewId = this.viewIds.get(view);
    if (!viewId) { viewId = crypto.randomUUID(); this.viewIds.set(view, viewId); }
    return `${viewId}:${file.path}:${panelId}`;
  }
}
