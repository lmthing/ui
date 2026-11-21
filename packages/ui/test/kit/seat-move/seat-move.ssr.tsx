import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { createScreenController, KitProvider, Screen, type ScreenController } from "@lmthing/ui/kit";
import { config } from "../../render";
import { seatMoveDefs, seatMoveOffers, seatMoveScreen, SeatMoveFixture } from "./seat-move.fixture";

export function renderSeatMoves(controller: ScreenController) {
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <KitProvider
        controller={controller}
        interactive
        theme={{ preset: "calm", mode: "light", accent: "moss" }}
      >
        <Screen controller={controller} renderers={{ SeatMoveFixture }} />
      </KitProvider>
    </TamaguiProvider>,
  );
}

export function seatMoveReading() {
  const controller = createScreenController({ screen: seatMoveScreen, defs: seatMoveDefs });
  try {
    return { html: renderSeatMoves(controller), text: controller.read(), offers: seatMoveOffers() };
  } finally {
    controller.dispose();
  }
}
