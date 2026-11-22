import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const style = new URLSearchParams(location.search).has("hold") ? "hold" : "curtain";
const screen: ScreenLike = {
  id: "home",
  components: [{ ...components.PassReveal.examples[0], style, id: "p1", c: "PassReveal" }],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config}>
    <PhoneScreen theme={theme} screen={screen} reduceMotion />
  </TamaguiProvider>,
);
