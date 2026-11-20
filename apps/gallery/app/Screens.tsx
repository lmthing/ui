// `?c=<Id>&w=<width>&mode=<light|dark>`: the component as a phone screen of that width, one column
// per preset, every example and state stacked. Used by `pnpm look` to check sizes automatically.
// Each screen frame carries data-look-frame and each label data-look-label, so checks can find them.
import { TamaguiProvider, Text, XStack, YStack } from "tamagui";
import { accents, components, presets, space, stampItemIds, type ComponentName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, renderers } from "@lmthing/ui/kit";
import { config, createSeededDraw, drawPreviewEnvironment, previewComponent } from "../index";
import { galleryParts } from "./parts";
import { resolvePhoto } from "./photos";
import { cellKey, cellLabel, cellsOf, DraftPreview, type Cell } from "./overview";

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
  const View = renderers[id as keyof typeof renderers] as ((props: object) => React.ReactNode) | undefined;
  const input = def.props.parse(cell.example) as Record<string, unknown>;
  const props = stampItemIds(def.meta, input);
  const screen = `${id.toLowerCase()}_${preset}_${mode}_${cellKey(cell)}`;
  const controller = View ? createSeededDraw(def, input, screen, cell) : undefined;
  if (cell.drawn && !controller) return null;
  return (
    <YStack gap={space.xs}>
      <Text fontSize={12} data-look-label>{`${preset} · ${cellLabel(cell)}`}</Text>
      <KitProvider
        theme={{ preset, mode, accent: accents[0]!.id } as never}
        parts={galleryParts}
        resolvePhoto={(ref) => resolvePhoto(ref, { preset, mode, accent: accents[0]!.id } as never)}
        {...(controller ? { controller, environment: drawPreviewEnvironment } : {})}
      >
        <YStack
          width={width}
          backgroundColor="$bg"
          paddingHorizontal={space.gutter}
          paddingVertical={space.lg}
          data-look-frame={screen}
        >
          <PartScope screen={screen} component={previewComponent} rev={1} state={cell.state}>
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
              <Screen key={cellKey(cell)} id={id} cell={cell} preset={preset.id} mode={mode} width={width} />
            ))}
          </YStack>
        ))}
      </XStack>
    </TamaguiProvider>
  );
}
