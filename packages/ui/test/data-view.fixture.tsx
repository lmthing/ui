import { createRoot } from "react-dom/client";
import { useState } from "react";
import { TamaguiProvider } from "tamagui";
import { archetypes, components, space, themeName, type Issue, type ThemeChoice } from "@lmthing/ui/catalog";
import { PhoneScreen } from "../src/kit/screen";
import { Chips } from "../src/components/Chips";
import { Field } from "../src/components/Field";
import { Header } from "../src/components/Header";
import { List } from "../src/components/List";
import { Progress } from "../src/components/Progress";
import { Search } from "../src/components/Search";
import { SectionTitle } from "../src/components/SectionTitle";
import { Segmented } from "../src/components/Segmented";
import { Stats } from "../src/components/Stats";
import { config } from "../../../apps/gallery";
import { choiceFitScreen } from "../../../apps/gallery/app/choice-fit";

const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const example = new URLSearchParams(location.search).get("example");
const list = archetypes.list.dataViewExample;
const choices = {
  id: "add_class_slot",
  components: components.Field.examples.flatMap((input, index) =>
    input.kind === "choice" ? [{ ...input, c: "Field", id: `field_${index}` }] : [],
  ),
};
const screen =
  example === "long_tabs"
    ? choiceFitScreen
    : example === "choices"
      ? choices
      : example === "browse"
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

function Fixture() {
  const [issues, onReport] = useState<Issue[] | null>(null);
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <main style={{ paddingInline: example === "choices" ? space.xl : undefined }}>
        <PhoneScreen
          defs={components}
          renderers={{ Chips, Field, Header, List, Progress, Search, SectionTitle, Segmented, Stats }}
          screen={screen}
          theme={theme}
          onReport={onReport}
          reduceMotion
        />
      </main>
      {issues && (
        <output hidden data-testid="render-report">
          {JSON.stringify(issues)}
        </output>
      )}
    </TamaguiProvider>
  );
}

createRoot(document.body).render(<Fixture />);
