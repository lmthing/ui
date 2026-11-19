import { createElement } from "react";
import * as runtime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { size, themeName } from "@lmthing/ui/catalog";
import { KitNumberPad, KitProvider, PartScope, type ScreenController } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

vi.mock("react/jsx-dev-runtime", { spy: true });
const keys = [
  { id: "r1", label: "1", value: "1" },
  { id: "r2", label: ".", value: ".", disabled: true },
  { id: "r3", label: "⌫", value: "backspace" },
];
const input = { label: "Value", value: "12.5", keys, target: { part: "value" } };
function render(props: Parameters<typeof KitNumberPad>[0], controller?: ScreenController) {
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
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          createElement(KitNumberPad, props),
        ),
      ),
    ),
  );
}
describe("KitNumberPad", () => {
  it("draws addressed values, three equal columns and unavailable keys", () => {
    const html = render(input);
    expect(elementAt(html, "home/c1/value").attributes).not.toContain('role="button"');
    expect(html).toContain("12.5");
    for (const key of keys) {
      const node = elementAt(html, `home/c1/${key.id}/root`);
      expect(styleAt(html, node)).toContain("width:33.333");
      const hit = node.children[0]!;
      expect(hit.attributes).toContain('role="button"');
      expect(styleAt(html, hit)).toContain(`min-height:${size.control.lg}px`);
      expect(styleAt(html, hit)).toContain(`min-width:${size.control.md}px`);
    }
    expect(elementAt(html, "home/c1/r2/root").children[0]!.attributes).toContain('aria-disabled="true"');
  });
  it.each(["", "12.5"])("keeps %s value geometry and removes loading key actions", (value) => {
    const filled = render({ ...input, value });
    const loading = render({ ...input, value, loading: true });
    expect(loading).not.toContain('role="button"');
    expect(loading).not.toContain('data-testid="home/c1/r1/root"');
    expect(elementAt(loading, "home/c1/root").children[1]!.children).toHaveLength(keys.length);
    expect(elementAt(filled, "home/c1/root").children[1]!.children).toHaveLength(keys.length);
    expect(loading).toContain('aria-busy="true"');
    expect(render({ ...input, keys: [], value: "" })).toContain('data-testid="home/c1/value"');
  });
  it("dispatches caller key values to the supplied item target on press and keyboard", async () => {
    const act = vi.fn();
    const controller = { act } as unknown as ScreenController;
    const handlers: {
      onPress?: () => void;
      onKeyDown?: (event: { key: string; preventDefault(): void }) => void;
    }[] = [];
    const { jsxDEV } = await vi.importActual<typeof runtime>("react/jsx-dev-runtime");
    const spy = vi.spyOn(runtime, "jsxDEV").mockImplementation((...args) => {
      const props = args[1] as (typeof handlers)[number];
      if (props.onPress) handlers.push(props);
      return jsxDEV(...args);
    });
    try {
      render({ ...input, target: { item: "r4", part: "field" } }, controller);
    } finally {
      spy.mockRestore();
    }
    expect(handlers).toHaveLength(2);
    handlers[0]!.onPress!();
    handlers[1]!.onKeyDown!({ key: "Enter", preventDefault: vi.fn() });
    expect(act.mock.calls).toEqual([
      [{ address: "home/c1/r4/field", action: "type", value: "1" }],
      [{ address: "home/c1/r4/field", action: "type", value: "backspace" }],
    ]);
  });
});
