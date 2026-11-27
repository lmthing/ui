import React from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider, XStack, YStack } from "tamagui";
import {
  choiceOptions,
  presets,
  size,
  space,
  themeName,
  type ThemeChoice,
  type Values,
} from "@lmthing/ui/catalog";
import {
  createInteractionStore,
  KitInput,
  KitOption,
  KitRow,
  KitText,
  useKit,
  useLiveControls,
  usePart,
} from "@lmthing/ui/kit";
import { config } from "../render";
import { PhoneScreen, publishBrowserAgent } from "../../src/kit/screen";
import { defs, meta, part, screen, type PickerFixtureProps } from "./pickers.fixture";

function Sort({ order }: { order: PickerFixtureProps["order"] }) {
  const current = order === "new" ? "Newest first" : "Oldest first";
  const next = order === "new" ? "Oldest first" : "Newest first";
  const address = usePart("sort");
  const { controller } = useKit();
  return (
    <XStack
      {...address}
      role="button"
      alignItems="center"
      paddingHorizontal={space.md}
      minHeight={size.control.md}
      backgroundColor="$raised"
      borderRadius="$3"
      onPress={() => controller?.act({ address: address.testID, action: "select", value: next })}
    >
      <KitText role="label" part="sort_label">
        {current}
      </KitText>
    </XStack>
  );
}

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
      <Sort order={live.order} />
      <KitRow part="clear" role="button" label="Clear filters" lineRole="label">
        <KitText role="label" tone="muted" part="clear_label">
          Clear filters
        </KitText>
      </KitRow>
    </YStack>
  );
}

const params = new URLSearchParams(location.search);
const width = Number(params.get("w") ?? 390);
const mode = params.get("mode") === "dark" ? "dark" : "light";
const columns = params.has("w") ? presets.map(({ id }) => id) : (["calm"] as const);
const store = (open: boolean) => createInteractionStore(open ? { [part("$picker")]: "r1" } : {});
const renderers = { PickerFixture: Filters };
const fixtureDefs = params.has("gate")
  ? {
      PickerFixture: {
        ...defs.PickerFixture,
        meta: {
          ...meta,
          actions: {
            ...meta.actions,
            when: { "root.press": { title: "Light" }, "root.select": { title: "Room" } },
          },
        },
      },
    }
  : defs;
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
          onReady={publishBrowserAgent}
          defs={fixtureDefs}
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
