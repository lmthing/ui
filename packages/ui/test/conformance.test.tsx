// Every ready component, every example, every declared state, every preset and mode:
// renders, stamps its root and item addresses once, and draws empty and loading the shared way.
import { describe, expect, it } from "vitest";
import {
  accents,
  components,
  emptyLine,
  isDeviceDataVisible,
  loadingLabel,
  presets,
  stampItemIds,
  themeName,
  themeRoles,
  type ComponentName,
  type Meta,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { kitThemes, renderers } from "@lmthing/ui/kit";
import { addressedElements, config, renderInstance } from "./render";
import { selectedIds } from "../scripts/build";
import { exampleDeviceData } from "../src/catalog/probes/fixtures";
import { peekForExample } from "./variants";

const ready = selectedIds(Object.keys(renderers) as ComponentName[]);
const modes = ["light", "dark"] as const;

function stampExampleItems(meta: Meta, props: Record<string, unknown>) {
  const { draw, items } = meta;
  if (draw?.kind === "faces" && items) {
    // The Writer gives the number of dice, not item rows.
    const rows = Array.from({ length: Number(props[draw.count]) }, () => ({}));
    props = { ...props, [items.key]: rows };
  }
  return stampItemIds(meta, props);
}

it("stamps runtime faces from the declared count without a Writer item array", () => {
  const meta: Meta = {
    ...components.List.meta,
    items: { key: "dice", parts: ["root", "hold"], prefix: "d" },
    draw: { kind: "faces", press: "roll", count: "quantity", sides: "sides", hold: "hold" },
  };
  expect(stampExampleItems(meta, { quantity: 3, sides: 6 }).dice).toEqual([
    { id: "d1" },
    { id: "d2" },
    { id: "d3" },
  ]);
  expect(stampExampleItems(components.List.meta, { rows: [{}, {}] }).rows).toEqual([
    { id: "r1" },
    { id: "r2" },
  ]);
});

describe("themes", () => {
  it("generates every preset × mode × accent with all roles", () => {
    expect(Object.keys(kitThemes)).toHaveLength(presets.length * modes.length * accents.length);
    const css = config.getCSS();
    for (const name of Object.keys(kitThemes)) expect(css).toContain(`.t_${name}`);
    for (const preset of presets)
      for (const mode of modes)
        for (const accent of accents) {
          expect(kitThemes[themeName({ preset: preset.id, mode, accent: accent.id })]).toEqual(
            themeRoles(preset, accent, mode),
          );
        }
  });
});

describe.each(ready)("%s conformance", (id) => {
  const { meta, examples } = components[id];
  const states = (meta as Meta).states ?? ["filled"];
  const items = (meta as Meta).items;

  it.each(presets.flatMap((preset) => modes.map((mode) => ({ preset: preset.id, mode }))))(
    "renders every example and state in $preset $mode",
    ({ preset, mode }) => {
      const theme = { preset, mode, accent: accents[0]!.id } as ThemeChoice;
      for (const example of examples) {
        for (const state of states) {
          const input = components[id].props.parse(example) as Record<string, unknown>;
          const deviceData = exampleDeviceData(meta, input, state);
          const html = renderInstance(id, example, state, theme, { thing: "walk", deviceData });
          if (!isDeviceDataVisible(meta, deviceData)) {
            expect(addressedElements(html).size).toBe(0);
            continue;
          }
          expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
          if (state === "empty")
            expect(html).toContain(emptyLine((meta as Meta).deviceDataVisible ? undefined : "walk"));
          if (state === "loading") expect(html).toContain(loadingLabel);
          if (state === "filled" && items) {
            const props = stampExampleItems(meta, input);
            const rows = props[items.key] as { id: string }[];
            const { hidden, issues } = peekForExample(meta, props, html);
            expect(issues).toEqual([]);
            if (items.visible === "first")
              expect(html).not.toContain(`data-testid="home/c1/${items.prefix ?? "r"}2/root"`);
            const pageHidesRoots =
              props.overflow === "page" &&
              (meta as Meta).variantParts?.["overflow.page"]?.hides?.includes("root");
            if (!pageHidesRoots)
              for (const { id } of items.visible === "first" ? rows.slice(0, 1) : rows)
                if (!hidden.includes(id)) expect(html).toContain(`data-testid="home/c1/${id}/root"`);
          }
        }
      }
    },
  );
});
