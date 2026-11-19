import { useWords } from "../../provider";
import { YStack, styled } from "tamagui";
import { component, emptyLine, size, space, type IconName } from "../../../catalog";
import { KitIcon } from "../text";
import { KitText } from "../text";
import { usePartContext } from "../../part";

const Badge = styled(YStack, {
  width: size.avatar.md,
  height: size.avatar.md,
  borderRadius: size.avatar.md,
  backgroundColor: "$raised",
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
  tone = "neutral",
  decorativeIcon = false,
}: {
  icon?: IconName;
  part?: string;
  /** Standalone use: the text to show instead of the shared "No <things> yet" line. */
  title?: string;
  sub?: string;
  /** Fill the screen's height and centre vertically (the `Empty` component), instead of sitting in a card. */
  fill?: boolean;
  /** The badge colour: neutral by default, accent explicitly, or good for a success moment. */
  tone?: "neutral" | "accent" | "good";
  /** Draw the icon without an address (when the component declares no `icon` part). */
  decorativeIcon?: boolean;
}) {
  const { lang } = useWords();

  const { thing } = usePartContext();
  return (
    <YStack
      alignItems="center"
      gap={space.md}
      paddingVertical={space.xl}
      paddingHorizontal={space.lg}
      {...(fill ? { flex: 1, justifyContent: "center", minHeight: component.base.emptyMinHeight } : {})}
    >
      <Badge backgroundColor={tone === "good" ? "$goodSoft" : tone === "accent" ? "$accentSoft" : "$raised"}>
        <KitIcon
          name={icon}
          tone={tone === "neutral" ? "muted" : tone}
          scale="lg"
          part="icon"
          decorative={decorativeIcon}
        />
      </Badge>
      <YStack gap={space.xs} alignItems="center">
        <KitText role={title ? "heading" : "body"} tone={title ? "text" : "muted"} align="center" part={part}>
          {title ?? emptyLine(thing, lang)}
        </KitText>
        {sub && (
          <KitText role="body" tone="muted" align="center" part="sub">
            {sub}
          </KitText>
        )}
      </YStack>
    </YStack>
  );
}
