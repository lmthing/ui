import { DrawnCheck, useSignatureProgress } from "../../motion";
import * as icons from "../../../entry/icons.generated";
import { YStack, styled } from "tamagui";
import { iconTable, motion, radius, size, type IconName } from "../../../catalog";
import { usePart, usePartContext } from "../../part";

const Frame = styled(YStack, { alignItems: "center", justifyContent: "center" });

export type IconTone = "accent" | "muted" | "text" | "onAccent" | "good" | "warn" | "bad";

export function KitIcon({
  name = "dot",
  part = "icon",
  tone = "muted",
  scale = "md",
  decorative = false,
  hidden = false,
  loading = false,
}: {
  name?: IconName | undefined;
  part?: string;
  tone?: IconTone;
  scale?: keyof typeof size.icon;
  /** Pure decoration (a chevron): no address, hidden from reading and acting. */
  decorative?: boolean;
  /** Reserve the icon's footprint without drawing a pictogram. */
  hidden?: boolean;
  loading?: boolean;
}) {
  const addressed = !decorative && !loading && !hidden;
  const address = usePart(part, addressed);
  const progress = useSignatureProgress("streak_flame");
  const { state } = usePartContext();
  const Icon = icons[iconTable[name]];
  const complete = tone === "good" && (name === "check" || name === "circle_check");
  return (
    <Frame
      scale={name === "flame" ? 1 + motion.pulseScale * Math.sin(progress * Math.PI) : 1}
      {...(addressed ? address : {})}
      accessibilityElementsHidden
      aria-hidden
    >
      {hidden ? (
        <YStack width={size.icon[scale]} height={size.icon[scale]} />
      ) : loading ? (
        <YStack
          width={size.icon[scale]}
          height={size.icon[scale]}
          borderRadius={radius.pill}
          backgroundColor="$line"
        />
      ) : complete && state !== "loading" ? (
        <DrawnCheck size={size.icon[scale]} tone={tone} ring={name === "circle_check"} complete />
      ) : (
        <Icon size={size.icon[scale]} color={`$${tone}`} />
      )}
    </Frame>
  );
}
