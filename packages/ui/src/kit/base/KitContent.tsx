import type { ReactNode } from "react";
import { XStack, YStack, styled } from "tamagui";
import { space, type as typography } from "../../catalog";
import { useKitStyle } from "../provider";

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
  children,
}: {
  lead?: ReactNode;
  /** The text role of the first line, so the lead centres on it. */
  lineRole?: "body" | "heading" | "title";
  children: ReactNode;
}) {
  const ks = useKitStyle();
  return (
    <Frame gap={space[ks.density.gap]}>
      {lead && <Edge height={typography[lineRole].lineHeight}>{lead}</Edge>}
      <Text gap={space.xs}>{children}</Text>
    </Frame>
  );
}
