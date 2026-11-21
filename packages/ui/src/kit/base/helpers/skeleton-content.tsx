import { YStack } from "tamagui";
import { component, radius, space, type as typography } from "../../../catalog";
import { KitContent, KitText, useTextStep, type TextFinish, type TextRole } from "../text";

export type SkeletonLine = {
  text: string;
  role: TextRole;
  align?: "start" | "center" | "end" | undefined;
  numberScale?: "display" | "compact" | undefined;
  lines?: number | undefined;
  strong?: boolean | undefined;
  tabular?: boolean | undefined;
  baseline?: boolean;
} & TextFinish;
export type SkeletonItem = {
  lines?: SkeletonLine[];
  title?: string;
  value?: string | undefined;
  badge?: string | undefined;
  sub?: string | undefined;
  meta?: string | undefined;
  photo?: string | undefined;
  icon?: string | undefined;
  done?: boolean;
  lead?: "dot" | "box" | "time" | "none";
  trail?: boolean | string | undefined;
  on?: boolean | undefined;
};
export type ShapeProps = {
  rows?: number;
  lead?: "dot" | "box" | "time" | "none";
  title?: string;
  share?: boolean;
  points?: { value: number }[];
  ring?: "md" | "lg";
  inset?: "md" | "none" | "card";
  aspect?: "auto" | "wide" | "square" | "tall" | "none" | "avatar";
  contentGap?: "xs" | "sm";
  lines?: SkeletonLine[] | undefined;
  content?: [TextRole, string | undefined, ("start" | "center" | "end")?, ("display" | "compact")?][];
  kind?: "primary" | "secondary" | "quiet" | "danger";
  label?: string | undefined;
  full?: boolean;
  items?: SkeletonItem[];
  question?: string | undefined;
  look?: "cards" | "list";
  playback?: boolean;
  centered?: boolean;
  split?: boolean;
} & TextFinish;

export function linesOf(item: SkeletonItem, heading = false): SkeletonLine[] {
  return (
    item.lines ?? [
      ...(item.title ? [{ text: item.title, role: heading ? ("heading" as const) : ("body" as const) }] : []),
      ...(item.sub ? [{ text: item.sub, role: "body" as const }] : []),
      ...(item.meta ? [{ text: item.meta, role: "caption" as const }] : []),
    ]
  );
}

/** Hidden text reserves the real wrapping height; clipped bars occupy each line. */
export function SkeletonText({
  text,
  role,
  align = "start",
  numberScale = "display",
  density,
  emphasis,
  lines,
  strong,
  tabular,
  baseline,
}: SkeletonLine) {
  const stepOf = useTextStep({ density, emphasis });
  const scale = typography[stepOf(role === "number" && numberScale === "compact" ? "body" : role)];
  const line = scale.lineHeight;
  const height = scale.size * 0.6;
  return (
    <YStack
      position="relative"
      overflow="hidden"
      maxWidth="100%"
      flexShrink={0}
      alignSelf={
        baseline ? undefined : align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start"
      }
      aria-hidden
    >
      <YStack opacity={component.base.none}>
        <KitText
          role={role}
          numberScale={numberScale}
          {...{ density, emphasis }}
          {...(strong ? { emphasis: "strong" as const } : {})}
          {...(tabular ? { tabular } : {})}
          align={align}
          part={null}
          {...(lines !== undefined || /^\d+(?:[.,:]\d+)*(?:\s+\S+)?$/.test(text)
            ? { lines: lines ?? 1 }
            : {})}
        >
          {text}
        </KitText>
      </YStack>
      {Array.from({ length: 8 }, (_, index) => (
        <YStack
          key={index}
          position="absolute"
          top={index * line + (line - height) / 2}
          height={height}
          width={index % 2 ? "82%" : "100%"}
          alignSelf={align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start"}
          backgroundColor="$line"
          borderRadius={radius.sm}
        />
      ))}
    </YStack>
  );
}

export function SkeletonContent({ lines = [], density, emphasis }: Pick<ShapeProps, "lines"> & TextFinish) {
  return (
    <KitContent {...{ density, emphasis }}>
      {lines.map((line, index) => (
        <SkeletonText key={index} {...{ density, emphasis }} {...line} />
      ))}
    </KitContent>
  );
}

export const skeletonInset = (inset: ShapeProps["inset"]) =>
  inset === "none" ? component.base.none : inset === "card" ? space.md - space.xs : space.md;
