import { createElement } from "react";
import * as jsxRuntime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { components, presets, size, space, themeName, type as typography } from "@lmthing/ui/catalog";
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

vi.mock("react/jsx-dev-runtime", { spy: true });
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
it.each([0, 1] as const)("indents the addressed row's content at depth %s", (indent) => {
  const html = renderRow({ label: "Choice", children: label, item: "r1", indent });
  const content = elementAt(html, "home/s1/r1/root").children[0]!;
  const inset = new RegExp(`padding-(left|inline-start):${space.xl}px`);
  expect(inset.test(styleAt(html, content))).toBe(indent === 1);
  expect(elementAt(html, "home/s1/r1/name")).toBeDefined();
});
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

  it.each([
    { name: "default", variant: {}, role: "title" },
    { name: "quiet", variant: { emphasis: "quiet" }, role: "heading" },
    { name: "back", variant: { style: "back" }, role: "heading" },
  ] as const)("uses the $name Header's first line", ({ variant, role }) => {
    const props = { ...variant, title: "Title", sub: "Detail", action: { icon: "plus", label: "Add" } };
    const html = renderInstance("Header", props, "filled", { preset: "bold", mode: "light", accent: "moss" });
    const content = elementAt(html, "home/c1/root").children[0]!;
    const line = typography[role].lineHeight;
    expect(styleAt(html, content.children.at(-1)!)).toContain(`height:${line}px`);
    if ("style" in variant) expect(styleAt(html, content.children[0]!)).toContain(`height:${line}px`);
  });
});
describe("KitRow named non-item controls", () => {
  it("keeps omitted-part rows static and item roots addressed without changing geometry", () => {
    const spy = vi.spyOn(parts, "usePart");
    try {
      const input = { label: "Choice", children: label };
      const staticHtml = renderRow(input);
      expect(staticHtml).not.toContain('data-testid="home/s1/root"');
      expect(staticHtml).not.toContain('role="text"');
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
  it("dispatches a named choice through the same controller press path as staff", async () => {
    const controller = createScreenController({
      defs: components,
      requireMounted: true,
      screen: {
        id: "home",
        components: [{ id: "s1", c: "StaffPicker", ...components.StaffPicker.examples[0], at: 1 }],
      },
    });
    let press: (() => unknown) | undefined;
    const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
    const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
      const target = args[1] as { testID?: string; onPress?: () => unknown };
      if (target.testID === "home/s1/anyone" && target.onPress) press = target.onPress;
      return jsxDEV(...args);
    });
    let html: string;
    try {
      html = renderRow({ part: "anyone", role: "button", label: "Anyone", children: label }, controller);
    } finally {
      spy.mockRestore();
    }
    expect(press).toBeDefined();
    const address = elementAt(html, "home/s1/anyone").attributes.match(/data-testid="([^"]+)"/)![1]!;
    expect(press!()).toMatchObject({ ok: false, code: "not_mounted" });
    const unregister = controller.registerPart(address);
    expect(press!()).toMatchObject({ ok: true });
    expect(controller.snapshotScreen().components[0]!.at).toBe(0);
    unregister();
    expect(press!()).toMatchObject({ ok: false, code: "not_mounted" });
    controller.dispose();
  });
});
describe("KitRow avatar choice geometry", () => {
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
      for (const part of ["anyone_photo", "r1/photo"]) {
        const photo = elementAt(html, `home/c1/${part}`);
        expect(photo.attributes).toContain('role="img"');
        expect(styleAt(html, photo)).toContain(`height:${size.avatar.lg}px`);
        expect(styleAt(html, photo)).toContain("align-self:center");
      }
    }
  });
});
describe("KitRow status and selection", () => {
  it.each(["good", "bad"] as const)("shows %s on an explicitly plain row", (tone) => {
    const html = renderRow({ label: "Choice", children: label, item: "r1", surface: "plain", tone });
    expect(styleAt(html, elementAt(html, "home/s1/r1/root").children.at(-1)!)).toContain(`var(--${tone})`);
  });
  it.each(["text", "muted", "accent", "onAccent", "good", "warn", "bad"] as const)(
    "keeps the %s tint and geometry on selection",
    (tone) => {
      const input = { label: "Choice", children: label, tone, item: "r1", part: "summary" };
      const html = renderRow(input);
      const selected = renderRow({ ...input, selected: true });
      const row = elementAt(selected, "home/s1/r1/summary");
      expect(row.attributes).toContain('aria-current="true"');
      expect(styleAt(selected, row)).toBe(styleAt(html, "home/s1/r1/summary"));
      expect(styleAt(selected, row)).toContain("background-color:");
      expect(styleAt(selected, row.children[1]!)).toContain("position:absolute");
      expect(elementAt(selected, "home/s1/r1/name")).toBeDefined();
    },
  );
  it("can draw a selected static row without an item root address", () => {
    const html = renderRow({ label: "Choice", children: null, selected: true, item: "r1", part: null });
    expect(html).toContain('aria-current="true"');
    expect(html).not.toContain('data-testid="home/s1/r1/root"');
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
      expect(row.attributes).not.toContain('role="text"');
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
