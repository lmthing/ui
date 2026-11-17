import { XStack, YStack, styled } from "tamagui";
import { loadingLabel, radius, size, space, type as typography } from "../../../catalog";
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
}: {
  rows?: number;
  lead?: "dot" | "box" | "none";
  /** rows: title and detail per row. pairs: a short label and a longer value. headline: one large line and a short one. */
  shape?: "rows" | "pairs" | "headline";
}) {
  const ks = useKitStyle();
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
          paddingHorizontal={space.md}
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
