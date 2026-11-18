import { YStack, styled } from "tamagui";
import type { ReactNode } from "react";
import { component, space } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { usePart } from "../../part";
import {
  CardStyleContext,
  outlined,
  shifted,
  surfaceOf,
  tintOf,
  type CardStyle,
  type SurfaceTone,
} from "../text";

const Frame = styled(YStack, {
  variants: {
    cardStyle: {
      plain: { backgroundColor: "transparent" },
      inset: {},
      cards: { backgroundColor: "transparent" },
    },
  } as const,
});
export function KitCard({
  children,
  style = "inset",
  part = "root",
  look = "surface",
  tone = "neutral",
  clip = false,
  goto,
  label,
  padded = false,
}: {
  children: ReactNode;
  style?: CardStyle;
  part?: string;
  /** `inset` cards only: the preset surface (default), a `tinted` fill in the tone, or an `outlined` rule. */
  look?: "surface" | "tinted" | "outlined";
  tone?: SurfaceTone;
  /** Clip children to the rounded corners (a photo at the top of a card). */
  clip?: boolean;
  /** Makes the whole card one link (needs `label`): one root address, press goes to `goto`. */
  goto?: string | undefined;
  label?: string;
  /** Insets the children like a row's content (for a component built from text and icons, not rows). */
  padded?: boolean;
}) {
  const ks = useKitStyle();
  const kit = useKit();
  const root = usePart(part);
  const surface =
    style !== "inset"
      ? {}
      : look === "tinted"
        ? tintOf(tone)
        : look === "outlined"
          ? outlined
          : surfaceOf(ks.surface);
  return (
    <CardStyleContext.Provider value={style}>
      <Frame
        {...root}
        {...surface}
        cardStyle={style}
        borderRadius={shifted("md", ks.radiusShift)}
        padding={padded ? space.md : style === "inset" ? space.xs : component.base.none}
        gap={style === "cards" ? space[ks.density.gap] : padded ? space.sm : component.base.none}
        {...(clip ? { overflow: "hidden" as const } : {})}
        accessibilityRole={goto ? "link" : "list"}
        {...(label ? { accessibilityLabel: label } : {})}
        {...(kit.interactive && kit.controller && goto
          ? { onPress: () => kit.controller!.press(root.testID) }
          : kit.interactive && goto
            ? { onPress: () => kit.onLink?.(goto, root.testID) }
            : {})}
      >
        {children}
      </Frame>
    </CardStyleContext.Provider>
  );
}
