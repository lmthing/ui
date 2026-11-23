import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { archetypes, components, themeName, type ThemeChoice } from "@lmthing/ui/catalog";
import { PhoneScreen } from "../src/kit/screen";
import { Chips } from "../src/components/Chips";
import { Header } from "../src/components/Header";
import { List } from "../src/components/List";
import { Progress } from "../src/components/Progress";
import { Search } from "../src/components/Search";
import { SectionTitle } from "../src/components/SectionTitle";
import { Segmented } from "../src/components/Segmented";
import { Stats } from "../src/components/Stats";
import { config } from "../../../apps/gallery";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const example = new URLSearchParams(location.search).get("example");
const list = archetypes.list.dataViewExample;
const screen =
  example === "browse"
    ? archetypes.browse.dataViewExample
    : example === "list"
      ? list
      : example === "empty"
        ? {
            ...list,
            components: list.components.map((entry) =>
              entry.c === "List" ? { ...entry, state: "empty" as const } : entry,
            ),
          }
        : archetypes.dashboard.dataViewExample;

createRoot(document.body).render(
  <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
    <PhoneScreen
      defs={components}
      renderers={{ Chips, Header, List, Progress, Search, SectionTitle, Segmented, Stats }}
      screen={screen}
      theme={theme}
      reduceMotion
    />
  </TamaguiProvider>,
);
