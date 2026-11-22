import { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, themeName, type Definition } from "@lmthing/ui/catalog";
import {
  createAgentAccess,
  createScreenController,
  KitAction,
  KitLinePlot,
  KitMapTile,
  KitPhoto,
  KitProvider,
  PartScope,
} from "@lmthing/ui/kit";
import { config } from "../render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const button = components.Button!;
const defs: Record<string, Definition> = {
  Button: { ...button, meta: { ...button.meta, actions: { parts: { root: ["copy"] } } } },
};
const screen = { id: "home", components: [{ id: "c1", c: "Button", label: "Copy text" }] };
const controller = createScreenController({ defs, screen, requireMounted: true });
window.__lmthingUI = createAgentAccess({
  defs,
  current: () => screen,
  store: controller.store,
  runtime: controller,
});
function Fixture() {
  const [value, setValue] = useState("Fixture\n copy");
  return (
    <>
      <KitAction action="copy" value={value} label="Copy text" copiedLabel="Copied" />
      <button onClick={() => setValue("New fixture text")}>Change text</button>
      <KitPhoto part="portrait" aspect="tall" initials="AB" />
      <KitMapTile
        pins={[
          { id: "r1", label: "$1.2K", x: 0, y: 0, mark: "price" },
          { id: "r2", label: "Person", x: 1, y: 1, mark: "avatar", initials: "CD" },
        ]}
      />
      <KitLinePlot
        part="plot"
        series={[
          {
            id: "one",
            label: "Reading",
            points: [
              { id: "first", label: "First", x: 0, value: -1 },
              { id: "last", label: "Last", x: 4, value: 2 },
            ],
          },
        ]}
        baseline={0}
        band={{ low: [-3, 0], high: [1, 3] }}
      />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <KitProvider theme={theme} interactive controller={controller}>
      <PartScope screen="home" component="c1" rev={1} state="filled">
        <Fixture />
      </PartScope>
    </KitProvider>
  </TamaguiProvider>,
);
