import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { component, themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { KitBars, KitProvider, PartScope } from "@lmthing/ui/kit";
import { addressedElements, config, styleAt } from "../render";

function renderBars(children: ReactNode, item: string) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme}>
        <PartScope screen="home" component="c1" item={item} rev={1} state="filled">
          {children}
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

describe("KitBars", () => {
  it("keeps two read-only bars in the caller's item with one part per bar", () => {
    const html = renderBars(
      <KitBars
        pair={[
          { part: "with", label: "With", value: 8 },
          { part: "without", label: "Without", value: 4 },
        ]}
      />,
      "r7",
    );
    const parts = addressedElements(html);
    expect([...parts.keys()]).toEqual(["home/c1/r7/with", "home/c1/r7/without"]);
    expect(html.match(/data-testid=/g)).toHaveLength(2);
    expect(html).toContain(">With<");
    expect(html).toContain(">Without<");
    expect(html).not.toMatch(/role="(button|slider)"|tabindex=/i);
    for (const [name, scale] of [
      ["with", 1],
      ["without", 0.5],
    ] as const) {
      const column = parts.get(`home/c1/r7/${name}`)!.children[0]!.children[1]!;
      expect(column.attributes).toContain('aria-hidden="true"');
      expect(styleAt(html, column)).toContain(`height:${component.base.barsHeight * scale}px`);
    }
  });

  it("keeps legacy item roots, labels and the explicit highlight override", () => {
    const html = renderBars(
      <KitBars
        points={[
          { id: "r1", label: "First", value: 8 },
          { id: "r2", label: "Second", value: 4 },
        ]}
        highlight={1}
      />,
      "ignored",
    );
    const parts = addressedElements(html);
    expect([...parts.keys()]).toEqual([
      "home/c1/r1/root",
      "home/c1/r1/label",
      "home/c1/r2/root",
      "home/c1/r2/label",
    ]);
    const second = parts.get("home/c1/r2/root")!.children[0]!.children[1]!;
    expect(styleAt(html, second)).toContain("var(--accent)");
  });
});
