import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { config } from "../../../../../apps/gallery/tamagui.config";
import { PhoneScreen, publishBrowserAgent } from "../../../src/kit/screen";
import { seatMoveDefs, seatMoveScreen, SeatMoveFixture } from "./seat-move.fixture";

const fullRoundTable = new URLSearchParams(window.location.search).has("full-round-table");
const screen = fullRoundTable
  ? {
      ...seatMoveScreen,
      components: [
        {
          ...seatMoveScreen.components[0]!,
          tables: [
            {
              label: "Oak",
              capacity: 16,
              seated: Array.from({ length: 16 }, (_, i) => ({ name: `Guest ${i + 1}`, initials: "G" })),
            },
          ],
          waiting: [],
        },
      ],
    }
  : seatMoveScreen;

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      onReady={publishBrowserAgent}
      defs={seatMoveDefs}
      renderers={{ SeatMoveFixture }}
      screen={screen}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
    />
  </TamaguiProvider>,
);
