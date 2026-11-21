import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { space, type ThemeDensity } from "../../../catalog";
import { useVariantDensity } from "../../provider";
import { KitLayoutText, type LayoutLine } from "./KitLayoutText";

type FigureProps = {
  caption?: ReactNode;
  density?: ThemeDensity | undefined;
  align?: "start" | "center" | "end";
} & (
  { media: ReactNode; value?: never; unit?: never } | { value: LayoutLine; unit?: LayoutLine; media?: never }
);

/** One captioned visual; a numeric value, when used, shares its baseline with the unit. */
export function KitFigure({ media, value, unit, caption, density, align = "start" }: FigureProps) {
  const spacing = useVariantDensity(density);
  const edge = align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start";
  return (
    <YStack gap={space[spacing.contentGap]}>
      {media ??
        (value?.text && (
          <XStack alignSelf={edge} alignItems="baseline" gap={space.sm}>
            <KitLayoutText
              line={{ role: "figure", tabular: true, ...value }}
              {...{ density, align }}
              baseline
            />
            {unit && (
              <KitLayoutText
                line={{ role: "caption", tone: "muted", ...unit }}
                {...{ density, align }}
                baseline
              />
            )}
          </XStack>
        ))}
      {caption}
    </YStack>
  );
}
