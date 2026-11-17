import { XStack, YStack, styled } from "tamagui";
import { loadingLabel, radius, size, space } from "../../../catalog";
import { useKitStyle } from "../../provider";

const Bar = styled(YStack, { backgroundColor: "$line", borderRadius: radius.sm });
const Dot = styled(YStack, {
  width: size.icon.lg,
  height: size.icon.lg,
  borderRadius: size.icon.lg,
  backgroundColor: "$line",
});

// Fractions of the row width, varied so it reads as content, not as stripes.
const titles = ["72%", "58%", "66%", "50%", "62%", "54%"] as const;
const details = ["44%", "36%", "40%", "30%", "38%", "34%"] as const;

/** Loading state: `rows` content-shaped placeholders (a dot, a title bar, a shorter detail bar). */
export function KitSkeleton({ rows = 1 }: { rows?: number }) {
  const ks = useKitStyle();
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy padding={space.xs}>
      {Array.from({ length: rows }, (_, index) => (
        <XStack key={index} alignItems="center" gap={space.md} padding={space[ks.density.rowPad]}>
          <Dot />
          <YStack flex={1} gap={space.sm}>
            <Bar height={space.md} width={titles[index % titles.length]} />
            <Bar height={space.sm + space.xs / 2} width={details[index % details.length]} />
          </YStack>
        </XStack>
      ))}
    </YStack>
  );
}
