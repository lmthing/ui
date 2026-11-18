import { useSignatureProgress } from "../motion";
import { motion } from "../../catalog";
import * as Lucide from "@tamagui/lucide-icons";
import { YStack, styled } from "tamagui";
import { iconTable, size, type IconName } from "../../catalog";
import { usePart } from "../part";

const Frame = styled(YStack, { alignItems: "center", justifyContent: "center" });

export type IconTone = "accent" | "muted" | "text" | "onAccent" | "good" | "warn" | "bad";

export function KitIcon({
  name = "dot",
  part = "icon",
  tone = "muted",
  scale = "md",
  decorative = false,
}: {
  name?: IconName | undefined;
  part?: string;
  tone?: IconTone;
  scale?: keyof typeof size.icon;
  /** Pure decoration (a chevron): no address, hidden from reading and acting. */
  decorative?: boolean;
}) {
  const address = usePart(part, !decorative);
  const progress = useSignatureProgress("streak_flame");
  const Icon = Lucide[iconTable[name]];
  return (
    <Frame
      scale={name === "flame" ? 1 + motion.pulseScale * Math.sin(progress * Math.PI) : 1}
      {...(decorative ? {} : address)}
      accessibilityElementsHidden
      aria-hidden
    >
      <Icon size={size.icon[scale]} color={`$${tone}`} />
    </Frame>
  );
}
