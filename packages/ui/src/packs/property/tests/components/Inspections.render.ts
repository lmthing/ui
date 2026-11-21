import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { components, themeName, type StateName } from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, renderers, Screen } from "@lmthing/ui/kit";
import { config, renderInstance } from "../../../../../test/render";
import { Inspections } from "../../components";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

export function renderInspectionScreen(controller: ReturnType<typeof createScreenController>) {
  return renderToStaticMarkup(
    createElement(TamaguiProvider, {
      config,
      defaultTheme: themeName(theme),
      children: createElement(KitProvider, {
        theme,
        controller,
        interactive: false,
        children: createElement(Screen, { controller, renderers: { Inspections: Inspections.Inspections } }),
      }),
    }),
  );
}

/** Exercise the actual screen projection even before a draft is admitted to the generated renderer map. */
export function renderInspection(input: object, state: StateName) {
  if ("Inspections" in renderers) return renderInstance("Inspections", input, state, theme);
  const controller = createScreenController({
    screen: { id: "home", components: [{ ...input, id: "c1", c: "Inspections", state }] },
    defs: components,
  });
  try {
    return renderInspectionScreen(controller);
  } finally {
    controller.dispose();
  }
}
