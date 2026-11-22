import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function EventsPolishFixture() {
  const [lastAction, setLastAction] = useState("");
  const [answer, setAnswer] = useState<"none" | "no">("none");
  return (
    <TamaguiProvider config={config}>
      <output id="last-action">{lastAction}</output>
      <PhoneScreen
        theme={theme}
        screen={{
          id: "home",
          components: [
            { ...components.RSVP.examples[0], c: "RSVP", id: "reply", answer },
            { ...components.Registry.examples[0], c: "Registry", id: "gifts" },
            { ...components.Registry.examples[1], c: "Registry", id: "host" },
            { ...components.Vendors.examples[0], c: "Vendors", id: "vendors" },
          ],
        }}
        onAction={({ address }) => {
          setLastAction(address);
          if (address === "home/reply/no") setAnswer("no");
        }}
        reduceMotion
      />
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<EventsPolishFixture />);
