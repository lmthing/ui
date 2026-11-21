import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { config } from "../../../../../apps/gallery/tamagui.config";
import { PhoneScreen } from "../../../src/kit/screen";
import { seatMoveDefs, seatMoveScreen, SeatMoveFixture } from "./seat-move.fixture";

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      defs={seatMoveDefs}
      renderers={{ SeatMoveFixture }}
      screen={seatMoveScreen}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
    />
  </TamaguiProvider>,
);
