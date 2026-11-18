import { XStack, YStack, styled } from "tamagui";
import { component, loadingLabel, radius, space } from "../../../catalog";

export const Bar = styled(YStack, { backgroundColor: "$line", borderRadius: radius.sm });
export type ShapeProps = { rows: number; ring: "md" | "lg" };

export function SkeletonBars({ rows }: ShapeProps) {
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

export function SkeletonTrend() {
  return (
    <XStack accessibilityLabel={loadingLabel} aria-busy alignItems="center" gap={space.md} padding={space.md}>
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

export function SkeletonRing({ ring }: ShapeProps) {
  const box = ring === "lg" ? component.base.ringLg : component.base.ringMd;
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy alignItems="center" gap={space.sm} padding={space.md}>
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

export function SkeletonMedia() {
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy gap={space.sm} padding={space.md}>
      <Bar width="100%" aspectRatio={component.base.wideRatio} borderRadius={radius.lg} />
      <Bar height={space.md} width="56%" />
      <Bar height={space.sm + space.xs / 2} width="82%" />
      <Bar height={space.sm + space.xs / 2} width="34%" />
    </YStack>
  );
}
