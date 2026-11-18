import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { components, presets, themeName, type as typography } from "@lmthing/ui/catalog";
import {
  createScreenController,
  KitProvider,
  KitRow,
  KitText,
  PartScope,
  type ScreenController,
} from "@lmthing/ui/kit";
import * as parts from "../../part";
import { config, elementAt, renderInstance, styleAt } from "../../../../test/render";

function renderRow(row: Parameters<typeof KitRow>[0], controller?: ScreenController) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, interactive: true, controller, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "s1", rev: 1, state: "filled", children: null },
          createElement(KitRow, row),
        ),
      ),
    ),
  );
}
const label = createElement(KitText, { part: "name", children: "Choice" });

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

describe("KitRow named non-item controls", () => {
  it("keeps omitted-part rows static and item roots addressed without changing geometry", () => {
    const spy = vi.spyOn(parts, "usePart");
    try {
      const input = { label: "Choice", children: label };
      const staticHtml = renderRow(input);
      expect(staticHtml).not.toContain('data-testid="home/s1/root"');
      expect(staticHtml).toContain('role="text"');
      expect(spy).toHaveBeenCalledWith("root", false);
      const itemHtml = renderRow({ ...input, item: "r1", role: "button" });
      expect(spy).toHaveBeenCalledWith("root", true);
      const namedHtml = renderRow({ ...input, part: "anyone", role: "button" });
      expect(spy).toHaveBeenCalledWith("anyone", true);
      expect(namedHtml.match(/data-testid="home\/s1\/anyone"/g)).toHaveLength(1);
      expect(namedHtml).not.toContain("home/s1/anyone/root");
      expect(elementAt(namedHtml, "home/s1/anyone").attributes).toContain('role="button"');
      expect(styleAt(namedHtml, "home/s1/anyone")).toBe(styleAt(itemHtml, "home/s1/r1/root"));
    } finally {
      spy.mockRestore();
    }
  });
  it("dispatches a named choice through the same controller press path as staff", () => {
    const controller = createScreenController({
      defs: components,
      requireMounted: true,
      screen: {
        id: "home",
        components: [{ id: "s1", c: "StaffPicker", ...components.StaffPicker.examples[0], at: 1 }],
      },
    });
    const html = renderRow({ part: "anyone", role: "button", label: "Anyone", children: label }, controller);
    const address = elementAt(html, "home/s1/anyone").attributes.match(/data-testid="([^"]+)"/)![1]!;
    expect(controller.press(address)).toMatchObject({ ok: false, code: "not_mounted" });
    const unregister = controller.registerPart(address);
    expect(controller.press(address)).toMatchObject({ ok: true });
    expect(controller.snapshotScreen().components[0]!.at).toBe(0);
    unregister();
    expect(controller.press(address)).toMatchObject({ ok: false, code: "not_mounted" });
    controller.dispose();
  });
  it.each(presets)("uses the same avatar and primary label slots for Anyone and staff in $id", ({ id }) => {
    for (const mode of ["light", "dark"] as const) {
      const html = renderInstance("StaffPicker", components.StaffPicker.examples[0], "filled", {
        preset: id,
        mode,
        accent: "moss",
      });
      const anyone = elementAt(html, "home/c1/anyone");
      const staff = elementAt(html, "home/c1/r1/root");
      expect(styleAt(html, anyone)).toBe(styleAt(html, staff));
      expect(styleAt(html, "home/c1/anyone_name")).toBe(styleAt(html, "home/c1/r1/name"));
      for (const row of [anyone, staff]) {
        const body = row.children[0]!.children[0]!;
        expect(body.children).toHaveLength(2);
        expect(body.children[0]!.attributes).toContain('role="img"');
      }
    }
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
