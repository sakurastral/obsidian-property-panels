import { describe, expect, it } from "vitest";
import { panelHeaderState } from "../src/components/panel-header";

describe("panel header", () => {
  it("omits the header when the panel name is blank and it is not collapsible", () => {
    expect(panelHeaderState("   ", false, true)).toEqual({ title: "", visible: false });
  });

  it("keeps a titleless header when the collapse control is needed", () => {
    expect(panelHeaderState("", true, true)).toEqual({ title: "", visible: true });
  });

  it("trims and displays a configured panel name", () => {
    expect(panelHeaderState("  Summary  ", false, true)).toEqual({ title: "Summary", visible: true });
  });

  it("hides a configured title while preserving collapse controls", () => {
    expect(panelHeaderState("Summary", true, false)).toEqual({ title: "", visible: true });
    expect(panelHeaderState("Summary", false, false)).toEqual({ title: "", visible: false });
  });
});
