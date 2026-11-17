import { YStack, styled } from "tamagui";
import type { ReactNode } from "react";
import { component, space } from "../../catalog";
import { useKitStyle } from "../provider";
import { usePart } from "../part";
import { CardStyleContext, shifted, surfaceOf, type CardStyle } from "./style";

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
}: {
  children: ReactNode;
  style?: CardStyle;
  part?: string;
}) {
  const ks = useKitStyle();
  const surface = style === "inset" ? surfaceOf(ks.surface) : {};
  return (
    <CardStyleContext.Provider value={style}>
      <Frame
        {...usePart(part)}
        {...surface}
        cardStyle={style}
        borderRadius={shifted("md", ks.radiusShift)}
        padding={style === "inset" ? space.xs : component.base.none}
        gap={style === "cards" ? space[ks.density.gap] : component.base.none}
        accessibilityRole="list"
      >
        {children}
      </Frame>
    </CardStyleContext.Provider>
  );
}
