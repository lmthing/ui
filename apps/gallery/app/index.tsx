// Every ready component × example × declared state, in every preset and mode (first accent).
// `?c=List` shows one component. New component files appear here with no gallery change.
import { TamaguiProvider, Text, XStack, YStack } from "tamagui";
import {
  accents,
  component,
  components,
  presets,
  space,
  stampItemIds,
  type ComponentName,
  type StateName,
} from "@lmthing/ui/catalog";
import { KitProvider, PartScope, renderers } from "@lmthing/ui/kit";
import { config } from "../index";

import { galleryParts } from "./parts";
import { Screens } from "./Screens";
const modes = ["light", "dark"] as const;
const query = new URLSearchParams(globalThis.location?.search ?? "");
const only = query.get("c");
const onlyPreset = query.get("preset");
const onlyMode = query.get("mode");
const width = Number(query.get("w")) || 0;

type Cell = { id: ComponentName; example: unknown; index: number; state: StateName };

function cellsOf(id: ComponentName): Cell[] {
  const { meta, examples } = components[id];
  const states = (meta as { states?: readonly StateName[] }).states ?? ["filled"];
  return [
    ...examples.map((example, index) => ({ id, example, index, state: "filled" as const })),
    ...states
      .filter((state) => state !== "filled")
      .map((state) => ({ id, example: examples[0], index: 0, state })),
  ];
}

function Preview({ cell, preset, mode }: { cell: Cell; preset: string; mode: (typeof modes)[number] }) {
  const def = components[cell.id];
  const View = renderers[cell.id as keyof typeof renderers] as (props: object) => React.ReactNode;
  const props = stampItemIds(def.meta, def.props.parse(cell.example) as Record<string, unknown>);
  const screen = `${cell.id.toLowerCase()}_${preset}_${mode}_${cell.index}_${cell.state}`;
  const theme = { preset, mode, accent: accents[0]!.id } as never;
  return (
    <YStack width={component.Gallery.cardWidth} gap={space.sm} testID={`preview_${screen}`}>
      <Text fontWeight="bold">{`${cell.id} · ${preset} / ${mode} · ${cell.state} ${cell.index + 1}`}</Text>
      <KitProvider theme={theme} parts={galleryParts}>
        <YStack padding={space.lg} minHeight={component.Gallery.previewHeight}>
          <PartScope screen={screen} component="c1" rev={1} state={cell.state}>
            <View {...props} />
          </PartScope>
        </YStack>
      </KitProvider>
    </YStack>
  );
}

export function Gallery() {
  if (only && width) {
    return <Screens id={only as ComponentName} width={width} mode={onlyMode === "dark" ? "dark" : "light"} />;
  }
  const ids = (Object.keys(renderers) as ComponentName[]).filter((id) => !only || id === only);
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <YStack padding={space.xl} gap={space.xl} alignSelf="center" maxWidth={component.Gallery.maxWidth}>
        {ids.map((id) => (
          <YStack key={id} gap={space.lg}>
            <Text accessibilityRole="header" fontSize="$title">
              {id}
            </Text>
            <XStack flexWrap="wrap" gap={space.xl}>
              {presets
                .filter((preset) => !onlyPreset || preset.id === onlyPreset)
                .flatMap((preset) =>
                  modes
                    .filter((mode) => !onlyMode || mode === onlyMode)
                    .flatMap((mode) =>
                      cellsOf(id).map((cell) => (
                        <Preview
                          key={`${preset.id}_${mode}_${cell.index}_${cell.state}`}
                          cell={cell}
                          preset={preset.id}
                          mode={mode}
                        />
                      )),
                    ),
                )}
            </XStack>
          </YStack>
        ))}
      </YStack>
    </TamaguiProvider>
  );
}
