import { describe, expect, it } from "vitest";
import { components, presets, size, space, type as typography, variants } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../../../test/render";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { KitCheck, KitProvider, PartScope } from "@lmthing/ui/kit";
import { config } from "../../../../test/render";

function renderCheck(props: Parameters<typeof KitCheck>[0]) {
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config },
      createElement(
        KitProvider,
        { theme: { preset: "calm", mode: "light", accent: "moss" }, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", item: "r1", rev: 1, state: "filled", children: null },
          createElement(KitCheck, props),
        ),
      ),
    ),
  );
}

describe("KitCheck options", () => {
  it.each([false, true])("draws editable, disabled and readonly checks, done=%s", (done) => {
    for (const disabled of [false, true]) {
      for (const readonly of [false, true]) {
        const html = renderCheck({ done, disabled, readonly, label: "Caller label" });
        const node = elementAt(html, "home/c1/r1/check");
        expect(node.attributes).toContain(`role="${readonly ? "img" : "checkbox"}"`);
        expect(node.attributes).toContain('aria-label="Caller label"');
        if (readonly) expect(node.attributes).not.toContain("aria-checked");
        else expect(node.attributes).toContain(`aria-checked="${done}"`);
        if (disabled) expect(node.attributes).toContain('aria-disabled="true"');
        expect(styleAt(html, node)).toContain(`width:${size.control.md}px`);
        expect(styleAt(html, node)).toContain(`height:${size.control.md}px`);
        expect(node.children[0]!.children).toHaveLength(done ? 1 : 0);
      }
    }
    const implicit = renderCheck({ done });
    expect(implicit).toBe(renderCheck({ done, disabled: false, readonly: false }));
  });
});

const galleryCases = presets.flatMap(({ id: preset }) =>
  (["light", "dark"] as const).flatMap((mode) =>
    (["grid", "strip", "carousel"] as const).flatMap((layout) =>
      [2, 3, 4, 5, 6].map((count) => ({ preset, mode, layout, count })),
    ),
  ),
);
describe("Gallery loading geometry", () => {
  it.each(galleryCases)(
    "matches $count $layout cells in $preset/$mode",
    ({ preset, mode, layout, count }) => {
      const photos = Array.from({ length: count }, (_, index) => ({
        photo: "lib:entry",
        caption: index % 2 ? undefined : "Caller caption",
      }));
      const theme = { preset, mode, accent: "moss" } as const;
      const input = { ...(layout === "carousel" ? { style: layout } : { arrange: layout }), photos };
      const html = renderInstance("Gallery", input, "loading", theme);
      const filled = renderInstance("Gallery", input, "filled", theme);
      const root = elementAt(html, "home/c1/root");
      expect(styleAt(html, root)).toContain("padding-left:0px");
      expect(styleAt(html, root)).toContain("padding-right:0px");
      expect(styleAt(html, root)).toBe(styleAt(filled, "home/c1/root"));
      expect(styleAt(html, root.children[0]!)).toBe(
        styleAt(filled, elementAt(filled, "home/c1/root").children[0]!),
      );
      const shapes = descendants(root).filter((node) => node.attributes.includes('aria-busy="true"'));
      expect(shapes).toHaveLength(count);
      for (const [index, shape] of shapes.entries()) {
        const caption = photos[index]!.caption;
        expect(styleAt(html, shape)).toContain("padding-left:0px");
        expect(styleAt(html, shape)).toContain(`gap:${caption ? space.xs : 0}px`);
        expect(styleAt(html, shape.children[0]!)).toContain(
          `aspect-ratio:${layout === "carousel" ? 16 / 9 : 1}`,
        );
        expect(shape.children).toHaveLength(caption ? 2 : 1);
        if (caption) {
          const content = shape.children[1]!.children[0]!;
          expect(content.children).toHaveLength(1);
          const text = content.children[0]!.children[0]!.children[0]!;
          expect(styleAt(html, text)).toContain(`line-height:${typography.caption.lineHeight}px`);
          expect(styleAt(html, text)).toContain(`font-size:${typography.caption.size}px`);
        }
      }
      expect(html).not.toContain('data-testid="home/c1/r1/photo"');
      expect(html).not.toContain('role="link"');
    },
  );
});

function descendants(node: ReturnType<typeof elementAt>): ReturnType<typeof elementAt>[] {
  return [node, ...node.children.flatMap(descendants)];
}

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
        const { items, density = "comfortable" } = components.Checklist.props.parse(input);
        const steps = variants.density[density].text;
        items.forEach(({ meta }, index) => {
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
          const bodyHeight = typography[steps.body].lineHeight;
          expect(styleAt(loading, row.children[0]!)).toContain(`height:${bodyHeight}px`);
          expect(styleAt(loading, row.children[0]!.children[0]!)).toContain(`width:${size.icon.lg}px`);
          expect(styleAt(loading, content.children[0]!.children[0]!.children[0]!)).toContain(
            `line-height:${bodyHeight}px`,
          );
          if (meta)
            expect(styleAt(loading, content.children[1]!.children[0]!.children[0]!)).toContain(
              `line-height:${typography[steps.caption].lineHeight}px`,
            );
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
