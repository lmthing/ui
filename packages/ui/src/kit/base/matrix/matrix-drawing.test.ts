import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { KitCheck, KitProvider, KitText, PartScope, type ScreenController } from "@lmthing/ui/kit";
import { config } from "../../../../test/render";
import { MatrixContent } from "./matrix-drawing";

export const text = (children: string, part: string | null = null) =>
  createElement(KitText, { part, children });
export function renderMatrix(
  children: ReactNode,
  controller?: ScreenController,
  preset = "calm",
  mode = "light",
) {
  const theme = { preset, mode, accent: "moss" } as ThemeChoice;
  return renderToStaticMarkup(
    createElement(
      TamaguiProvider,
      { config, defaultTheme: themeName(theme) },
      createElement(
        KitProvider,
        { theme, interactive: true, controller, children: null },
        createElement(
          PartScope,
          { screen: "home", component: "c1", rev: 1, state: "filled", children: null },
          children,
        ),
      ),
    ),
  );
}
describe("matrix loading content", () => {
  it("reserves caller text and controls without mounting their roles or targets", () => {
    const html = renderMatrix(
      createElement(MatrixContent, {
        loading: true,
        children: [
          text("Caller heading", "name"),
          createElement(KitCheck, { label: "Caller control", part: "check", done: true }),
        ],
      }),
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="checkbox"');
    expect(html).not.toContain('data-testid="home/c1/name"');
    expect(html).not.toContain('data-testid="home/c1/check"');
    expect(html).toContain("Caller heading");
  });
});
