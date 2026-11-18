import { describe, expect, it } from "vitest";
import { components, presets, type as typography } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../../../test/render";

describe("KitRow first-line geometry", () => {
  it.each(presets)("centres ranked content together in $id", ({ id: preset }) => {
    const html = renderInstance("List", components.List.examples[5], "filled", {
      preset,
      mode: "light",
      accent: "moss",
    });
    const row = elementAt(html, "home/c1/r1/root");
    const content = row.children[0]!;
    expect(styleAt(html, row)).toContain("align-items:center");
    expect(styleAt(html, content)).toContain("align-items:flex-start");
    for (const edge of [content.children[0]!, content.children[2]!]) {
      expect(styleAt(html, edge)).toContain(`height:${typography.body.lineHeight}px`);
      expect(styleAt(html, edge)).toContain("justify-content:center");
    }
  });

  it.each(["large", "inline", "back"] as const)("uses the %s Header's first line", (style) => {
    const html = renderInstance(
      "Header",
      { style, title: "Title", sub: "Detail", action: { icon: "plus", label: "Add" } },
      "filled",
      { preset: "bold", mode: "light", accent: "moss" },
    );
    const content = elementAt(html, "home/c1/root").children[0]!;
    const line = typography[style === "large" ? "title" : "heading"].lineHeight;
    expect(styleAt(html, content.children.at(-1)!)).toContain(`height:${line}px`);
    if (style === "back") expect(styleAt(html, content.children[0]!)).toContain(`height:${line}px`);
  });
});

describe("KitRow inline static composition", () => {
  it.each([false, true])("keeps toast controls together, undo=%s", (undo) => {
    for (const title of ["Saved", "The requested changes have been saved"]) {
      const html = renderInstance("Success", { style: "toast", title, sub: "Details", undo }, "filled", {
        preset: "bold",
        mode: "dark",
        accent: "moss",
      });
      const root = elementAt(html, "home/c1/root");
      const row = root.children[0]!;
      const content = row.children[0]!;
      const trailing = content.children.at(-1)!.children[0]!;
      expect(row.attributes).toContain('role="text"');
      expect(styleAt(html, row)).toContain("padding-top:0px");
      expect(styleAt(html, trailing)).toContain("flex-direction:row");
      expect(trailing.children).toHaveLength(undo ? 2 : 1);
      for (const control of trailing.children) {
        expect(control.attributes).toContain('role="button"');
        expect(styleAt(html, control)).toContain("min-height:44px");
        expect(styleAt(html, control)).toContain("min-width:44px");
      }
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html).toContain('data-testid="home/c1/title"');
      expect(html).toContain('data-testid="home/c1/sub"');
    }
  });
});
