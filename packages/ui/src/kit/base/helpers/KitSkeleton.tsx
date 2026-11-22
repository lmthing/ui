import { useWords, useKitStyle, useVariantDensity } from "../../provider";
import { XStack, YStack, styled } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { KitContent, KitText, shifted, surfaceOf, useTextStep } from "../text";
import {
  SkeletonContent,
  SkeletonText,
  skeletonInset,
  linesOf,
  type ShapeProps,
  type SkeletonItem,
} from "./skeleton-content";
import { Bar, SkeletonBars, SkeletonTrend, SkeletonRing, SkeletonMedia } from "./skeleton-shapes";

const Line = styled(YStack, { justifyContent: "center" });

// Fractions of the row width, varied so it reads as content, not as stripes.
const titles = ["72%", "58%", "66%", "50%", "62%", "54%"] as const;
const details = ["44%", "36%", "40%", "30%", "38%", "34%"] as const;

type SkeletonProps = ShapeProps & {
  rows?: number;
  lead?: "dot" | "box" | "time" | "none";
  /** rows: title and detail per row. pairs: a short label and a longer value. headline: one large line and a short one. */
  shape?:
    "rows" | "pairs" | "headline" | "media" | "ring" | "trend" | "bars" | "figure" | "options" | "control";
  /** `ring` only: the ring size, matching `KitRing scale`. */
  ring?: "md" | "lg";
  /** `rows` only: `none` drops the side inset (rows inside a padded card). */
  inset?: "md" | "none" | "card";
};

function SkeletonLead({
  lead,
  first,
  thumbnail = false,
}: {
  lead: "dot" | "box" | "time" | "none";
  first: number;
  thumbnail?: boolean;
}) {
  if (lead === "none") return null;
  const box = lead === "box";
  const time = lead === "time";
  const square = thumbnail ? size.avatar.md : size.icon.lg;
  return (
    <Line
      height={box && thumbnail ? size.avatar.md : first}
      {...(time ? { width: component.base.timeWidth } : {})}
      {...(box
        ? {
            width: thumbnail ? size.avatar.md : size.control.md,
            alignItems: "center",
            ...(thumbnail ? { alignSelf: "center" as const } : {}),
          }
        : {})}
    >
      <Bar
        width={time ? "58%" : box ? square : size.icon.md}
        height={time ? space.sm : box ? square : size.icon.md}
        borderRadius={lead === "dot" ? size.icon.md : radius.sm}
      />
    </Line>
  );
}
function SkeletonRows({ rows = 1, lead = "dot", shape, inset, items, density, emphasis }: SkeletonProps) {
  const { loadingLabel } = useWords().words;
  const spacing = useVariantDensity(density);
  const stepOf = useTextStep({ density, emphasis });
  const primary = typography[stepOf(shape === "headline" ? "display" : "body")];
  const first = primary.lineHeight;
  const bar = shape === "headline" ? primary.size * 0.7 : space.md;
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy padding={items ? component.base.none : space.xs}>
      {Array.from({ length: rows }, (_, index) => (
        <XStack
          key={index}
          alignItems="flex-start"
          minHeight={size.control.md}
          gap={space[spacing.gap]}
          paddingVertical={space[spacing.rowPad]}
          paddingHorizontal={skeletonInset(inset)}
        >
          <SkeletonLead
            lead={items?.[index]?.lead ?? lead}
            first={first}
            thumbnail={Boolean(items?.some((item) => item.photo))}
          />
          <YStack flex={1}>
            {items ? (
              linesOf(items[index]!).map((line, at) => (
                <SkeletonText key={at} {...{ density, emphasis }} {...line} />
              ))
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

function SkeletonFigure({ lines, centered, split, inset, lead = "none", density, emphasis }: ShapeProps) {
  const { loadingLabel } = useWords().words;
  const first = typography[useTextStep({ density, emphasis })("heading")].lineHeight;
  const aligned = lines?.map((line) => ({ ...line, align: centered ? ("center" as const) : line.align }));
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy padding={skeletonInset(inset)}>
      {split ? (
        <XStack gap={space.md} paddingVertical={space.xs}>
          <YStack flex={1}>
            <SkeletonText {...{ density, emphasis }} {...aligned![0]!} />
          </YStack>
          <YStack flex={1}>
            <SkeletonContent lines={aligned?.slice(1)} {...{ density, emphasis }} />
          </YStack>
        </XStack>
      ) : (
        <KitContent
          {...{ density, emphasis }}
          lead={lead === "none" ? undefined : <SkeletonLead lead={lead} first={first} thumbnail />}
        >
          {aligned?.map((line, index) => (
            <SkeletonText key={index} {...{ density, emphasis }} {...line} />
          ))}
        </KitContent>
      )}
    </YStack>
  );
}

function SkeletonOption({
  item,
  look,
  reserveIcon,
}: {
  item: SkeletonItem;
  look: "cards" | "list";
  reserveIcon: boolean;
}) {
  const ks = useKitStyle();
  return (
    <YStack
      minHeight={size.control.md}
      paddingVertical={space[ks.density.rowPad]}
      paddingHorizontal={space.md}
      borderRadius={shifted("md", ks.radiusShift)}
      {...(look === "cards" ? surfaceOf(ks.surface) : {})}
    >
      <XStack gap={space.md} alignItems="flex-start">
        {reserveIcon && (
          <YStack width={size.icon.lg} height={typography.body.lineHeight} justifyContent="center">
            {item.icon && <Bar width={size.icon.lg} height={size.icon.lg} />}
          </YStack>
        )}
        <YStack flex={1}>
          <SkeletonText text={item.title ?? ""} role="body" />
        </YStack>
        <XStack gap={space.sm} height={typography.body.lineHeight} alignItems="center">
          {item.value && <SkeletonText text={item.value} role="body" />}
          {(look === "list" || item.on) && (
            <Bar
              width={size.icon.md}
              height={size.icon.md}
              borderRadius={look === "list" ? radius.pill : radius.sm}
            />
          )}
        </XStack>
      </XStack>
      {(item.badge || item.sub) && (
        <YStack gap={space.xs} paddingLeft={reserveIcon ? component.base.optionLead : component.base.none}>
          {item.badge && <SkeletonText text={item.badge} role="caption" />}
          {item.sub && <SkeletonText text={item.sub} role="caption" />}
        </YStack>
      )}
    </YStack>
  );
}

function SkeletonOptions({ items = [], question, look = "cards" }: ShapeProps) {
  const { loadingLabel } = useWords().words;
  const reserveIcon = items.some((item) => item.icon !== undefined);
  return (
    <YStack accessibilityLabel={loadingLabel} aria-busy gap={space.sm}>
      {question && <SkeletonText text={question} role="heading" />}
      {items.map((item, index) => (
        <SkeletonOption key={index} item={item} look={look} reserveIcon={reserveIcon} />
      ))}
    </YStack>
  );
}

function SkeletonControl({ label, kind = "primary", full = false }: ShapeProps) {
  const { loadingLabel } = useWords().words;
  const ks = useKitStyle();
  return (
    <YStack
      accessibilityLabel={loadingLabel}
      aria-busy
      minHeight={size.control.md}
      minWidth={size.control.md}
      paddingHorizontal={label ? space.lg : space.xs}
      alignSelf={full ? "stretch" : "flex-start"}
      justifyContent="center"
      alignItems="center"
      backgroundColor="transparent"
      borderRadius={label ? shifted("md", ks.radiusShift) : radius.pill}
      {...(kind === "danger" ? { borderWidth: component.base.borderWidth, borderColor: "$line" } : {})}
    >
      {kind !== "quiet" && (
        <Bar
          position="absolute"
          top={component.base.none}
          bottom={component.base.none}
          left={component.base.none}
          right={component.base.none}
          borderRadius={label ? shifted("md", ks.radiusShift) : radius.pill}
          aria-hidden
        />
      )}
      {label && (
        <YStack position="relative" aria-hidden>
          <YStack opacity={component.base.none}>
            <KitText role="label" part={null}>
              {label}
            </KitText>
          </YStack>
          {kind === "quiet" && (
            <Bar
              position="absolute"
              width="100%"
              height={typography.label.size * 0.6}
              alignSelf="center"
              top={(typography.label.lineHeight - typography.label.size * 0.6) / 2}
            />
          )}
        </YStack>
      )}
      {!label && kind === "quiet" && <Bar width={size.icon.md} height={size.icon.md} />}
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
  control: SkeletonControl,
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
  const lines = content?.flatMap(([role, text, align, numberScale]) =>
    text ? [{ role, text, align, numberScale }] : [],
  );
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
