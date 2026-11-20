import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { themeName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, type ScreenController } from "@lmthing/ui/kit";
import { config } from "../../../../test/render";

export function renderDiagram(view: ReactNode, controller?: ScreenController) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
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
          view,
        ),
      ),
    ),
  );
}
