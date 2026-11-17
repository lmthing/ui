import { TamaguiProvider, Text, XStack, YStack } from "tamagui";
import { components, component, presets, space, type ThemeChoice } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, createMemoryParts, renderers } from "@lmthing/ui/kit";
import { config } from "../index";

const labels = ["Ledge · plant care", "Trot · dog walks"];
export const galleryParts = createMemoryParts();

function Preview({ preset, mode, example, index }: ThemeChoice & {
  example: (typeof components.List.examples)[number]; index: number;
}) {
  const parsed = components.List.props.parse(example);
  const rows = parsed.rows.map((row, rowIndex) => ({ ...row, id: `r${rowIndex + 1}` }));
  const screen = `${preset}_${mode}_${index}`;
  return <YStack width={component.Gallery.cardWidth} gap={space.sm} testID={`preview_${screen}`}>
    <Text fontWeight="bold">{`${preset} / ${mode} / moss`}</Text>
    <Text>{labels[index]}</Text>
    <KitProvider theme={{ preset, mode, accent: "moss" }} parts={galleryParts}>
      <YStack padding={space.lg} minHeight={component.Gallery.previewHeight}>
        <PartScope screen={screen} component="l1" rev={1} state="filled">
          <renderers.List style={parsed.style} rows={rows} />
        </PartScope>
      </YStack>
    </KitProvider>
  </YStack>;
}
export function Gallery() {
  return <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
    <YStack padding={space.xl} gap={space.xl} alignSelf="center" maxWidth={component.Gallery.maxWidth}>
      <Text accessibilityRole="header" fontSize="$title">List, from data to pixels</Text>
      <Text>Two examples. Three presets. Light and dark. Moss accent.</Text>
      <XStack flexWrap="wrap" gap={space.xl}>
        {presets.flatMap((preset) => (["light", "dark"] as const).flatMap((mode) =>
          components.List.examples.map((example, index) => <Preview
            key={`${preset.id}_${mode}_${index}`} preset={preset.id} mode={mode} accent="moss"
            example={example} index={index} />),
        ))}
      </XStack>
    </YStack>
  </TamaguiProvider>;
}
