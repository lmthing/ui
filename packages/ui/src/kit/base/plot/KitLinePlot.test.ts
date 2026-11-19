import { createElement } from "react";
import * as jsxRuntime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { presets, size, themeName } from "@lmthing/ui/catalog";
import { KitLinePlot, KitProvider, PartScope, type ScreenController } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

vi.mock("react/jsx-dev-runtime", { spy: true });
const series = [
  {
    id: "one",
    label: "Reading",
    points: [
      { id: "p1", x: 0, value: -2, label: "First" },
      { id: "p2", x: 1, value: null, label: "Missing" },
      { id: "p3", x: 4, value: 2, label: "Last" },
    ],
  },
];
function render(
  props: Parameters<typeof KitLinePlot>[0],
  preset = "calm",
  mode = "light",
  controller?: ScreenController,
) {
  const theme = { preset, mode, accent: "moss" } as Parameters<typeof KitProvider>[0]["theme"];
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, controller, interactive: true, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          createElement(KitLinePlot, props),
        ),
      ),
    ),
  );
}
describe("KitLinePlot", () => {
  it.each(presets)("draws signed data, goals, cursor and addressed targets in $id", ({ id }) => {
    for (const mode of ["light", "dark"])
      for (const style of ["full", "compact"] as const) {
        const html = render(
          {
            series,
            style,
            unit: "units",
            goal: { value: 6, label: "Goal" },
            selected: "p3",
            part: "plot",
            targets: [{ point: "p3", target: { item: "r3", part: "point" } }],
          },
          id,
          mode,
        );
        expect(html).toContain('d="M12,');
        expect(html).not.toContain("NaN");
        expect(html).toContain("Goal");
        expect(html).toContain("units");
        expect(elementAt(html, "home/c1/plot").attributes).toContain('aria-busy="false"');
        const target = elementAt(html, "home/c1/r3/point");
        expect(target.attributes).toContain('role="button"');
        expect(target.attributes).toContain('aria-pressed="true"');
        expect(styleAt(html, target)).toContain(`min-height:${size.control.md}px`);
        expect(styleAt(html, target)).toContain(`min-width:${size.control.md}px`);
        expect(html.match(/data-testid=/g)).toHaveLength(2);
      }
  });
});
describe("KitLinePlot states", () => {
  it("keeps drawings and target geometry while removing loading controls", () => {
    const props = { series, targets: [{ point: "p3", target: { part: "point" } }] };
    const filled = render(props),
      loading = render({ ...props, loading: true });
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toContain('role="button"');
    expect(loading).not.toContain('data-testid="home/c1/point"');
    expect(loading.match(/<path /g)).toHaveLength(filled.match(/<path /g)!.length);
    expect(loading.match(/<circle /g)).toHaveLength(filled.match(/<circle /g)!.length);
    const targets = elementAt(loading, "home/c1/root").children.at(-1)!.children;
    expect(styleAt(loading, targets[0]!)).toContain(`min-height:${size.control.md}px`);
    expect(styleAt(filled, "home/c1/point")).toContain(`min-height:${size.control.md}px`);
    for (const samples of [[], [{ ...series[0]!, points: [] }]]) {
      expect(render({ series: samples })).not.toMatch(/NaN|Infinity/);
      expect(render({ series: samples, loading: true })).toContain('aria-busy="true"');
    }
    expect(render({ series, targets: [{ point: "p2", target: { part: "missing" } }] })).not.toContain(
      'role="button"',
    );
  });
});
describe("KitLinePlot actions", () => {
  it("dispatches pointer and keyboard selection through explicit component and item addresses", async () => {
    const act = vi.fn(),
      controller = { act } as unknown as ScreenController;
    const handlers: { testID?: string; onPress?: (e: object) => void; onKeyDown?: (e: object) => void }[] =
      [];
    const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
    const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
      const props = args[1] as (typeof handlers)[number];
      if (props.onPress) handlers.push(props);
      return jsxDEV(...args);
    });
    try {
      render(
        {
          series,
          targets: [
            { point: "p1", target: { part: "first" } },
            { point: "p3", target: { item: "r3", part: "point" } },
          ],
        },
        "calm",
        "light",
        controller,
      );
    } finally {
      spy.mockRestore();
    }
    for (const target of handlers) {
      target.onPress!({});
      for (const key of ["Enter", " "]) target.onKeyDown!({ key, preventDefault() {}, stopPropagation() {} });
      target.onKeyDown!({ key: "Escape", preventDefault() {}, stopPropagation() {} });
      expect(act).toHaveBeenLastCalledWith({ address: target.testID, action: "select" });
    }
    expect(act).toHaveBeenCalledTimes(6);
  });
});
