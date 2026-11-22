import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen, type HostCommandAdapter } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const { slides } = components.StoryViewer.examples[0]!;
const screen: ScreenLike = {
  id: "home",
  components: [{ id: "story", c: "StoryViewer", author: "Maya", slides, paused: true }],
};
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function Fixture() {
  const [lastRequest, setRequest] = useState("");
  const [hostCommands] = useState<HostCommandAdapter>(() => ({
    commands: Object.fromEntries(
      ["story.sticker", "story.reply", "story.react"].map((name) => [
        name,
        {
          allows: () => true,
          run: (request) => {
            setRequest(JSON.stringify(request.input));
            return { status: "accepted" };
          },
        } satisfies NonNullable<HostCommandAdapter["commands"]>[string],
      ]),
    ),
  }));
  return (
    <TamaguiProvider config={config}>
      <PhoneScreen theme={theme} screen={screen} hostCommands={hostCommands} reduceMotion />
      <output id="request">{lastRequest}</output>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
