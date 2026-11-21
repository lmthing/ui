import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import {
  KitAction,
  KitRangeBand,
  KitText,
  useAuthenticatedReveal,
  type AuthenticateReveal,
} from "@lmthing/ui/kit";
import { PhoneScreen } from "../../../src/kit";
import { config } from "../../render";
import { defs, screen } from "./fixture";

const copy = {
  masked: "Value masked",
  pending: "Waiting for authentication",
  denied: "Authentication denied",
  unavailable: "Authentication unavailable",
};
function RevealFixture({ code }: { code?: string }) {
  const state = useAuthenticatedReveal("reveal");
  return (
    <>
      <KitText part="root">{state === "revealed" ? code : copy[state]}</KitText>
      <KitAction action="press" part="reveal" label={state === "revealed" ? "Hide value" : "Reveal value"} />
      <KitRangeBand
        part="band"
        label="Reading"
        min={0}
        max={100}
        value={60}
        zones={[
          { label: "Low", from: 0, to: 25, tone: "bad" },
          { label: "Middle", from: 25, to: 75, tone: "warn" },
          { label: "High", from: 75, to: 100, tone: "good" },
        ]}
      />
    </>
  );
}

type Result = Awaited<ReturnType<AuthenticateReveal>>;
let finish: (result: Result) => void;
const authenticateReveal: AuthenticateReveal = () =>
  new Promise((resolve) => {
    finish = resolve;
  });
declare global {
  interface Window {
    finishRevealFixture: (result: Result) => void;
  }
}
window.finishRevealFixture = (result) => finish(result);

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const renderers = { RevealFixture };
function App() {
  const [host, setHost] = useState(true);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <button onClick={() => setHost(false)}>Disconnect authentication</button>
      <PhoneScreen
        {...{ defs, screen, theme, renderers }}
        authenticateReveal={host ? authenticateReveal : undefined}
      />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
