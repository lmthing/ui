// `?c=<Id>&w=<width>&mode=<light|dark>`: the component as a phone screen of that width, one column
// per preset, every example and state stacked. Used by `pnpm look` to check sizes automatically.
// Each screen frame carries data-look-frame and each label data-look-label, so checks can find them.
import { TamaguiProvider, Text, XStack, YStack } from "tamagui";
import {
  accents,
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
import { resolvePhoto } from "./photos";
import { DraftPreview } from "./overview";

type Cell = { example: unknown; index: number; state: StateName };

function cellsOf(id: ComponentName): Cell[] {
  const { meta, examples } = components[id];
  const states = (meta as { states?: readonly StateName[] }).states ?? ["filled"];
  return [
    ...examples.map((example, index) => ({ example, index, state: "filled" as const })),
    ...states
      .filter((state) => state !== "filled")
      .map((state) => ({ example: examples[0], index: 0, state })),
  ];
}

function Screen({
  id,
  cell,
  preset,
  mode,
  width,
}: {
  id: ComponentName;
  cell: Cell;
  preset: string;
  mode: "light" | "dark";
  width: number;
}) {
  const def = components[id];
  const View = renderers[id as keyof typeof renderers] as (props: object) => React.ReactNode;
  const props = stampItemIds(def.meta, def.props.parse(cell.example) as Record<string, unknown>);
  const screen = `${id.toLowerCase()}_${preset}_${mode}_${cell.index}_${cell.state}`;
  return (
    <YStack gap={space.xs}>
      <Text fontSize={12} data-look-label>{`${preset} · ${cell.state} ${cell.index + 1}`}</Text>
      <KitProvider
        theme={{ preset, mode, accent: accents[0]!.id } as never}
        parts={galleryParts}
        resolvePhoto={(ref) => resolvePhoto(ref, { preset, mode, accent: accents[0]!.id } as never)}
      >
        <YStack
          width={width}
          backgroundColor="$bg"
          paddingHorizontal={space.gutter}
          paddingVertical={space.lg}
          data-look-frame={screen}
        >
          <PartScope screen={screen} component="c1" rev={1} state={cell.state}>
            {View ? <View {...props} /> : <DraftPreview id={id} />}
          </PartScope>
        </YStack>
      </KitProvider>
    </YStack>
  );
}

export function Screens({ id, width, mode }: { id: ComponentName; width: number; mode: "light" | "dark" }) {
  return (
    <TamaguiProvider config={config} defaultTheme={`kit_calm_${mode}_moss`}>
      <XStack
        padding={space.lg}
        gap={space.xl}
        alignItems="flex-start"
        backgroundColor="$bg"
        minHeight="100vh"
      >
        {presets.map((preset) => (
          <YStack key={preset.id} gap={space.lg}>
            {cellsOf(id).map((cell) => (
              <Screen
                key={`${cell.index}_${cell.state}`}
                id={id}
                cell={cell}
                preset={preset.id}
                mode={mode}
                width={width}
              />
            ))}
          </YStack>
        ))}
      </XStack>
    </TamaguiProvider>
  );
}
