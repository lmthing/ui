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
import { KitProvider, PartScope, PhoneScreen, renderers, useKitStyle } from "@lmthing/ui/kit";
import type { ReactNode } from "react";
import { config, drawPreviewEnvironment, previewComponent } from "../index";
import { createPreviewController, SignaturePreview } from "./draw";
import { galleryParts } from "./parts";
import { choiceFitScreen } from "./choice-fit";
import {
  lookPhoto,
  mediaProgressFixtures,
  resolveMediaFixture,
  withoutHiddenFixtureSlots,
} from "./media-progress";
import type { ScreenLike, ThemeChoice } from "@lmthing/ui/catalog";
import { cellKey, cellLabel, cellsOf, DraftPreview, screenPresets, type Cell } from "./overview";

function screenCells(id: ComponentName): Cell[] {
  const cells = cellsOf(id);
  if (id !== "Documents") return cells;
  // Keep the folder skeleton beside its filled example for visual review only.
  const folders = cells[components.Documents.examples.findIndex(({ style }) => style === "folders")];
  return folders ? [...cells, { ...folders, state: "loading" }] : cells;
}

function lookFrameId(id: ComponentName, preset: string, mode: "light" | "dark", name: string) {
  return `${id.toLowerCase()}_${preset}_${mode}_${name}`;
}

function LookFrame({ screen, width, children }: { screen: string; width: number; children: ReactNode }) {
  return (
    <YStack
      width={width}
      backgroundColor="$bg"
      paddingHorizontal={space[useKitStyle().frame.gutter]}
      paddingVertical={space.lg}
      data-look-frame={screen}
    >
      {children}
    </YStack>
  );
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
  const screen = lookFrameId(id, preset, mode, cellKey(cell));
  const controller = View ? createPreviewController(def, input, screen, cell) : undefined;
  if (cell.drawn && !controller) return null;
  const view = View ? <View {...props} /> : <DraftPreview id={id} />;
  return (
    <YStack gap={space.xs}>
      <Text fontSize={12} data-look-label>{`${preset} · ${cellLabel(cell)}`}</Text>
      <KitProvider
        theme={{ preset, mode, accent: accents[0]!.id } as never}
        parts={galleryParts}
        resolvePhoto={(ref) => lookPhoto(ref, { preset, mode, accent: accents[0]!.id } as never, id)}
        interactive={Boolean(def.meta.actions?.reveal || controller?.scannerBrightnessAvailable())}
        {...(controller ? { controller, environment: drawPreviewEnvironment } : {})}
      >
        <LookFrame {...{ width, screen }}>
          <PartScope screen={screen} component={previewComponent} rev={1} state={cell.state}>
            {id === "Signature" && cell.state === "filled" ? (
              <SignaturePreview style={input.style}>{view}</SignaturePreview>
            ) : id === "Field" && input.kind === "choice" ? (
              <YStack paddingHorizontal={space.xl}>{view}</YStack>
            ) : (
              view
            )}
          </PartScope>
        </LookFrame>
      </KitProvider>
    </YStack>
  );
}

function FixtureScreen({
  id,
  screen,
  theme,
  width,
}: {
  id: ComponentName;
  screen: ScreenLike;
  theme: ThemeChoice;
  width: number;
}) {
  return (
    <YStack gap={space.xs}>
      <Text fontSize={12} data-look-label>{`${theme.preset} · ${screen.id.replaceAll("_", " ")}`}</Text>
      <YStack
        width={width}
        backgroundColor="$bg"
        data-look-frame={lookFrameId(id, theme.preset, theme.mode, `fixture_${screen.id}`)}
      >
        <PhoneScreen
          {...{ screen, theme }}
          resolvePhoto={(ref) => resolveMediaFixture(ref, theme)}
          interactive={screen.id === "garden_gallery" || screen.id === choiceFitScreen.id}
          reduceMotion
          agentMode
        />
      </YStack>
    </YStack>
  );
}

export function Screens({
  id,
  width,
  mode,
  presetIds,
  omitHidden = false,
}: {
  id: ComponentName;
  width: number;
  mode: "light" | "dark";
  presetIds: readonly string[];
  omitHidden?: boolean;
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
            {mediaProgressFixtures[id]?.map((screen) => (
              <FixtureScreen
                key={screen.id}
                id={id}
                screen={omitHidden ? withoutHiddenFixtureSlots(screen) : screen}
                width={width}
                theme={{ preset: preset.id, mode, accent: accents[0]!.id }}
              />
            ))}
            {id === "Segmented" && (
              <FixtureScreen
                id={id}
                screen={choiceFitScreen}
                width={width}
                theme={{ preset: preset.id, mode, accent: accents[0]!.id }}
              />
            )}
          </YStack>
        ))}
      </XStack>
    </TamaguiProvider>
  );
}
