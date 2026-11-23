import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, themeName, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const [full, brief] = components.MomentumChart.examples;
const screen: ScreenLike = {
  id: "home",
  components: [
    { id: "curve", c: "MomentumChart", ...full },
    { id: "brief", c: "MomentumChart", ...brief },
  ],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <PhoneScreen {...{ screen, theme }} />
  </TamaguiProvider>,
);
