import { YStack, styled } from "tamagui";
import { component, emptyLine, size, space, type IconName } from "../../../catalog";
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
export function KitEmpty({
  icon = "sparkles",
  part = "title",
  title,
  sub,
  fill = false,
  tone = "accent",
}: {
  icon?: IconName;
  part?: string;
  /** Standalone use: the text to show instead of the shared "No <things> yet" line. */
  title?: string;
  sub?: string;
  /** Fill the screen's height and centre vertically (the `Empty` component), instead of sitting in a card. */
  fill?: boolean;
  /** The badge colour: `accent` (default, calm) or `good` (a success moment). */
  tone?: "accent" | "good";
}) {
  const { thing } = usePartContext();
  return (
    <YStack
      alignItems="center"
      gap={space.md}
      paddingVertical={space.xl}
      paddingHorizontal={space.lg}
      {...(fill ? { flex: 1, justifyContent: "center", minHeight: component.base.emptyMinHeight } : {})}
    >
      <Badge backgroundColor={tone === "good" ? "$goodSoft" : "$accentSoft"}>
        <KitIcon name={icon} tone={tone} scale="lg" part="icon" />
      </Badge>
      <KitText role={title ? "heading" : "body"} tone={title ? "text" : "muted"} align="center" part={part}>
        {title ?? emptyLine(thing)}
      </KitText>
      {sub && (
        <KitText role="body" tone="muted" align="center" part="sub">
          {sub}
        </KitText>
      )}
    </YStack>
  );
}
