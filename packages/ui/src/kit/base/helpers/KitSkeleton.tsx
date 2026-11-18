import { XStack, YStack, styled } from "tamagui";
import { component, loadingLabel, radius, size, space, type as typography } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { KitContent } from "../text";
import { SkeletonContent, SkeletonText, skeletonInset, linesOf, type ShapeProps } from "./skeleton-content";
import { SkeletonOptions } from "./skeleton-options";

const Line = styled(YStack, { justifyContent: "center" });

// Fractions of the row width, varied so it reads as content, not as stripes.
const titles = ["72%", "58%", "66%", "50%", "62%", "54%"] as const;
const details = ["44%", "36%", "40%", "30%", "38%", "34%"] as const;

import { Bar, SkeletonBars, SkeletonTrend, SkeletonRing, SkeletonMedia } from "./skeleton-shapes";

type SkeletonProps = ShapeProps & {
  rows?: number;
  lead?: "dot" | "box" | "time" | "none";
  /** rows: title and detail per row. pairs: a short label and a longer value. headline: one large line and a short one. */
  shape?: "rows" | "pairs" | "headline" | "media" | "ring" | "trend" | "bars" | "figure" | "options";
  /** `ring` only: the ring size, matching `KitRing scale`. */
  ring?: "md" | "lg";
  /** `rows` only: `none` drops the side inset (rows inside a padded card). */
  inset?: "md" | "none" | "card";
};

function SkeletonLead({ lead, first }: { lead: "dot" | "box" | "time" | "none"; first: number }) {
  if (lead === "none") return null;
  const box = lead === "box";
  const time = lead === "time";
  return (
    <Line
      height={box ? size.avatar.md : first}
      {...(time ? { width: component.base.timeWidth } : {})}
      {...(box ? { width: size.avatar.md, alignSelf: "center", alignItems: "center" } : {})}
    >
      <Bar
        width={time ? "58%" : box ? size.avatar.md : size.icon.md}
        height={time ? space.sm : box ? size.avatar.md : size.icon.md}
        borderRadius={lead === "dot" ? size.icon.md : radius.sm}
      />
    </Line>
  );
}
function SkeletonRows({ rows = 1, lead = "dot", shape, inset, items }: SkeletonProps) {
  const ks = useKitStyle();
  const first = shape === "headline" ? typography.display.lineHeight : typography.body.lineHeight;
  const bar = shape === "headline" ? typography.display.size * 0.7 : space.md;
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy padding={items ? component.base.none : space.xs}>
      {Array.from({ length: rows }, (_, index) => (
        <XStack
          key={index}
          alignItems="flex-start"
          minHeight={size.control.md}
          gap={space[ks.density.gap]}
          paddingVertical={space[ks.density.rowPad]}
          paddingHorizontal={skeletonInset(inset)}
        >
          <SkeletonLead lead={items?.[index]?.lead ?? lead} first={first} />
          <YStack flex={1}>
            {items ? (
              linesOf(items[index]!).map((line, at) => <SkeletonText key={at} {...line} />)
            ) : (
              <>
                <Line height={first}>
                  <Bar height={bar} width={shape === "pairs" ? "30%" : titles[index % titles.length]} />
                </Line>
                <Line height={typography.caption.lineHeight}>
                  <Bar
                    height={space.sm + space.xs / 2}
                    width={shape === "pairs" ? "55%" : details[index % details.length]}
                  />
                </Line>
              </>
            )}
          </YStack>
          {((items?.[index]?.trail && items[index]?.trail !== "none") || items?.[index]?.done) && (
            <Line height={first}>
              <Bar
                width={typeof items?.[index]?.trail === "string" ? size.control.md : size.icon.md}
                height={space.sm}
              />
            </Line>
          )}
        </XStack>
      ))}
    </YStack>
  );
}

function SkeletonFigure({ lines, centered, split, inset, lead = "none" }: ShapeProps) {
  const aligned = lines?.map((line) => ({ ...line, align: centered ? ("center" as const) : line.align }));
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy padding={skeletonInset(inset)}>
      {split ? (
        <XStack gap={space.md} paddingVertical={space.xs}>
          <YStack flex={1}>
            <SkeletonText {...aligned![0]!} />
          </YStack>
          <YStack flex={1}>
            <SkeletonContent lines={aligned?.slice(1)} />
          </YStack>
        </XStack>
      ) : (
        <KitContent
          lead={
            lead === "none" ? undefined : <SkeletonLead lead={lead} first={typography.heading.lineHeight} />
          }
        >
          {aligned?.map((line, index) => (
            <SkeletonText key={index} {...line} />
          ))}
        </KitContent>
      )}
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
  figure: SkeletonFigure,
  options: SkeletonOptions,
};

/** Loading shapes retain each filled component's geometry and public props. */
export function KitSkeleton({
  rows = 1,
  shape = "rows",
  lead = shape === "figure" ? "none" : "dot",
  ring = "md",
  inset = shape === "bars" ? "none" : "md",
  content,
  ...props
}: SkeletonProps) {
  const Shape = shapes[shape];
  const lines = content?.flatMap(([role, text, align]) => (text ? [{ role, text, align }] : []));
  const items = props.items?.map((item) => ({
    ...item,
    lead: item.lead ?? (item.photo ? ("box" as const) : lead),
  }));
  return (
    <Shape
      rows={rows}
      lead={lead}
      shape={shape}
      ring={ring}
      inset={inset}
      {...props}
      {...(lines ? { lines } : {})}
      {...(items ? { items } : {})}
    />
  );
}
