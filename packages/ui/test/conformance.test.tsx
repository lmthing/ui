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
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { kitThemes, renderers } from "@lmthing/ui/kit";
import { config, renderInstance } from "./render";

const ready = Object.keys(renderers) as ComponentName[];
const modes = ["light", "dark"] as const;

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
  const items = (meta as { items?: { key: string; visible?: "all" | "first" } }).items;

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
            const count = (components[id].props.parse(example) as unknown as Record<string, unknown[]>)[
              items.key
            ]!.length;
            if (items.visible === "first") expect(html).not.toContain('data-testid="home/c1/r2/root"');
            for (let index = 1; index <= (items.visible === "first" ? 1 : count); index++) {
              expect(html).toContain(`data-testid="home/c1/r${index}/root"`);
            }
          }
        }
      }
    },
  );
});
