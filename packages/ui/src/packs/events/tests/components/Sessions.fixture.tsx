import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const [schedule, agenda] = components.Sessions.examples;
const screen: ScreenLike = {
  id: "home",
  components: [
    { ...schedule, tracks: [...schedule!.tracks, "Demos"], c: "Sessions", id: "schedule" },
    { ...agenda, c: "Sessions", id: "agenda" },
  ],
};

function SessionsFixture() {
  const [destination, setDestination] = useState("");
  return (
    <TamaguiProvider config={config}>
      <output id="destination">{destination}</output>
      <PhoneScreen theme={theme} screen={screen} onLink={setDestination} reduceMotion />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<SessionsFixture />);
