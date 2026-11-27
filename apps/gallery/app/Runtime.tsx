import { TamaguiProvider, YStack } from "tamagui";
import { type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen, publishBrowserAgent } from "@lmthing/ui/kit";
import { config } from "../index";
import { resolveMedia } from "./media";
import { resolvePhoto } from "./photos";

const screen: ScreenLike = {
  id: "home",
  components: [
    { id: "h1", c: "Header", title: "Recordings" },
    { id: "p1", c: "Player", title: "Local tone", media: "lib:fixture", seconds: 30 },
    {
      id: "a1",
      c: "Actions",
      items: [
        { label: "Pick room", icon: "home", goto: "sheet" },
        { label: "Recordings", icon: "music", goto: "recordings" },
      ],
    },
    { id: "b1", c: "Button", label: "Choose room", kind: "secondary", goto: "sheet" },
    {
      id: "b2",
      c: "Button",
      label: "Remove recording",
      kind: "danger",
      confirm: "Remove this recording?",
      goto: "removed",
    },
    {
      id: "s1",
      c: "Sheet",
      style: "picker",
      title: "Room",
      items: ["Hall", "Kitchen", "Bathroom", "Bedroom", "Balcony", "Living room"].map((label) => ({ label })),
    },
  ],
};
const onLink = (goto: string, address: string) => {
  globalThis.dispatchEvent(new CustomEvent("gallery-link", { detail: { goto, address } }));
};
export function Runtime() {
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <YStack width="100%" maxWidth={430} height="100vh" alignSelf="center">
        <PhoneScreen
          screen={screen}
          onReady={publishBrowserAgent}
          theme={{ preset: "calm", mode: "light", accent: "moss" }}
          resolveMedia={resolveMedia}
          resolvePhoto={resolvePhoto}
          onLink={onLink}
        />
      </YStack>
    </TamaguiProvider>
  );
}
