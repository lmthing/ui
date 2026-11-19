import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { presets, space, themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { KitContent, KitProvider, KitText, PartScope } from "@lmthing/ui/kit";
import { config, elementAt, styleAt } from "../../../../test/render";

function render(group: "content" | "response" | undefined, theme: ThemeChoice, inset: "none" | "md") {
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
          createElement(
            "div",
            { "data-testid": "base" },
            createElement(
              KitContent,
              { children: null },
              createElement(KitText, { part: null, children: "Caller content" }),
              createElement(
                KitContent,
                { ...(group ? { group } : {}), inset, children: null },
                createElement(KitText, { role: "caption", part: null, children: "Caller response label" }),
                createElement(KitText, { part: null, children: "Caller response" }),
              ),
            ),
          ),
        ),
      ),
    ),
  ).replace(/<style[\s\S]*?<\/style>/g, "");
}

describe("response content spacing", () => {
  it.each(presets)("separates a response without changing other content in $id", ({ id: preset }) => {
    for (const mode of ["light", "dark"] as const) {
      for (const inset of ["none", "md"] as const) {
        const theme = { preset, mode, accent: "moss" } as const;
        const ordinary = render(undefined, theme, inset);
        expect(ordinary).toBe(render("content", theme, inset));
        const html = render("response", theme, inset);
        const frame = elementAt(html, "base").children[0]!;
        const body = frame.children[0]!;
        const response = body.children[1]!;
        const original = elementAt(ordinary, "base").children[0]!;
        expect(styleAt(html, frame)).toBe(styleAt(ordinary, original));
        expect(styleAt(html, body)).toBe(styleAt(ordinary, original.children[0]!));
        expect(styleAt(html, body)).toContain(`gap:${space.xs}px`);
        expect(styleAt(html, response)).toContain(`margin-top:${space.md - space.xs}px`);
        expect(styleAt(ordinary, original.children[0]!.children[1]!)).not.toContain("margin-top:");
        expect(styleAt(html, response)).toContain(`padding-left:${inset === "md" ? space.md : 0}px`);
        expect(styleAt(html, response.children[0]!)).toContain(`gap:${space.xs}px`);
        expect(response.children[0]!.children).toHaveLength(2);
        expect(html).toContain("Caller response");
      }
    }
  });
});
