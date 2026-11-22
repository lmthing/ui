import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { PhoneScreen } from "../../../src/kit/screen";
import { config } from "../../render";
import { CollectionRuntimeFixture, defs, screen } from "./collections.fixture";

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      screen={screen}
      defs={defs}
      renderers={{ CollectionRuntimeFixture }}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      reduceMotion
    />
  </TamaguiProvider>,
);
