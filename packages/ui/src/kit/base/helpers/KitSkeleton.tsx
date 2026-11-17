import { XStack, YStack, styled } from "tamagui";
import { component, loadingLabel, radius, size, space, type as typography } from "../../../catalog";
import { useKitStyle } from "../../provider";

const Bar = styled(YStack, { backgroundColor: "$line", borderRadius: radius.sm });
const Line = styled(YStack, { justifyContent: "center" });

// Fractions of the row width, varied so it reads as content, not as stripes.
const titles = ["72%", "58%", "66%", "50%", "62%", "54%"] as const;
const details = ["44%", "36%", "40%", "30%", "38%", "34%"] as const;

/**
 * Loading state: `rows` placeholders with the same geometry as a filled `KitRow` (same insets, gap,
 * first-line height, two text lines), so the card keeps its size when content arrives. `lead` is the
 * placeholder for the row's leading item: a round icon, a square tick box, or nothing.
 */
export function KitSkeleton({
  rows = 1,
  lead = "dot",
  shape = "rows",
  ring = "md",
  inset = "md",
}: {
  rows?: number;
  lead?: "dot" | "box" | "none";
  /** rows: title and detail per row. pairs: a short label and a longer value. headline: one large line and a short one. */
  shape?: "rows" | "pairs" | "headline" | "media" | "ring" | "trend" | "bars";
  /** `ring` only: the ring size, matching `KitRing scale`. */
  ring?: "md" | "lg";
  /** `rows` only: `none` drops the side inset (rows inside a padded card). */
  inset?: "md" | "none";
}) {
  const ks = useKitStyle();
  if (shape === "bars") {
    const heights = [0.45, 0.7, 0.55, 0.9, 0.6, 0.35, 0.75];
    return (
      <YStack accessibilityLabel={loadingLabel} aria-busy gap={space.md} padding={space.md}>
        <Bar height={space.md} width="45%" />
        <XStack gap={space.xs} height={component.base.barsHeight} alignItems="flex-end">
          {heights.slice(0, rows > 1 ? rows : 7).map((h, index) => (
            <YStack key={index} flex={1} alignItems="center">
              <Bar width="70%" height={component.base.barsHeight * h} />
            </YStack>
          ))}
        </XStack>
      </YStack>
    );
  }
  if (shape === "trend") {
    return (
      <XStack
        accessibilityLabel={loadingLabel}
        aria-busy
        alignItems="center"
        gap={space.md}
        padding={space.md}
      >
        <YStack flex={1} gap={space.sm}>
          <Bar height={space.sm + space.xs / 2} width="60%" />
          <Bar height={space.lg} width="45%" />
        </YStack>
        <YStack flex={1} height={component.base.sparkHeight} justifyContent="flex-end">
          <Bar height={space.sm} width="100%" />
        </YStack>
      </XStack>
    );
  }
  if (shape === "ring") {
    const box = ring === "lg" ? component.base.ringLg : component.base.ringMd;
    return (
      <YStack
        accessibilityLabel={loadingLabel}
        aria-busy
        alignItems="center"
        gap={space.sm}
        padding={space.md}
      >
        <YStack
          width={box}
          height={box}
          borderRadius={radius.pill}
          borderWidth={ring === "lg" ? space.md : space.sm + space.xs / 2}
          borderColor="$line"
        />
        <Bar height={space.md} width="40%" />
        <Bar height={space.sm + space.xs / 2} width="28%" />
      </YStack>
    );
  }
  if (shape === "media") {
    return (
      <YStack accessibilityLabel={loadingLabel} aria-busy gap={space.sm} padding={space.md}>
        <Bar width="100%" aspectRatio={component.base.wideRatio} borderRadius={radius.lg} />
        <Bar height={space.md} width="56%" />
        <Bar height={space.sm + space.xs / 2} width="82%" />
        <Bar height={space.sm + space.xs / 2} width="34%" />
      </YStack>
    );
  }
  const first = shape === "headline" ? typography.display.lineHeight : typography.body.lineHeight;
  const bar = shape === "headline" ? typography.display.size * 0.7 : space.md;
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy padding={space.xs}>
      {Array.from({ length: rows }, (_, index) => (
        <XStack
          key={index}
          alignItems="flex-start"
          minHeight={size.control.md}
          gap={space[ks.density.gap]}
          paddingVertical={space[ks.density.rowPad]}
          paddingHorizontal={inset === "none" ? 0 : space.md}
        >
          {lead !== "none" && (
            <Line height={first}>
              <Bar
                width={size.icon.md}
                height={size.icon.md}
                borderRadius={lead === "dot" ? size.icon.md : radius.sm}
              />
            </Line>
          )}
          <YStack flex={1}>
            <Line height={first}>
              <Bar height={bar} width={shape === "pairs" ? "30%" : titles[index % titles.length]} />
            </Line>
            <Line height={typography.caption.lineHeight}>
              <Bar
                height={space.sm + space.xs / 2}
                width={shape === "pairs" ? "55%" : details[index % details.length]}
              />
            </Line>
          </YStack>
        </XStack>
      ))}
    </YStack>
  );
}
