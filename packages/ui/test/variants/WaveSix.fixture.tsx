import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, themeName, type Definition } from "@lmthing/ui/catalog";
import { KitAction, KitLinePlot, KitMapTile, KitPhoto, PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const button = components.Button!;
const defs: Record<string, Definition> = {
  Button: { ...button, meta: { ...button.meta, actions: { parts: { root: ["copy"] } } } },
};
const screen = { id: "home", components: [{ id: "c1", c: "Button", label: "Copy text" }] };
function Fixture() {
  return (
    <>
      <KitAction action="copy" value={"Fixture\n copy"} label="Copy text" copiedLabel="Copied" icon="copy" />
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
    <PhoneScreen theme={theme} screen={screen} defs={defs} renderers={{ Button: Fixture }} />
  </TamaguiProvider>,
);
