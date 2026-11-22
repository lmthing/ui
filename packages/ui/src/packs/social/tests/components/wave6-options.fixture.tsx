import { useState } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const screen: ScreenLike = {
  id: "home",
  components: [
    { ...components.Feed.examples[3], c: "Feed", id: "feed" },
    { ...components.Post.examples[3], c: "Post", id: "post" },
    { ...components.Stories.examples[2], c: "Stories", id: "stories" },
    { ...components.Invite.examples[2], c: "Invite", id: "invite" },
  ],
};
const media = {
  open: () => ({
    content: <span>Host video</span>,
    play() {},
    pause() {},
    seek() {},
    dispose() {},
  }),
};
const resolvePlayback = (address: string) => (address === "home/feed/r1/video" ? "clip_1" : undefined);

function Fixture() {
  const [destination, setDestination] = useState("");
  const [action, setAction] = useState("");
  return (
    <TamaguiProvider config={config}>
      <PhoneScreen
        theme={{ preset: "calm", mode: "light", accent: "moss" }}
        screen={screen}
        onLink={setDestination}
        onAction={(event) => setAction(event.address)}
        resolvePlayback={resolvePlayback}
        media={media}
        reduceMotion
      />
      <output id="destination">{destination}</output>
      <output id="action">{action}</output>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
