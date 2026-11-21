import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import { components, themeName, type Definition } from "@lmthing/ui/catalog";
import { KitAction, KitPlayback, PartScope, usePartContext, type MediaAdapter } from "@lmthing/ui/kit";
import { PhoneScreen } from "../../../src/kit/screen";
import { config } from "../../render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const definition: Definition = {
  ...components.Button,
  meta: {
    ...components.Button.meta,
    id: "MediaFixture",
    actions: { items: { clip: ["play", "pause", "stop"] } },
    items: { key: "clips", parts: ["clip"], media: { playback: { clip: { video: true } } } },
  },
  props: z.strictObject({ clips: z.array(z.strictObject({ label: z.string() })) }),
};
const clips = [{ label: "Play first clip" }, { label: "Play second clip" }];
const screen = { id: "home", components: [{ id: "clips", c: "MediaFixture", clips }] };
const defs = { MediaFixture: definition };
const media: MediaAdapter = {
  open(reference) {
    const element = document.createElement("video");
    element.dataset.testid = reference;
    return { element, play: () => {}, pause: () => {}, seek: () => {}, dispose: () => element.remove() };
  },
};
const resolvePlayback = (address: string) => (address.includes("/r1/") ? "first_clip" : "second_clip");

function MediaFixture() {
  const scope = usePartContext();
  return clips.map(({ label }, index) => (
    <PartScope key={label} {...scope} item={`r${index + 1}`}>
      <KitPlayback part="clip" style="video">
        <div>{`Clip ${index + 1} preview`}</div>
      </KitPlayback>
      <KitAction part="clip" label={label} />
    </PartScope>
  ));
}

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <PhoneScreen
      defs={defs}
      renderers={{ MediaFixture }}
      screen={screen}
      theme={theme}
      media={media}
      resolvePlayback={resolvePlayback}
    />
  </TamaguiProvider>,
);
