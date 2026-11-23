import { useSignatureProgress } from "../../motion";
import * as icons from "../../../entry/icons.generated";
import { YStack, styled } from "tamagui";
import { iconTable, motion, radius, size, type IconName } from "../../../catalog";
import { usePart } from "../../part";

const Frame = styled(YStack, { alignItems: "center", justifyContent: "center" });

export type IconTone = "accent" | "muted" | "text" | "onAccent" | "good" | "warn" | "bad";

export function KitIcon({
  name = "dot",
  part = "icon",
  tone = "muted",
  scale = "md",
  decorative = false,
  loading = false,
}: {
  name?: IconName | undefined;
  part?: string;
  tone?: IconTone;
  scale?: keyof typeof size.icon;
  /** Pure decoration (a chevron): no address, hidden from reading and acting. */
  decorative?: boolean;
  loading?: boolean;
}) {
  const addressed = !decorative && !loading;
  const address = usePart(part, addressed);
  const progress = useSignatureProgress("streak_flame");
  const Icon = icons[iconTable[name]];
  return (
    <Frame
      scale={name === "flame" ? 1 + motion.pulseScale * Math.sin(progress * Math.PI) : 1}
      {...(addressed ? address : {})}
      accessibilityElementsHidden
      aria-hidden
    >
      {loading ? (
        <YStack
          width={size.icon[scale]}
          height={size.icon[scale]}
          borderRadius={radius.pill}
          backgroundColor="$line"
        />
      ) : (
        <Icon size={size.icon[scale]} color={`$${tone}`} />
      )}
    </Frame>
  );
}
