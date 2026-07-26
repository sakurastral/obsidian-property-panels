import { describe, expect, it } from "vitest";
import { isInPanelRun } from "../src/placement/position-resolver";

interface FakeElement {
  panel: boolean;
  nextElementSibling: FakeElement | null;
  previousElementSibling: FakeElement | null;
  matches: (selector: string) => boolean;
}

const element = (panel: boolean): FakeElement => ({
  panel,
  nextElementSibling: null,
  previousElementSibling: null,
  matches(selector) {
    return selector === ".property-panels-root" && this.panel;
  }
});

const connect = (...items: FakeElement[]): void => {
  items.forEach((item, index) => {
    item.previousElementSibling = items[index - 1] ?? null;
    item.nextElementSibling = items[index + 1] ?? null;
  });
};

describe("panel placement runs", () => {
  it("treats every contiguous panel at one insertion point as already placed", () => {
    const first = element(true);
    const second = element(true);
    const third = element(true);
    const content = element(false);
    connect(first, second, third, content);

    expect(isInPanelRun(first as unknown as Element, second as unknown as HTMLElement, "nextElementSibling")).toBe(true);
    expect(isInPanelRun(first as unknown as Element, third as unknown as HTMLElement, "nextElementSibling")).toBe(true);
  });

  it("stops when an ordinary content element separates panel groups", () => {
    const first = element(true);
    const content = element(false);
    const detachedPanel = element(true);
    connect(first, content, detachedPanel);

    expect(isInPanelRun(first as unknown as Element, detachedPanel as unknown as HTMLElement, "nextElementSibling")).toBe(false);
  });
});
