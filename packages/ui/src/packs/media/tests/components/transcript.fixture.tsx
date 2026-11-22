import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, themeName } from "@lmthing/ui/catalog";
import { renderers as kitRenderers } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";
import { PhoneScreen } from "../../../../kit";
import { Transcript } from "../../components";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const defs = { Player: components.Player, Transcript: components.Transcript };
const renderers = { Player: kitRenderers.Player, Transcript: Transcript.Transcript };
const lines = Array.from({ length: 40 }, (_, index) => ({ at: index * 2, text: `Timed line ${index + 1}` }));
const screen = {
  id: "transcript",
  components: [
    { id: "p1", c: "Player", title: "Recording", media: "lib:recording", seconds: 90, style: "compact" },
    { id: "t1", c: "Transcript", style: "spoken", lines },
  ],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <PhoneScreen
      {...{ defs, renderers, screen, theme }}
      reduceMotion
      media={{
        open: (_ref, { onTime }) => {
          const tick = (event: Event) => onTime((event as CustomEvent<number>).detail);
          window.addEventListener("test-playhead", tick);
          return {
            play: () => {},
            pause: () => {},
            seek: (at) => {
              document.querySelector("output")!.value = String(at);
            },
            dispose: () => window.removeEventListener("test-playhead", tick),
          };
        },
      }}
      hostCommands={{
        commands: {
          "highlights.saveLine": { allows: () => true, run: () => ({ status: "accepted" }) },
        },
      }}
    />
    <output />
  </TamaguiProvider>,
);
