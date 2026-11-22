// `?c=<Id>&w=<width>&mode=<light|dark>&preset=<id>`: the component at phone width, one column
// per selected preset (or all if omitted), every example and state stacked.
// Each screen frame carries data-look-frame and each label data-look-label, so checks can find them.
import { TamaguiProvider, Text, XStack, YStack } from "tamagui";
import {
  accents,
  components,
  space,
  stampItemIds,
  type ComponentName,
  type Definition,
} from "@lmthing/ui/catalog";
import { KitProvider, PartScope, renderers } from "@lmthing/ui/kit";
import { config, drawPreviewEnvironment, previewComponent } from "../index";
import { createPreviewController, SignaturePreview } from "./draw";
import { galleryParts } from "./parts";
import { resolvePhoto } from "./photos";
import { cellKey, cellLabel, cellsOf, DraftPreview, screenPresets, type Cell } from "./overview";

function screenCells(id: ComponentName): Cell[] {
  const cells = cellsOf(id);
  if (id !== "Documents") return cells;
  // Keep the folder skeleton beside its filled example for visual review only.
  const folders = cells[components.Documents.examples.findIndex(({ style }) => style === "folders")];
  return folders ? [...cells, { ...folders, state: "loading" }] : cells;
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
  const def: Definition = components[id];
  const View = renderers[id as keyof typeof renderers] as ((props: object) => React.ReactNode) | undefined;
  const input = def.props.parse(cell.example) as Record<string, unknown>;
  const props = stampItemIds(def.meta, input);
  const screen = `${id.toLowerCase()}_${preset}_${mode}_${cellKey(cell)}`;
  const controller = View ? createPreviewController(def, input, screen, cell) : undefined;
  if (cell.drawn && !controller) return null;
  const view = View ? <View {...props} /> : <DraftPreview id={id} />;
  return (
    <YStack gap={space.xs}>
      <Text fontSize={12} data-look-label>{`${preset} · ${cellLabel(cell)}`}</Text>
      <KitProvider
        theme={{ preset, mode, accent: accents[0]!.id } as never}
        parts={galleryParts}
        resolvePhoto={(ref) => resolvePhoto(ref, { preset, mode, accent: accents[0]!.id } as never)}
        interactive={Boolean(def.meta.actions?.reveal)}
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
            {id === "Signature" && cell.state === "filled" ? (
              <SignaturePreview style={input.style}>{view}</SignaturePreview>
            ) : (
              view
            )}
          </PartScope>
        </YStack>
      </KitProvider>
    </YStack>
  );
}

export function Screens({
  id,
  width,
  mode,
  presetIds,
}: {
  id: ComponentName;
  width: number;
  mode: "light" | "dark";
  presetIds: readonly string[];
}) {
  const cells = screenCells(id);
  return (
    <TamaguiProvider config={config} defaultTheme={`kit_calm_${mode}_moss`}>
      <XStack
        padding={space.lg}
        gap={space.xl}
        alignItems="flex-start"
        backgroundColor="$bg"
        minHeight="100vh"
      >
        {screenPresets(presetIds).map((preset) => (
          <YStack key={preset.id} gap={space.lg}>
            {cells.map((cell) => (
              <Screen key={cellKey(cell)} id={id} cell={cell} preset={preset.id} mode={mode} width={width} />
            ))}
          </YStack>
        ))}
      </XStack>
    </TamaguiProvider>
  );
}
