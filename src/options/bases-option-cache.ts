import type { OptionItem } from "../types";

/** In-memory results published by the experimental Property Panels Bases view. */
export class BasesOptionCache {
  private readonly values = new Map<string, OptionItem[]>();
  constructor(private readonly onUpdate: () => void) {}

  get(key: string): OptionItem[] | undefined {
    const items = this.values.get(normalize(key));
    return items ? items.map((item) => ({ ...item })) : undefined;
  }

  set(key: string, items: OptionItem[]): void {
    const normalized = normalize(key);
    if (!normalized) return;
    this.values.set(normalized, deduplicate(items));
    this.onUpdate();
  }

  clear(): void {
    this.values.clear();
    this.onUpdate();
  }

  getSize(): number { return this.values.size; }
}

const normalize = (value: string): string => value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
const deduplicate = (items: OptionItem[]): OptionItem[] => [...new Map(items.filter((item) => item.value !== "").map((item) => [item.value, item])).values()];
