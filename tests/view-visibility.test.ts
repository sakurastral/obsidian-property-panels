import { describe, expect, it } from "vitest";
import { shouldMountPanels } from "../src/panels/view-visibility";

describe("panel view visibility", () => {
  it("always mounts in reading view", () => {
    expect(shouldMountPanels("preview", false, false)).toBe(true);
  });

  it("keeps Live Preview visible", () => {
    expect(shouldMountPanels("source", true, false)).toBe(true);
  });

  it("can hide only plain Source Mode", () => {
    expect(shouldMountPanels("source", false, false)).toBe(false);
    expect(shouldMountPanels("source", false, true)).toBe(true);
  });
});
