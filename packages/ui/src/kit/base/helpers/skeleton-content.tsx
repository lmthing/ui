import { YStack } from "tamagui";
import { component, radius, space, type as typography } from "../../../catalog";
import { KitContent, KitText, type TextRole } from "../text";

export type SkeletonLine = { text: string; role: TextRole; align?: "start" | "center" | "end" | undefined };
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
  aspect?: "wide" | "square" | "tall" | "none" | "avatar";
  lines?: SkeletonLine[] | undefined;
  content?: [TextRole, string | undefined, ("start" | "center" | "end")?][];
  items?: SkeletonItem[];
  question?: string | undefined;
  look?: "cards" | "list";
  playback?: boolean;
  centered?: boolean;
  split?: boolean;
};

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
export function SkeletonText({ text, role, align = "start" }: SkeletonLine) {
  const line = typography[role].lineHeight;
  const height = typography[role].size * 0.6;
  return (
    <YStack position="relative" overflow="hidden" aria-hidden>
      <YStack opacity={component.base.none}>
        <KitText role={role} align={align} part={null}>
          {text}
        </KitText>
      </YStack>
      {Array.from({ length: 8 }, (_, index) => (
        <YStack
          key={index}
          position="absolute"
          top={index * line + (line - height) / 2}
          height={height}
          width={
            role === "caption"
              ? "44%"
              : role === "label" || role === "number"
                ? "48%"
                : index % 2
                  ? "58%"
                  : "72%"
          }
          alignSelf={align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start"}
          backgroundColor="$line"
          borderRadius={radius.sm}
        />
      ))}
    </YStack>
  );
}

export function SkeletonContent({ lines = [] }: Pick<ShapeProps, "lines">) {
  return (
    <KitContent>
      {lines.map((line, index) => (
        <SkeletonText key={index} {...line} />
      ))}
    </KitContent>
  );
}

export const skeletonInset = (inset: ShapeProps["inset"]) =>
  inset === "none" ? component.base.none : inset === "card" ? space.md - space.xs : space.md;
