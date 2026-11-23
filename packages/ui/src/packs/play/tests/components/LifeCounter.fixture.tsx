import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen: ScreenLike = {
  id: "home",
  components: [{ ...components.LifeCounter.examples[0], id: "c1", c: "LifeCounter" }],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config}>
    <PhoneScreen theme={theme} screen={screen} reduceMotion />
  </TamaguiProvider>,
);
