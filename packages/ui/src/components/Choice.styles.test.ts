import { describe, expect, it } from "vitest";
import { component, components, size, type as typography } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Choice filled layout", () => {
  it.each(["cards", "list"])("reserves the same icon column in %s options", (style) => {
    const html = renderInstance(
      "Choice",
      {
        style,
        options: [
          { title: "First", sub: "First detail", icon: "drop" },
          { title: "Second", sub: "Second detail" },
        ],
      },
      "filled",
      theme,
    );
    for (const item of ["r1", "r2"]) {
      const row = elementAt(html, `home/c1/${item}/root`);
      const header = row.children[0]!;
      expect(styleAt(html, header.children[0]!)).toContain(`width:${size.icon.lg}px`);
      expect(styleAt(html, header.children[0]!)).toContain(`height:${typography.body.lineHeight}px`);
      expect(styleAt(html, row.children[1]!)).toContain(`padding-left:${component.base.optionLead}px`);
    }
    expect(html.match(/data-testid="home\/c1\/r\d\/icon"/g)).toHaveLength(1);
  });
  it("keeps the description outside the price and selection columns", () => {
    const html = renderInstance("Choice", components.Choice.examples[1], "filled", theme);
    const row = elementAt(html, "home/c1/r2/root");
    const header = row.children[0]!;
    const trailing = header.children.at(-1)!;
    expect(styleAt(html, trailing)).toContain(`height:${typography.body.lineHeight}px`);
    expect(trailing.children[0]!.attributes).toContain('data-testid="home/c1/r2/value"');
    expect(row.children[1]!.children.at(-1)!.attributes).toContain('data-testid="home/c1/r2/sub"');
    expect(styleAt(html, row.children[1]!)).not.toMatch(/padding-right:[1-9]/);
  });
  it("matches List's item text roles while keeping the question at the screen gutter", () => {
    const html = renderInstance("Choice", components.Choice.examples[0], "filled", theme);
    const list = renderInstance("List", components.List.examples[0], "filled", theme);
    expect(styleAt(html, "home/c1/root")).toContain("padding-left:0px");
    for (const [part, reference] of [
      ["title", "title"],
      ["sub", "meta"],
    ]) {
      const font = /font-size:([^;]+)/;
      expect(styleAt(html, `home/c1/r1/${part}`).match(font)![1]).toBe(
        styleAt(list, `home/c1/r1/${reference}`).match(font)![1],
      );
    }
    expect(styleAt(html, "home/c1/r2/root")).toContain("border-left-width:0px");
    expect(styleAt(html, "home/c1/r1/root")).toContain("border-left-width:0px");
  });
});
