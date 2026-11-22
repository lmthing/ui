import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components } from "@lmthing/ui/catalog";
import { PhoneScreen, renderers, type ScannerBrightnessAdapter } from "@lmthing/ui/kit";
import { config } from "../../render";

const defs = { PassCard: components.PassCard };
const screen = { id: "home", components: [{ ...components.PassCard.examples[5], id: "c1", c: "PassCard" }] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
let applied = 0;
const adapter: ScannerBrightnessAdapter = ({ signal }) => {
  applied++;
  signal.addEventListener(
    "abort",
    () => {
      applied--;
    },
    { once: true },
  );
  return true;
};
const host = { scannerBrightness: adapter };
declare global {
  interface Window {
    activeBrightnessLeases(): number;
  }
}
window.activeBrightnessLeases = () => applied;

function App() {
  const [connected, setConnected] = useState(true);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <button type="button" onClick={() => setConnected(false)}>
        Disconnect brightness
      </button>
      <PhoneScreen {...{ defs, renderers, screen, theme }} hostCommands={connected ? host : undefined} />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
