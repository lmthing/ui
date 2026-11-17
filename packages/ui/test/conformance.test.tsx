import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider, createTamagui, createTokens } from "tamagui";
import { components, presets, accents, themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, kitThemes, kitTokens, kitFonts, renderers } from "@lmthing/ui/kit";

const config = createTamagui({
  tokens: createTokens(kitTokens), fonts: kitFonts, defaultFont: "humanist",
  themes: Object.fromEntries(Object.entries({
    light: kitThemes.kit_calm_light_moss, dark: kitThemes.kit_calm_dark_moss, ...kitThemes,
  }).map(([name, roles]) => [name, { ...roles, color: roles.text, background: roles.bg }])),
});

describe("List renderer conformance", () => {
  it("has a renderer and exactly twelve generated themes with all roles", () => {
    expect(typeof renderers.List).toBe("function");
    expect(Object.keys(kitThemes)).toHaveLength(12);
    const css = config.getCSS();
    for (const name of Object.keys(kitThemes)) expect(css).toContain(`.t_${name}`);
    for (const preset of presets) for (const mode of ["light", "dark"] as const) {
      for (const accent of accents) {
        expect(kitThemes[themeName({ preset: preset.id, mode, accent: accent.id })])
          .toEqual({ ...preset.roles[mode], ...accent[mode] });
      }
    }
  });
  it("renders both examples in every theme and declared state with stable addresses", () => {
    let renders = 0;
    for (const preset of presets) for (const mode of ["light", "dark"] as const) {
      for (const accent of accents) for (const example of components.List.examples) {
        for (const state of components.List.meta.states) {
          const parsed = components.List.props.parse(example);
          const rows = parsed.rows.map((row, index) => ({ ...row, id: `r${index + 1}` }));
          const html = renderToStaticMarkup(
            <TamaguiProvider config={config}>
              <KitProvider theme={{ preset: preset.id, mode, accent: accent.id }}>
                <PartScope screen="home" component="l1" rev={1} state={state}>
                  <renderers.List style={parsed.style} rows={rows} />
                </PartScope>
              </KitProvider>
            </TamaguiProvider>,
          );
          expect(html.match(/data-testid="home\/l1\/root"/g)).toHaveLength(1);
          if (state === "filled") {
            for (const row of rows) for (const part of components.List.meta.items.parts) {
              expect(html.match(new RegExp(`data-testid="home/l1/${row.id}/${part}"`, "g"))).toHaveLength(1);
            }
          } else {
            expect(html).toContain(state === "empty" ? "No things yet." : "Loading list");
          }
          renders++;
        }
      }
    }
    expect(renders).toBe(72);
  });
});
