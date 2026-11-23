import { layoutType, type ThemeDensity } from "../../../catalog";
import { useComponentState } from "../../part";
import { SkeletonText } from "../helpers";
import { KitText, type TextTone } from "../text";

export type LayoutLine = {
  text?: string | undefined;
  part?: string | null;
  role?: keyof typeof layoutType;
  tone?: TextTone;
  lines?: number;
  strong?: boolean;
  breakLongWords?: boolean;
  compact?: boolean;
  tabular?: boolean;
};

/** One text slot with the same type settings for content and its loading placeholder. */
export function KitLayoutText({
  line,
  density,
  align = "start",
  baseline = false,
}: {
  line: LayoutLine;
  density?: ThemeDensity | undefined;
  align?: "start" | "center" | "end";
  baseline?: boolean;
}) {
  const loading = useComponentState() === "loading";
  const { text, part = null, role = "body", tone, lines, strong, compact, tabular, breakLongWords } = line;
  if (!text) return null;
  const style = {
    role: layoutType[role],
    density,
    align,
    numberScale: compact ? "compact" : "display",
  } as const;
  return loading ? (
    <SkeletonText text={text} {...style} {...{ lines, strong, tabular, baseline }} wrap />
  ) : (
    <KitText
      part={part}
      {...style}
      {...(tone ? { tone } : {})}
      {...(lines ? { lines } : {})}
      {...(strong ? { emphasis: "strong" as const } : {})}
      {...(breakLongWords && { breakLongWords })}
      {...(tabular ? { tabular } : {})}
    >
      {text}
    </KitText>
  );
}
