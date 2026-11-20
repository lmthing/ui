import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider, YStack } from "tamagui";
import { choiceOptions, presets, space, themeName, type ThemeChoice, type Values } from "@lmthing/ui/catalog";
import {
  createInteractionStore,
  KitAction,
  KitInput,
  KitOption,
  KitText,
  useLiveControls,
} from "@lmthing/ui/kit";
import { config } from "../render";
import { PhoneScreen } from "../../src/kit/screen";
import { defs, meta, part, screen, type PickerFixtureProps } from "./pickers.fixture";

function Filters(props: PickerFixtureProps) {
  const live = useLiveControls(meta, props) as PickerFixtureProps;
  return (
    <YStack gap={space.sm}>
      <KitText role="heading" part="root">
        Plant filters
      </KitText>
      <KitInput kind="search" hint="Search plants" value={live.query} />
      {live.filters.map((row) => {
        const { id } = row as typeof row & { id: string };
        const options = choiceOptions(meta, live as Values, id) ?? [];
        const choices = options.map(({ label, value }) => label ?? String(value));
        const selected = choices[options.findIndex(({ value }) => value === row.selected)];
        return <KitOption key={id} item={id} title={row.title} choices={choices} selected={selected} />;
      })}
      <KitAction
        part="sort"
        kind="quiet"
        label={live.order === "new" ? "Newest first" : "Oldest first"}
        action="select"
        value={live.order === "new" ? "Oldest first" : "Newest first"}
        full
      />
      <KitAction part="clear" kind="quiet" label="Clear filters" action="press" full />
    </YStack>
  );
}

const params = new URLSearchParams(location.search);
const width = Number(params.get("w") ?? 390);
const mode = params.get("mode") === "dark" ? "dark" : "light";
const columns = params.has("w") ? presets.map(({ id }) => id) : (["calm"] as const);
const store = (open: boolean) => createInteractionStore(open ? { [part("$picker")]: "r1" } : {});
const renderers = { PickerFixture: Filters };
function Frame({ preset, open }: { preset: ThemeChoice["preset"]; open: boolean }) {
  const theme = { preset, mode, accent: "moss" } satisfies ThemeChoice;
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <YStack
        width={width}
        height={width * 1.45}
        backgroundColor="$bg"
        dataSet={{ lookFrame: `${preset}-${open ? "open" : "closed"}` }}
      >
        <PhoneScreen
          defs={defs}
          renderers={renderers}
          screen={screen}
          theme={theme}
          interaction={store(open)}
          reduceMotion
        />
      </YStack>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <div style={{ display: "flex", gap: space.md }}>
    {columns.map((preset) => (
      <div key={preset} style={{ display: "grid", gap: space.md }}>
        <Frame preset={preset} open={false} />
        {params.has("w") && <Frame preset={preset} open />}
      </div>
    ))}
  </div>,
);
