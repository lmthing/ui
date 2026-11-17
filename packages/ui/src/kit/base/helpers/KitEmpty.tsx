import { YStack, styled } from "tamagui";
import { emptyLine, size, space, type IconName } from "../../../catalog";
import { KitIcon } from "../KitIcon";
import { KitText } from "../KitText";
import { usePartContext } from "../../part";

const Badge = styled(YStack, {
  width: size.avatar.md,
  height: size.avatar.md,
  borderRadius: size.avatar.md,
  backgroundColor: "$accentSoft",
  alignItems: "center",
  justifyContent: "center",
});

/**
 * The empty state every component uses: a soft icon badge and one calm line ("No walks yet"),
 * centred with room around it. The line comes from shared copy and the thing type the host passes.
 */
export function KitEmpty({ icon = "sparkles", part = "title" }: { icon?: IconName; part?: string }) {
  const { thing } = usePartContext();
  return (
    <YStack alignItems="center" gap={space.md} paddingVertical={space.xl} paddingHorizontal={space.lg}>
      <Badge>
        <KitIcon name={icon} tone="accent" scale="lg" part="icon" />
      </Badge>
      <KitText role="body" tone="muted" align="center" part={part}>
        {emptyLine(thing)}
      </KitText>
    </YStack>
  );
}
