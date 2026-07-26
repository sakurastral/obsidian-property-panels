import { describe, expect, it } from "vitest";
import { panelHeaderState } from "../src/components/panel-header";

describe("panel header", () => {
  it("omits the header when the panel name is blank and it is not collapsible", () => {
    expect(panelHeaderState("   ", false)).toEqual({ title: "", visible: false });
  });

  it("keeps a titleless header when the collapse control is needed", () => {
    expect(panelHeaderState("", true)).toEqual({ title: "", visible: true });
  });

  it("trims and displays a configured panel name", () => {
    expect(panelHeaderState("  Summary  ", false)).toEqual({ title: "Summary", visible: true });
  });
});
