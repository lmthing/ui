import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../test/render";

const screen = {
  id: "home",
  components: [
    { c: "Bubbles", id: "chat", messages: [{ from: "them", text: "Hello" }] },
    { c: "Composer", id: "reply", style: "reply", hint: "Write a reply", attach: true },
  ],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      screen={screen}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      attachments={{
        canRun: () => true,
        run: async () => ({ status: "accepted", reference: "test_file" }),
      }}
    />
  </TamaguiProvider>,
);
