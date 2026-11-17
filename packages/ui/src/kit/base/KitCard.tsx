import { YStack, styled } from "tamagui";
import type { ReactNode } from "react";
import { component, space } from "../../catalog";
import { useKitStyle } from "../provider";
import { usePart } from "../part";
import {
  CardStyleContext,
  outlined,
  shifted,
  surfaceOf,
  tintOf,
  type CardStyle,
  type SurfaceTone,
} from "./style";

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
}: {
  children: ReactNode;
  style?: CardStyle;
  part?: string;
  /** `inset` cards only: the preset surface (default), a `tinted` fill in the tone, or an `outlined` rule. */
  look?: "surface" | "tinted" | "outlined";
  tone?: SurfaceTone;
  /** Clip children to the rounded corners (a photo at the top of a card). */
  clip?: boolean;
}) {
  const ks = useKitStyle();
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
        {...usePart(part)}
        {...surface}
        cardStyle={style}
        borderRadius={shifted("md", ks.radiusShift)}
        padding={style === "inset" ? space.xs : component.base.none}
        gap={style === "cards" ? space[ks.density.gap] : component.base.none}
        {...(clip ? { overflow: "hidden" as const } : {})}
        accessibilityRole="list"
      >
        {children}
      </Frame>
    </CardStyleContext.Provider>
  );
}
