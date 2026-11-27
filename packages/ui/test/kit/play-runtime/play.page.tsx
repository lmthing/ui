import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { config } from "../../../../../apps/gallery/tamagui.config";
import { PhoneScreen, publishBrowserAgent } from "../../../src/kit/screen";
import { CounterFixture, RevealFixture, defs, screen } from "./play.fixture";

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      onReady={publishBrowserAgent}
      defs={defs}
      renderers={{ CounterFixture, RevealFixture }}
      screen={screen}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      reduceMotion
    />
  </TamaguiProvider>,
);
