import { useWords } from "../../provider";
import { XStack, YStack, styled } from "tamagui";
import { component, emptyLine, size, space, type IconName, type ThemeDensity } from "../../../catalog";
import { KitIcon, KitText } from "../text";
import { usePartContext } from "../../part";

const Badge = styled(YStack, {
  width: size.avatar.md,
  height: size.avatar.md,
  borderRadius: size.avatar.md,
  backgroundColor: "$raised",
  alignItems: "center",
  justifyContent: "center",
});

type EmptyProps = {
  icon?: IconName;
  part?: string | null;
  /** Standalone use: the text to show instead of the shared "No <things> yet" line. */
  title?: string;
  /** Override the cast noun without writing a full sentence. */
  noun?: string;
  sub?: string;
  /** Fill the screen's height and centre vertically (the `Empty` component), instead of sitting in a card. */
  fill?: boolean;
  /** The badge colour: neutral by default, accent explicitly, or good for a success moment. */
  tone?: "neutral" | "accent" | "good" | "bad";
  /** Draw the icon without an address (when the component declares no `icon` part). */
  decorativeIcon?: boolean;
  /** Explicit copy need not imply a heading. Omit this to retain the legacy title treatment. */
  prominence?: "body" | "heading";
  density?: ThemeDensity | undefined;
  announce?: "alert" | "status";
  layout?: "stacked" | "inline";
};

function EmptyBadge({
  icon,
  tone,
  decorative,
}: {
  icon: IconName;
  tone: NonNullable<EmptyProps["tone"]>;
  decorative: boolean;
}) {
  return (
    <Badge backgroundColor={tone === "neutral" ? "$raised" : `$${tone}Soft`}>
      <KitIcon
        name={icon}
        tone={tone === "neutral" ? "muted" : tone}
        scale="lg"
        part="icon"
        decorative={decorative}
      />
    </Badge>
  );
}

/** A centred state message with a soft icon badge and copy from the shared dictionary or caller. */
export function KitEmpty({
  icon = "sparkles",
  part = "title",
  title,
  noun,
  sub,
  fill = false,
  tone = "neutral",
  decorativeIcon = false,
  prominence,
  density,
  announce,
  layout = "stacked",
}: EmptyProps) {
  const { lang } = useWords();
  const { thing, state } = usePartContext();
  const treatment = prominence ?? (title && (fill || state !== "empty") ? "heading" : "body");
  const textTone =
    tone === "bad" || (tone === "good" && prominence) ? tone : treatment === "body" ? "muted" : "text";
  const label = title ?? emptyLine(noun ?? thing, lang);
  if (layout === "inline")
    return (
      <XStack alignItems="center" gap={space.xs} accessibilityRole={announce}>
        <KitIcon name={icon} tone={tone === "neutral" ? "muted" : tone} decorative />
        <KitText role="body" tone={textTone} {...{ part, density }}>
          {label}
        </KitText>
      </XStack>
    );
  return (
    <YStack
      alignItems="center"
      gap={space.md}
      paddingVertical={space.xl}
      paddingHorizontal={space.lg}
      {...(fill ? { flex: 1, justifyContent: "center", minHeight: component.base.emptyMinHeight } : {})}
    >
      <EmptyBadge {...{ icon, tone }} decorative={decorativeIcon} />
      <YStack gap={space.xs} alignItems="center" accessibilityRole={announce}>
        <KitText role={treatment} tone={textTone} align="center" {...{ part, density }}>
          {label}
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
