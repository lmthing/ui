import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { components, themeName } from "@lmthing/ui/catalog";
import { PhoneScreen, renderers } from "@lmthing/ui/kit";
import { config } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const seed = components.BoxScore.examples[0]!;
const columns = ["MIN", "PTS", "REB", "AST", "STL", "BLK", "TO", "PF"];
const wide = (players: typeof seed.homePlayers) =>
  players.map((row) => ({
    ...row,
    stats: [...row.stats, "1", "2", "3", "129"],
  }));
const screen = {
  id: "home",
  components: [
    {
      id: "c1",
      c: "BoxScore",
      ...seed,
      columns,
      homePlayers: wide(seed.homePlayers),
      awayPlayers: wide(seed.awayPlayers),
    },
  ],
};

createRoot(document.getElementById("root")!).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <PhoneScreen
      {...{ screen, theme, renderers }}
      defs={components}
      onReady={(agent) => {
        window.__lmthingUI = agent;
      }}
      onLink={(goto) => {
        document.body.dataset.profile = goto;
      }}
    />
  </TamaguiProvider>,
);
