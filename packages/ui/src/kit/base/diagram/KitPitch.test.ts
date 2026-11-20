import { createElement } from "react";
import * as jsxRuntime from "react/jsx-dev-runtime";
import { expect, it, vi } from "vitest";
import { components, emptyLine, size } from "@lmthing/ui/catalog";
import { createScreenController, KitAction, KitPitch } from "@lmthing/ui/kit";
import { addressedElements, elementAt, styleAt } from "../../../../test/render";
import { renderDiagram } from "./diagram-test-render";

vi.mock("react/jsx-dev-runtime", { spy: true });

const lines = [
  { id: "back", players: [{ id: "r1", number: "1", label: "Price", target: { part: "root" } }] },
  {
    id: "front",
    players: [
      { id: "r2", number: "07", label: "Liu", target: { part: "open", item: "r4" } },
      { id: "r3", number: "11", label: "Shah" },
    ],
  },
];
const substitutes = createElement(KitAction, { label: "Bench details", part: "bench" });

it.each(["pitch", "list"] as const)("draws player items and substitutes in %s", (style) => {
  const html = renderDiagram(createElement(KitPitch, { lines, substitutes, style, part: "formation" }));
  expect(html.includes('vector-effect="non-scaling-stroke"')).toBe(style === "pitch");
  expect([...addressedElements(html).keys()]).toEqual([
    "home/c1/formation",
    "home/c1/r1/root",
    "home/c1/r4/open",
    "home/c1/r3/root",
    "home/c1/bench",
    "home/c1/bench_label",
  ]);
  const player = elementAt(html, "home/c1/r4/open");
  expect(player.attributes).toContain('aria-label="07, Liu"');
  expect(player.attributes).toContain('role="button"');
  expect(styleAt(html, player)).toContain(`min-height:${size.control.md}px`);
  expect(styleAt(html, player)).toContain(`flex-direction:${style === "list" ? "row" : "column"}`);
  expect(elementAt(html, "home/c1/r3/root").attributes).not.toContain('role="button"');
});

it.each(["pitch", "list"] as const)("does not expose names or targets while %s loads", (style) => {
  const html = renderDiagram(createElement(KitPitch, { lines, substitutes, style, loading: true }));
  expect(html).toContain('aria-busy="true"');
  expect(html.includes('vector-effect="non-scaling-stroke"')).toBe(style === "pitch");
  expect([...addressedElements(html).keys()]).toEqual(["home/c1/root"]);
  expect(html).not.toMatch(/Price|Shah|Liu|Bench details|role="button"/);
});

it.each(["pitch", "list"] as const)("shows shared empty copy for %s with no players", (style) => {
  const html = renderDiagram(createElement(KitPitch, { lines: [{ id: "back", players: [] }], style }));
  expect(html).toContain(emptyLine(undefined));
  expect(html).not.toContain('vector-effect="non-scaling-stroke"');
});

it("uses the shared controller for player press and activation keys", async () => {
  const controller = createScreenController({
    defs: components,
    screen: {
      id: "home",
      components: [{ id: "c1", c: "StaffPicker", ...components.StaffPicker.examples[0] }],
    },
  });
  const press = vi.spyOn(controller, "press");
  let target: {
    onPress?: (event: object) => unknown;
    onKeyDown?: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => unknown;
  } = {};
  const { jsxDEV } = await vi.importActual<typeof jsxRuntime>("react/jsx-dev-runtime");
  const spy = vi.spyOn(jsxRuntime, "jsxDEV").mockImplementation((...args) => {
    const props = args[1] as (typeof target & { testID?: string }) | null;
    if (props?.testID === "home/c1/r4/open" && props.onPress) target = props;
    return jsxDEV(...args);
  });
  try {
    renderDiagram(createElement(KitPitch, { lines }), controller);
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    target.onPress!({ stopPropagation });
    for (const key of ["Enter", " ", "Tab"]) target.onKeyDown!({ key, preventDefault, stopPropagation });
    expect(press.mock.calls).toEqual(Array(3).fill(["home/c1/r4/open"]));
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(stopPropagation).toHaveBeenCalledTimes(3);
  } finally {
    spy.mockRestore();
    controller.dispose();
  }
});
