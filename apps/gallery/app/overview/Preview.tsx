import { Text, YStack } from "tamagui";
import { accents, component, components, space, stampItemIds } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, renderers } from "@lmthing/ui/kit";
import { galleryParts, resolvePhoto } from "../../index";
import type { Cell, modes } from "./gallery-data";
import { DraftPreview } from "./DraftPreview";

export function Preview({
  cell,
  preset,
  mode,
  responsive = false,
  label = true,
}: {
  cell: Cell;
  preset: string;
  mode: (typeof modes)[number];
  responsive?: boolean;
  label?: boolean;
}) {
  const def = components[cell.id];
  const View = renderers[cell.id as keyof typeof renderers] as (props: object) => React.ReactNode;
  const props = stampItemIds(def.meta, def.props.parse(cell.example) as Record<string, unknown>);
  const screen = `${cell.id.toLowerCase()}_${preset}_${mode}_${cell.index}_${cell.state}`;
  const theme = { preset, mode, accent: accents[0]!.id } as never;
  return (
    <YStack
      width={responsive ? "100%" : component.Gallery.cardWidth}
      maxWidth={responsive ? component.Gallery.cardWidth : undefined}
      {...(responsive && label
        ? {
            flexBasis: component.Gallery.variantWidth,
            flexGrow: component.base.bodyFlex,
            flexShrink: component.base.bodyFlex,
          }
        : {})}
      gap={space.sm}
      testID={`preview_${screen}`}
    >
      {label && (
        <Text
          fontWeight="bold"
          {...(responsive ? { fontFamily: "$humanist" } : {})}
        >{`${cell.id} · ${preset} / ${mode} · ${cell.state} ${cell.index + 1}`}</Text>
      )}
      <KitProvider theme={theme} parts={galleryParts} resolvePhoto={(ref) => resolvePhoto(ref, theme)}>
        <YStack
          padding={space.lg}
          minHeight={responsive ? component.base.none : component.Gallery.previewHeight}
          backgroundColor={responsive ? "$bg" : undefined}
        >
          <PartScope screen={screen} component="c1" rev={1} state={cell.state}>
            {View ? <View {...props} /> : <DraftPreview id={cell.id} />}
          </PartScope>
        </YStack>
      </KitProvider>
    </YStack>
  );
}
