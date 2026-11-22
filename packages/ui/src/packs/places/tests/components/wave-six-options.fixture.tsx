import { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, themeName } from "@lmthing/ui/catalog";
import { PhoneScreen, renderers } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const { PlaceCard, MapList } = components;
const defs = { PlaceCard, MapList };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const venue = PlaceCard.examples[0]!;
const screen = {
  id: "home",
  components: [
    { ...venue, c: "PlaceCard", id: "venue", unit: "km", saved: true },
    { ...MapList.examples[0], c: "MapList", id: "places", style: "map" },
  ],
};
const deviceData = { place_details: [{ name: venue.name, goto: venue.goto, distanceKm: 1.609344 }] };

function Fixture() {
  const [destination, setDestination] = useState("");
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <PhoneScreen {...{ defs, renderers, screen, theme, deviceData }} onLink={setDestination} />
      <output>{destination}</output>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
