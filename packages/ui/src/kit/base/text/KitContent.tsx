import type { ReactNode } from "react";
import { XStack, YStack, styled } from "tamagui";
import { component, space, type as typography, variants, type AxisValue } from "../../../catalog";
import { useVariantDensity } from "../../provider";
import { useTextStep, type TextFinish } from "./text-step";

const Frame = styled(XStack, { alignItems: "flex-start" });
const Edge = styled(YStack, { justifyContent: "center", alignItems: "center" });
const Text = styled(YStack, { flex: 1 });

/**
 * The text of a card with one root address (a padded `KitCard`): an optional leading icon or thumbnail
 * centred on the first line, and the text lines stacked with a small gap. It stamps no address of its
 * own, unlike `KitRow` and `KitBlock`.
 */
export function KitContent({
  lead,
  lineRole = "heading",
  leadingAlign = "line",
  inset = "none",
  group = "content",
  align = "start",
  density,
  emphasis,
  children,
}: {
  lead?: ReactNode;
  /** The text role of the first line, so the lead centres on it. */
  lineRole?: "body" | "heading" | "title";
  /** `row` centres a thumbnail taller than a line on the whole text (default `line`, for icons). */
  leadingAlign?: "line" | "row";
  /** `md` insets the content by a row's side padding, without stamping an address. */
  inset?: "none" | "md";
  /** A response group separates from the preceding content without changing its internal gap. */
  group?: "content" | "response";
  align?: AxisValue<"align">;
  children: ReactNode;
} & TextFinish) {
  const gap = space[useVariantDensity(density).gap];
  const line = typography[useTextStep({ density, emphasis })(lineRole)].lineHeight;
  return (
    <Frame
      gap={gap}
      paddingHorizontal={inset === "md" ? space.md : component.base.none}
      {...(group === "response" ? { marginTop: space.md - space.xs } : {})}
    >
      {lead &&
        (leadingAlign === "row" ? <Edge alignSelf="center">{lead}</Edge> : <Edge height={line}>{lead}</Edge>)}
      <Text gap={space.xs} {...(align === "center" ? { alignItems: variants.align.center.content } : {})}>
        {children}
      </Text>
    </Frame>
  );
}
