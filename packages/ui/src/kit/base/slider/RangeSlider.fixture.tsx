import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../test/render";

const range = { c: "Field", kind: "range", min: 0, max: 10 };
const screen = {
  id: "home",
  components: [
    { ...range, id: "start", label: "At start", lower: 0, upper: 0 },
    { ...range, id: "end", label: "At end", lower: 10, upper: 10 },
    {
      c: "Bars",
      id: "chart",
      title: "Share",
      style: "share",
      points: [
        { label: "Park", value: 10, icon: "tree", goto: "park" },
        { label: "River", value: 20 },
      ],
    },
  ],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <PhoneScreen
      screen={screen}
      theme={{ preset: "calm", mode: "light", accent: "moss" }}
      onLink={(destination) => {
        document.title = destination;
      }}
    />
  </TamaguiProvider>,
);
