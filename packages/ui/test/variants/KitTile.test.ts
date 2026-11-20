import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, size, space, themeName } from "@lmthing/ui/catalog";
import { KitProvider, KitTile, PartScope } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, styleAt } from "../render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const base = "home/c1/r1";
const tile = { item: "r1", icon: "leaf", label: "Outdoors" } as const;

function render(options: Partial<Parameters<typeof KitTile>[0]> = {}) {
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
          createElement(KitTile, { ...tile, ...options }),
        ),
      ),
    ),
  );
}

const root = (html: string) => elementAt(html, `${base}/root`);
const badge = (html: string) => styleAt(html, root(html).children[0]!);

describe("KitTile opt-in finish", () => {
  it("keeps ordinary linked tiles accented, unbordered, and comfortable", () => {
    const html = render({ goto: "outdoors" });
    expect(root(html).attributes).toContain('role="link"');
    expect(root(html).attributes).not.toContain("aria-pressed");
    expect(badge(html)).toContain("background-color:var(--accentSoft)");
    expect(styleAt(html, root(html))).toContain(`padding-top:${space.md}px`);
    expect(styleAt(html, root(html))).not.toContain("border-top-width");
  });

  it("uses the compact spacing tokens without reducing the target minimum", () => {
    const normal = render({ density: "comfortable" });
    const compact = render({ density: "compact" });
    expect(styleAt(normal, root(normal))).toContain(`padding-top:${space.md}px`);
    expect(styleAt(compact, root(compact))).toContain(`padding-top:${space.sm}px`);
    expect(styleAt(compact, root(compact))).toContain(`gap:${space.xs}px`);
    expect(styleAt(compact, root(compact))).toContain(`min-height:${size.control.lg}px`);
    expect(badge(compact)).toBe(badge(normal));
  });

  it.each([false, true])("uses a stable label slot and border width with on=%s", (on) => {
    const html = render({ distinctSelection: true, on, action: "toggle" });
    expect(root(html).attributes).toContain('role="button"');
    expect(root(html).attributes).toContain(`aria-pressed="${on}"`);
    expect(root(html).attributes).not.toContain("aria-disabled");
    expect([...addressedElements(html).keys()]).toEqual(
      ["root", "icon", "label"].map((part) => `${base}/${part}`),
    );
    expect(styleAt(html, root(html))).toContain(`border-top-width:${component.base.strongBorder}px`);
    expect(styleAt(html, root(html))).toContain(`border-top-color:${on ? "var(--accent)" : "transparent"}`);
    expect(styleAt(html, root(html).children[1]!)).toContain("align-self:stretch");
    expect(styleAt(html, elementAt(html, `${base}/label`))).toContain("text-align:center");
    expect(badge(html)).toContain(`background-color:var(--${on ? "accentSoft" : "raised"})`);
  });
});
