import * as Lucide from "@tamagui/lucide-icons";
import { YStack, styled } from "tamagui";
import { iconTable, size, type IconName } from "../../catalog";
import { usePart } from "../part";

const Frame = styled(YStack, { alignItems: "center", justifyContent: "center" });

export type IconTone = "accent" | "muted" | "text" | "onAccent" | "good" | "warn" | "bad";

export function KitIcon({
  name = "dot",
  part = "icon",
  tone = "accent",
  scale = "md",
}: {
  name?: IconName | undefined;
  part?: string;
  tone?: IconTone;
  scale?: keyof typeof size.icon;
}) {
  const Icon = Lucide[iconTable[name]];
  return (
    <Frame {...usePart(part)} accessibilityElementsHidden aria-hidden>
      <Icon size={size.icon[scale]} color={`$${tone}`} />
    </Frame>
  );
}
