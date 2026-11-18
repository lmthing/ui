import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { presets, size, themeName, type as typography } from "@lmthing/ui/catalog";
import { KitCard, KitInput, KitProvider, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(props: Parameters<typeof KitInput>[0], preset = "calm", mode = "light") {
  const theme = { preset, mode, accent: "moss" } as Parameters<typeof KitProvider>[0]["theme"];
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          createElement(KitCard, { children: null }, createElement(KitInput, props)),
        ),
      ),
    ),
  );
}

describe("KitInput compact and inactive options", () => {
  it.each(presets)("keeps compact time controls readable and touchable in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      const html = render({ hint: "From", value: "09:00", kind: "time", compact: true }, id, mode);
      const field = elementAt(html, "home/c1/field");
      const css = styleAt(html, field);
      expect(field.attributes).toContain('role="textbox"');
      expect(field.attributes).toContain('value="09:00"');
      expect(css).toContain("width:0px");
      expect(css).toContain(`min-width:${size.control.md}px`);
      expect(css).toContain(`min-height:${size.control.md}px`);
      expect(css).toContain(`font-size:${typography.body.size}px`);
    }
  });
  it.each(presets)("uses theme roles, not disabling or opacity, for inactive hours in $id", ({ id }) => {
    for (const mode of ["light", "dark"]) {
      for (const compact of [false, true]) {
        const html = render({ hint: "To", value: "17:00", compact, inactive: true }, id, mode);
        const field = elementAt(html, "home/c1/field");
        const surface = elementAt(html, "home/c1/root").children[0]!.children[0]!;
        expect(styleAt(html, field)).toContain("color:var(--muted)");
        expect(styleAt(html, surface)).toContain("background-color:var(--surface)");
        expect(field.attributes).not.toContain("disabled");
        expect(styleAt(html, surface)).not.toContain("opacity:");
        expect(field.attributes).toContain('value="17:00"');
      }
    }
  });
  it.each(["text", "search", "time"] as const)("keeps the default %s drawing unchanged", (kind) => {
    const input = { hint: "Value", value: "09:00", kind };
    const body = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "");
    expect(body(render(input))).toBe(body(render({ ...input, compact: false, inactive: false })));
    expect(styleAt(render(input), "home/c1/field")).not.toContain("width:0px");
    expect(styleAt(render(input), "home/c1/field")).toContain("color:var(--text)");
  });
});
