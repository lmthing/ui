import { Text, styled } from "tamagui";
import type { ReactNode } from "react";
import { fontFamilies, type as typography } from "../../catalog";
import { useKitStyle } from "../provider";
import { usePart } from "../part";

const roleOf = (role: keyof typeof typography) => ({
  fontSize: typography[role].size,
  lineHeight: typography[role].lineHeight,
  fontWeight: typography[role].weight,
  letterSpacing: typography[role].tracking,
});

const Frame = styled(Text, {
  color: "$text",
  variants: {
    textRole: {
      display: roleOf("display"),
      title: roleOf("title"),
      heading: roleOf("heading"),
      body: roleOf("body"),
      label: roleOf("label"),
      caption: roleOf("caption"),
      number: roleOf("number"),
    },
    tone: {
      text: { color: "$text" },
      muted: { color: "$muted" },
      accent: { color: "$accent" },
      onAccent: { color: "$onAccent" },
      good: { color: "$good" },
      warn: { color: "$warn" },
      bad: { color: "$bad" },
    },
    align: { start: { textAlign: "left" }, center: { textAlign: "center" }, end: { textAlign: "right" } },
  } as const,
});

export type TextRole = keyof typeof typography;

// One step heavier for presets with strong type (bold).
const strongWeights: Record<TextRole, "500" | "600" | "700" | "800"> = {
  display: "800",
  title: "800",
  heading: "700",
  body: "500",
  label: "600",
  caption: "500",
  number: "800",
};
export type TextTone = "text" | "muted" | "accent" | "onAccent" | "good" | "warn" | "bad";

/** All visible text. Role picks the type scale and the preset's font family; tone picks a colour role. */
export function KitText({
  children,
  role = "body",
  tone = "text",
  align = "start",
  part = "root",
  lines,
  tabular = false,
}: {
  children: ReactNode;
  role?: TextRole;
  tone?: TextTone;
  align?: "start" | "center" | "end";
  /** The address part; `null` draws text that is not addressed (inside a decorative drawing). */
  part?: string | null;
  lines?: number;
  /** Equal-width digits, so times and amounts line up in a column. */
  tabular?: boolean;
}) {
  const style = useKitStyle();
  const address = usePart(part ?? "root");
  const heavier = style.strong ? strongWeights[role] : undefined;
  const family =
    role === "display" || role === "title" || role === "heading"
      ? style.fonts.heading
      : role === "number"
        ? style.fonts.number
        : style.fonts.text;
  return (
    <Frame
      {...(part === null ? {} : address)}
      textRole={role}
      tone={tone}
      align={align}
      fontFamily={fontFamilies[family]}
      {...(heavier ? { fontWeight: heavier } : {})}
      {...(lines ? { numberOfLines: lines } : {})}
      {...(tabular ? { fontVariant: ["tabular-nums"] as const } : {})}
    >
      {children}
    </Frame>
  );
}
