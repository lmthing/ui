import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { PhoneScreen } from "@lmthing/ui/kit";
import { components } from "@lmthing/ui/catalog";
import { config } from "../../../../../test/render";

const screen = {
  id: "home",
  components: [{ ...components.ModQueue.examples[0]!, c: "ModQueue", id: "mod" }],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      screen={screen}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      hostCommands={{
        commands: {
          moderate_item: {
            allows: () => true,
            run: ({ input }) => ({
              status:
                input.itemId === "lee_post" &&
                input.decision === "removed" &&
                input.reason === "No advertising"
                  ? "accepted"
                  : "rejected",
            }),
          },
        },
      }}
    />
  </TamaguiProvider>,
);
