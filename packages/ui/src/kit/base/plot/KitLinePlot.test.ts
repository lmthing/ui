import { createElement } from "react";
import * as jsxRuntime from "react/jsx-dev-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it, vi } from "vitest";
import { presets, size, space, themeName } from "@lmthing/ui/catalog";
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
  it("draws decorative overlays without changing addresses, but does not reveal them in loading", () => {
    const target = { point: "p3", target: { part: "point" } };
    const props = { series, targets: [target] };
    const original = render(props);
    const overlays = { band: { low: [-6, -3, -1], high: [2, 4, 6] }, baseline: 0 };
    for (const loading of [false, true]) {
      const html = render({ ...props, ...overlays, loading });
      if (loading) expect(html).not.toMatch(/<path /);
      else {
        expect(html).toMatch(/<path [^>]*d="M[^"]+ Z"/);
        expect(html.match(/<line /g)).toHaveLength(original.match(/<line /g)!.length + 1);
      }
      expect(html.match(/data-testid=/g)).toHaveLength(loading ? 1 : 2);
      expect(html).not.toMatch(/NaN|Infinity/);
    }
    const svg = (html: string) => html.match(/<svg\b.*<\/svg>/)?.[0];
    expect(svg(render({ ...props, baseline: Infinity }))).toBe(svg(original));
    expect(svg(render({ ...props, ...overlays, loading: true }))).toBe(
      svg(
        render({
          ...props,
          series: [{ ...series[0]!, points: series[0]!.points.map((p) => ({ ...p, value: 100 })) }],
          loading: true,
        }),
      ),
    );
  });
  it("keeps drawings and target geometry while removing loading controls", () => {
    const props = { series, targets: [{ point: "p3", target: { part: "point" } }] };
    const filled = render(props),
      loading = render({ ...props, loading: true });
    expect(loading).toContain('aria-busy="true"');
    expect(loading).not.toContain('role="button"');
    expect(loading).not.toContain('data-testid="home/c1/point"');
    expect(loading).not.toMatch(/<path |<circle /);
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
  it("places dates close to the grid and aligns the endpoint row with the legend", () => {
    const html = render({ series, part: "plot" });
    const [drawing, labels] = elementAt(html, "home/c1/plot").children;
    const [ends, legend] = labels!.children;
    expect(styleAt(html, ends!)).not.toMatch(/margin-left:|padding-left:/);
    const endpointType = styleAt(html, ends!.children[0]!.children[0]!.children[0]!.children[0]!).match(
      /font-size:[^;]+/,
    )?.[0];
    expect(endpointType).toBeDefined();
    expect(styleAt(html, legend!.children[0]!.children[0]!.children[0]!)).toContain(endpointType!);
    const svg = drawing!.children[1]!.children[0]!;
    const height = Number(svg.attributes.match(/height="([^"]+)"/)?.[1]);
    const bottom = Math.max(
      ...svg.children
        .filter((node) => node.tag === "line")
        .map((node) => Number(node.attributes.match(/y1="([^"]+)"/)?.[1])),
    );
    expect(height - bottom).toBe(space.xs);
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
