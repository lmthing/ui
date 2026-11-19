// Every ready component, every example, every declared state, every preset and mode:
// renders, stamps its root and item addresses once, and draws empty and loading the shared way.
import { describe, expect, it } from "vitest";
import {
  accents,
  components,
  emptyLine,
  loadingLabel,
  presets,
  themeName,
  themeRoles,
  type ComponentName,
  type Meta,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { kitThemes, renderers } from "@lmthing/ui/kit";
import { config, renderInstance } from "./render";
import { selectedIds } from "../scripts/build";

const ready = selectedIds(Object.keys(renderers) as ComponentName[]);
const modes = ["light", "dark"] as const;

function itemCount(meta: Meta, props: Record<string, unknown>) {
  if (meta.draw?.kind === "faces") return Number(props[meta.draw.count]);
  return meta.items ? (props[meta.items.key] as unknown[]).length : 0;
}

it("counts runtime faces from the declared count without a Writer item array", () => {
  const meta: Meta = {
    ...components.List.meta,
    items: { key: "dice", parts: ["root", "hold"] },
    draw: { kind: "faces", press: "roll", count: "quantity", sides: "sides", hold: "hold" },
  };
  expect(itemCount(meta, { quantity: 3, sides: 6 })).toBe(3);
  expect(itemCount(components.List.meta, { rows: [{}, {}] })).toBe(2);
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
  const states = (meta as { states?: readonly string[] }).states ?? ["filled"];
  const items = (meta as Meta).items;

  it.each(presets.flatMap((preset) => modes.map((mode) => ({ preset: preset.id, mode }))))(
    "renders every example and state in $preset $mode",
    ({ preset, mode }) => {
      const theme = { preset, mode, accent: accents[0]!.id } as ThemeChoice;
      for (const example of examples) {
        for (const state of states) {
          const html = renderInstance(id, example, state as never, theme, "walk");
          expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
          if (state === "empty") expect(html).toContain(emptyLine("walk"));
          if (state === "loading") expect(html).toContain(loadingLabel);
          if (state === "filled" && items) {
            const count = itemCount(meta, components[id].props.parse(example) as Record<string, unknown>);
            const prefix = items.prefix ?? "r";
            if (items.visible === "first")
              expect(html).not.toContain(`data-testid="home/c1/${prefix}2/root"`);
            for (let index = 1; index <= (items.visible === "first" ? 1 : count); index++) {
              expect(html).toContain(`data-testid="home/c1/${prefix}${index}/root"`);
            }
          }
        }
      }
    },
  );
});
