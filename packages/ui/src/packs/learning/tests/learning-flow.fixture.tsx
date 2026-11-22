import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../test/render";

const screen = {
  id: "home",
  components: [
    { ...components.Gradebook.examples[0]!, id: "grades", c: "Gradebook" },
    { ...components.WorkedSolution.examples[0]!, id: "solution", c: "WorkedSolution" },
  ],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      screen={screen}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      onLink={(destination) => {
        document.body.dataset.link = destination;
      }}
    />
  </TamaguiProvider>,
);
