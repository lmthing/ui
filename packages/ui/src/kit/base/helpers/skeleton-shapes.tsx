import { useWords, useKitStyle } from "../../provider";
import { XStack, YStack, styled } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { shifted } from "../text";
import { SkeletonContent, SkeletonText, skeletonInset, type ShapeProps } from "./skeleton-content";

export const Bar = styled(YStack, { backgroundColor: "$line", borderRadius: radius.sm });
export function columnHeights(points?: { value: number }[]) {
  const max = Math.max(...(points?.map((point) => point.value) ?? []), 0);
  const ratios = points?.map((point) => (max > 0 ? point.value / max : 0)) ?? [
    0.45, 0.7, 0.55, 0.9, 0.6, 0.35, 0.75,
  ];
  return ratios.map((ratio) => Math.max(component.base.barsHeight * ratio, space.xs));
}

function SkeletonColumns({ heights }: { heights: number[] }) {
  return (
    <XStack gap={space.xs} alignItems="flex-end">
      {heights.map((height, index) => (
        <YStack key={index} flex={1} alignItems="center" gap={space.xs}>
          <YStack
            height={component.base.barsHeight + typography.caption.lineHeight + space.xs}
            width="100%"
            justifyContent="flex-end"
            alignItems="center"
            gap={space.xs}
          >
            <YStack height={typography.caption.lineHeight} width="30%" justifyContent="center">
              <Bar height={space.sm} />
            </YStack>
            <Bar width="70%" height={height} />
          </YStack>
          <YStack height={typography.caption.lineHeight} width="55%" justifyContent="center">
            <Bar height={space.sm} />
          </YStack>
        </YStack>
      ))}
    </XStack>
  );
}

export function SkeletonBars({ rows = 7, title, inset, share, points }: ShapeProps) {
  const { loadingLabel } = useWords().words;
  const count = points?.length ?? rows;
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy gap={space.sm} padding={skeletonInset(inset)}>
      <XStack gap={space.md} paddingVertical={space.xs}>
        <YStack flex={1}>
          {title ? <SkeletonText text={title} role="heading" /> : <Bar height={space.md} width="45%" />}
        </YStack>
        <YStack flex={1} gap={space.xs}>
          <YStack height={typography.caption.lineHeight} justifyContent="center">
            <Bar height={space.sm} width="30%" alignSelf="flex-end" />
          </YStack>
          <YStack
            height={share ? typography.body.lineHeight : typography.number.lineHeight}
            justifyContent="center"
          >
            <Bar height={share ? space.md : typography.number.size * 0.6} width="55%" alignSelf="flex-end" />
          </YStack>
        </YStack>
      </XStack>
      {share ? (
        <YStack gap={space.md}>
          <Bar height={space.md} />
          {Array.from({ length: count }, (_, index) => (
            <XStack key={index} height={typography.body.lineHeight} alignItems="center" gap={space.sm}>
              <Bar width={component.base.dot} height={component.base.dot} />
              <Bar width="48%" height={space.md} />
              <YStack flex={1} />
              <Bar width="20%" height={space.md} />
            </XStack>
          ))}
        </YStack>
      ) : (
        <SkeletonColumns heights={columnHeights(points).slice(0, count)} />
      )}
    </YStack>
  );
}

export function SkeletonTrend() {
  const { loadingLabel } = useWords().words;
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

export function SkeletonRing({ ring = "md" }: ShapeProps) {
  const { loadingLabel } = useWords().words;
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

export function SkeletonMedia({ aspect = "wide", lines, inset, playback, contentGap = "sm" }: ShapeProps) {
  const { loadingLabel } = useWords().words;
  const ks = useKitStyle();
  return (
    <YStack
      accessibilityLabel={loadingLabel}
      aria-busy
      gap={lines?.length === 0 && !playback ? component.base.none : space[contentGap]}
      padding={skeletonInset(inset)}
    >
      {aspect !== "none" && (
        <Bar
          width={aspect === "avatar" ? size.avatar.lg : "100%"}
          alignSelf={aspect === "avatar" ? "center" : undefined}
          aspectRatio={
            aspect === "wide"
              ? component.base.wideRatio
              : aspect === "tall"
                ? component.base.tallRatio
                : component.base.bodyFlex
          }
          borderRadius={aspect === "avatar" ? radius.pill : shifted("lg", ks.radiusShift)}
        />
      )}
      {lines?.length === 0 ? null : lines ? (
        <SkeletonContent lines={lines} />
      ) : (
        <>
          <Bar height={space.md} width="56%" />
          <Bar height={space.sm + space.xs / 2} width="82%" />
          <Bar height={space.sm + space.xs / 2} width="34%" />
        </>
      )}
      {playback && (
        <>
          <YStack height={size.control.md} justifyContent="center" paddingHorizontal={size.icon.lg / 2}>
            <Bar height={space.xs + space.xs / 2} />
          </YStack>
          <XStack height={typography.caption.lineHeight} justifyContent="space-between" alignItems="center">
            <Bar width={size.control.md} height={space.sm} />
            <Bar width={size.control.md} height={space.sm} />
          </XStack>
          <XStack height={size.control.md} justifyContent="center" alignItems="center" gap={space.md}>
            {[0, 1, 2].map((index) => (
              <Bar
                key={index}
                width={size.control.md}
                height={size.control.md}
                borderRadius={index === 1 ? radius.pill : shifted("md", ks.radiusShift)}
              />
            ))}
          </XStack>
        </>
      )}
    </YStack>
  );
}
