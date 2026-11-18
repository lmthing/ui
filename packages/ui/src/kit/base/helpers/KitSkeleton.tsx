import { XStack, YStack, styled } from "tamagui";
import { component, loadingLabel, radius, size, space, type as typography } from "../../../catalog";
import { useKitStyle } from "../../provider";

const Line = styled(YStack, { justifyContent: "center" });

// Fractions of the row width, varied so it reads as content, not as stripes.
const titles = ["72%", "58%", "66%", "50%", "62%", "54%"] as const;
const details = ["44%", "36%", "40%", "30%", "38%", "34%"] as const;

import { Bar, SkeletonBars, SkeletonTrend, SkeletonRing, SkeletonMedia } from "./skeleton-shapes";

type SkeletonProps = {
  rows?: number;
  lead?: "dot" | "box" | "none";
  /** rows: title and detail per row. pairs: a short label and a longer value. headline: one large line and a short one. */
  shape?: "rows" | "pairs" | "headline" | "media" | "ring" | "trend" | "bars";
  /** `ring` only: the ring size, matching `KitRing scale`. */
  ring?: "md" | "lg";
  /** `rows` only: `none` drops the side inset (rows inside a padded card). */
  inset?: "md" | "none";
};

function SkeletonRows({ rows, lead, shape, inset }: Required<SkeletonProps>) {
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
          paddingHorizontal={inset === "none" ? component.base.none : space.md}
        >
          {lead !== "none" && (
            <Line
              height={first}
              {...(lead === "box" ? { width: size.control.md, alignItems: "center" } : {})}
            >
              <Bar
                width={lead === "box" ? size.icon.lg : size.icon.md}
                height={lead === "box" ? size.icon.lg : size.icon.md}
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

const shapes = {
  rows: SkeletonRows,
  pairs: SkeletonRows,
  headline: SkeletonRows,
  bars: SkeletonBars,
  trend: SkeletonTrend,
  ring: SkeletonRing,
  media: SkeletonMedia,
};

/** Loading shapes retain each filled component's geometry and public props. */
export function KitSkeleton({
  rows = 1,
  lead = "dot",
  shape = "rows",
  ring = "md",
  inset = "md",
}: SkeletonProps) {
  const Shape = shapes[shape];
  return <Shape rows={rows} lead={lead} shape={shape} ring={ring} inset={inset} />;
}
