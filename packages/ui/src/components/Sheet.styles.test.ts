import { describe, expect, it } from "vitest";
import { components, space } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../test/render";

describe("Sheet filled layout", () => {
  it.each(["calm", "bold", "editorial"] as const)("shares %s card surfaces and corner tokens", (preset) => {
    const theme = { preset, mode: "light", accent: "moss" } as const;
    const html = renderInstance("Sheet", components.Sheet.examples[0], "filled", theme);
    const css = styleAt(html, "home/c1/root");
    expect(css).toContain("--surface");
    expect(css).not.toContain("--raised");
    const list = renderInstance("List", components.List.examples[0], "filled", theme);
    for (const edge of ["left", "right"]) {
      const property = `border-top-${edge}-radius`;
      const corner = styleAt(list, "home/c1/root").match(new RegExp(`${property}:([^;]+)`))![1];
      expect(css).toContain(`${property}:${corner}`);
    }
    expect(styleAt(html, elementAt(html, "home/c1/root").children[0]!)).toContain(`height:${space.xs}px`);
    expect(elementAt(html, "home/c1/close_icon").children[0]!.attributes).toContain('stroke="var(--muted)"');
    expect(styleAt(html, "home/c1/action_label")).toContain("--onAccent");
  });
  it("removes the extra row inset for an icon-free picker", () => {
    const html = renderInstance("Sheet", components.Sheet.examples[1], "filled", {
      preset: "calm",
      mode: "light",
      accent: "moss",
    });
    for (let index = 1; index <= 6; index++) {
      const css = styleAt(html, `home/c1/r${index}/root`);
      expect(css).toContain("padding-left:0px");
      expect(css).toContain("padding-right:0px");
    }
  });
});
