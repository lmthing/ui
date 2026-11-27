import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { config } from "../../../../../apps/gallery/tamagui.config";
import { PhoneScreen, publishBrowserAgent } from "../../../src/kit/screen";
import { DateFixture, dateDefs, dateScreen, dateTheme } from "./index";

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      defs={dateDefs}
      renderers={{ DateFixture }}
      screen={dateScreen}
      theme={dateTheme}
      onReady={publishBrowserAgent}
    />
  </TamaguiProvider>,
);
