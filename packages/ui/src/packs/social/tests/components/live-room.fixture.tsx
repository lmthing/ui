import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen, type HostCommandAdapter } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const example = components.LiveRoom.examples[0]!;
const screen: ScreenLike = { id: "home", components: [{ ...example, id: "room", c: "LiveRoom" }] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

function Fixture() {
  const [request, setRequest] = useState("");
  const [record, setRecord] = useState({
    component: "room",
    roomKey: "fern_room",
    joined: true,
    promoted: false,
    micOn: false,
    isHost: true,
    handRaised: false,
    listenersCount: 24,
    speakers: example.speakers.map((speaker, index) => ({ ...speaker, speakerKey: `speaker_${index}` })),
  });
  const [hostCommands] = useState<HostCommandAdapter>(() => ({
    commands: Object.fromEntries(
      ["room.leave", "room.end", "room.hand", "room.react", "room.mute"].map((name) => [
        name,
        {
          allows: () => true,
          run: ({ input }) => {
            setRequest(`${name}:${JSON.stringify(input)}`);
            if (name === "room.hand")
              setRecord((current) => ({ ...current, handRaised: input.raised === true }));
            if (name === "room.leave") setRecord((current) => ({ ...current, joined: false }));
            return { status: "accepted" };
          },
        } satisfies NonNullable<HostCommandAdapter["commands"]>[string],
      ]),
    ),
  }));
  return (
    <TamaguiProvider config={config}>
      <PhoneScreen
        theme={theme}
        screen={screen}
        hostCommands={hostCommands}
        deviceData={{ social_live_rooms: [record] }}
        reduceMotion
      />
      <output id="request">{request}</output>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
