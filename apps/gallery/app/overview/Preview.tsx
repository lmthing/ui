import { Text, YStack } from "tamagui";
import { accents, component, components, space, stampItemIds } from "@lmthing/ui/catalog";
import { KitProvider, PartScope, renderers } from "@lmthing/ui/kit";
import { variantSheet } from "../../../../packages/ui/scripts/variants";
import { drawPreviewEnvironment, galleryParts, previewComponent, resolvePhoto } from "../../index";
import { createPreviewController } from "../draw";
import { cellKey, cellLabel, type Cell, type modes } from "./gallery-data";
import { DraftPreview } from "./DraftPreview";

const responsiveCard = {
  flexBasis: component.Gallery.variantWidth,
  flexGrow: component.base.bodyFlex,
  flexShrink: component.base.bodyFlex,
};

type PreviewProps = {
  cell: Cell;
  preset: string;
  mode: (typeof modes)[number];
  responsive?: boolean;
  label?: boolean;
  variant?: { label: string; index: number; sheet: boolean };
};

export function Preview({ cell, preset, mode, responsive = false, label = true, variant }: PreviewProps) {
  const def = components[cell.id];
  const View = renderers[cell.id as keyof typeof renderers] as
    ((props: object) => React.ReactNode) | undefined;
  const input = def.props.parse(cell.example) as Record<string, unknown>;
  const props = stampItemIds(def.meta, input);
  const legacyScreen = `${cell.id.toLowerCase()}_${preset}_${mode}_${cellKey(cell)}`;
  const screen = variant ? `${cell.id.toLowerCase()}_variant_${variant.index}` : legacyScreen;
  const theme = { preset, mode, accent: accents[0]!.id } as never;
  const controller = View ? createPreviewController(def, input, screen, cell) : undefined;
  if (cell.drawn && !controller) return null;
  return (
    <YStack
      width={variant?.sheet ? variantSheet.width : responsive ? "100%" : component.Gallery.cardWidth}
      maxWidth={responsive ? component.Gallery.cardWidth : undefined}
      {...(responsive && label ? responsiveCard : {})}
      gap={space.sm}
      testID={`${variant ? "variant_preview" : "preview"}_${screen}`}
    >
      {label && (
        <Text
          fontWeight="bold"
          {...(responsive ? { fontFamily: "$humanist" } : {})}
          {...(variant?.sheet ? { "data-look-label": true } : {})}
        >
          {variant?.label ?? `${cell.id} · ${preset} / ${mode} · ${cellLabel(cell)}`}
        </Text>
      )}
      <KitProvider
        theme={theme}
        parts={galleryParts}
        resolvePhoto={(ref) => resolvePhoto(ref, theme)}
        {...(controller ? { controller, environment: drawPreviewEnvironment } : {})}
      >
        <YStack
          paddingHorizontal={variant?.sheet ? space.gutter : space.lg}
          paddingVertical={space.lg}
          minHeight={responsive || variant?.sheet ? component.base.none : component.Gallery.previewHeight}
          backgroundColor={responsive || variant?.sheet ? "$bg" : undefined}
          {...(variant?.sheet ? { "data-look-frame": screen } : {})}
        >
          <PartScope screen={screen} component={previewComponent} rev={1} state={cell.state}>
            {View ? <View {...props} /> : <DraftPreview id={cell.id} />}
          </PartScope>
        </YStack>
      </KitProvider>
    </YStack>
  );
}
