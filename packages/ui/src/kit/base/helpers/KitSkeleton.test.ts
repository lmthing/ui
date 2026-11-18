import { describe, expect, it } from "vitest";
import { components, presets, size, space, type as typography } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../../../test/render";

describe("Checklist loading row geometry", () => {
  it.each(presets)("matches filled rows without inventing captions in $id", ({ id: preset }) => {
    for (const mode of ["light", "dark"] as const) {
      for (const input of [
        ...components.Checklist.examples,
        { items: [{ text: "A longer task label that should wrap", meta: "A longer optional detail" }] },
        { items: Array.from({ length: 6 }, () => ({ text: "A task", done: true })) },
      ]) {
        const theme = { preset, mode, accent: "moss" } as const;
        const loading = renderInstance("Checklist", input, "loading", theme);
        const filled = renderInstance("Checklist", input, "filled", theme);
        const skeleton = elementAt(loading, "home/c1/root").children[0]!;
        expect(styleAt(loading, skeleton)).toContain("padding-left:0px");
        expect(styleAt(loading, skeleton)).toContain("padding-top:0px");
        expect(skeleton.children).toHaveLength(input.items.length);
        input.items.forEach((item, index) => {
          const meta = "meta" in item ? item.meta : undefined;
          const row = skeleton.children[index]!;
          const content = row.children[1]!;
          const filledRow = elementAt(filled, `home/c1/r${index + 1}/root`);
          for (const edge of ["left", "right", "top", "bottom"]) {
            const rule = new RegExp(`padding-${edge}:\\s*\\d+px`);
            expect(styleAt(loading, row).match(rule)?.[0]).toBe(styleAt(filled, filledRow).match(rule)?.[0]);
          }
          expect(row.children).toHaveLength(2);
          expect(content.children).toHaveLength(meta ? 2 : 1);
          expect(styleAt(loading, row.children[0]!)).toContain(`width:${size.control.md}px`);
          expect(styleAt(loading, row.children[0]!)).toContain(`height:${typography.body.lineHeight}px`);
          expect(styleAt(loading, row.children[0]!.children[0]!)).toContain(`width:${size.icon.lg}px`);
          expect(styleAt(loading, content.children[0]!.children[0]!.children[0]!)).toContain(
            `line-height:${typography.body.lineHeight}px`,
          );
          if (meta) {
            expect(styleAt(loading, content.children[1]!.children[0]!.children[0]!)).toContain(
              `line-height:${typography.caption.lineHeight}px`,
            );
          }
        });
        expect(loading).toContain('aria-busy="true"');
        expect(loading).not.toContain('role="checkbox"');
      }
    }
  });
  it("keeps mixed photo leads at the shared thumbnail width", () => {
    const input = { rows: [{ title: "With photo", photo: "lib:people" }, { title: "Without photo" }] };
    const html = renderInstance("List", input, "loading", {
      preset: "calm",
      mode: "light",
      accent: "moss",
    });
    const rows = elementAt(html, "home/c1/root").children[0]!.children;
    for (const row of rows) {
      const lead = row.children[0]!;
      expect(styleAt(html, lead)).toContain(`width:${size.avatar.md}px`);
      expect(styleAt(html, lead.children[0]!)).toContain(`width:${size.avatar.md}px`);
    }
    expect(styleAt(html, rows[0]!)).toContain(`padding-left:${space.md}px`);
  });
});
