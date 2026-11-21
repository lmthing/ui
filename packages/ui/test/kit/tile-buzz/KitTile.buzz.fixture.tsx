import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import { buzzKey, type ActStep, type Definition } from "@lmthing/ui/catalog";
import { createScreenController, KitAction, KitProvider, KitTile, PartScope } from "@lmthing/ui/kit";
import { config } from "../../render";

const def: Definition = {
  meta: {
    id: "TileFixture",
    group: "action",
    purpose: "Test pad timing",
    pick: "Test pad timing",
    region: "body",
    weight: 2,
    tier: "phone",
    realPath: "Measure pad contact",
    items: { key: "players", parts: ["root", "buzz"] },
    actions: { items: { root: ["press"], buzz: ["press"] }, parts: { reset: ["press"] } },
    successActions: ["root.press", "buzz.press", "reset.press"],
    buzz: { press: "buzz", reset: "reset" },
  },
  props: z.strictObject({ players: z.array(z.strictObject({ name: z.string() })) }),
  fallback: () => ({}),
  examples: [],
  probes: [],
};
const players = ["First", "Second", "Disabled", "Loading", "Ordinary"].map((name) => ({ name }));
let time = 0;
const events: ActStep[] = [];
const controller = createScreenController({
  screen: { id: "test", components: [{ id: "pads", c: def.meta.id, players }] },
  defs: { [def.meta.id]: def },
  requireMounted: true,
  touchNow: () => time,
  onAction: (step) => events.push(step),
});
declare global {
  interface Window {
    tileBuzz: {
      setTime: (at: number) => void;
      act: typeof controller.act;
      read: typeof controller.read;
      round: () => unknown;
      events: ActStep[];
    };
  }
}
window.tileBuzz = {
  setTime: (at) => (time = at),
  act: controller.act,
  read: controller.read,
  round: () => controller.liveControls(def.meta, { players }, "pads")[buzzKey],
  events,
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <KitProvider
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      interactive
      controller={controller}
    >
      <PartScope screen="test" component="pads" rev={1} state="filled">
        <KitTile item="r1" icon="check" label="First" touchTarget="buzz" />
        <KitTile item="r2" icon="check" label="Second" touchTarget="buzz" />
        <KitTile item="r3" icon="check" label="Disabled" touchTarget="buzz" disabled />
        <KitTile item="r5" icon="check" label="Ordinary" />
        <KitAction part="reset" label="Reset" action="press" />
      </PartScope>
      <PartScope screen="test" component="pads" rev={1} state="loading">
        <KitTile item="r4" icon="check" label="Loading" touchTarget="buzz" />
      </PartScope>
    </KitProvider>
  </TamaguiProvider>,
);
