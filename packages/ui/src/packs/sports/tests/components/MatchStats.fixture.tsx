import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, themeName, type ScreenLike } from "@lmthing/ui/catalog";
import { PhoneScreen } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const seed = components.MatchStats.examples[0]!;
const screen: ScreenLike = {
  id: "home",
  components: [
    {
      id: "c1",
      c: "MatchStats",
      ...seed,
      periods: [...seed.periods, "Second half"],
      metrics: seed.metrics.map((metric) => ({
        ...metric,
        periodValues: undefined,
      })),
    },
    { id: "c2", c: "MatchStats", ...seed },
  ],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <PhoneScreen {...{ screen, theme }} />
  </TamaguiProvider>,
);
