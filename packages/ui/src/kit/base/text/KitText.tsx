import { useSignatureProgress, countText } from "../../motion";
import { motion } from "../../../catalog";
import { Text, isWeb, styled, useTheme } from "tamagui";
import type { ReactNode } from "react";
import { fontFamilies, type as typography, variants } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { usePart } from "../../part";
import { useTextStep, type TextFinish, type TextRole } from "./text-step";

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
    align: {
      start: { textAlign: variants.align.start.text },
      center: { textAlign: variants.align.center.text },
      end: { textAlign: "right" },
    },
  } as const,
});

export type TextTone = "text" | "muted" | "accent" | "onAccent" | "good" | "warn" | "bad";

type TextProps = {
  children: ReactNode;
  role?: TextRole;
  tone?: TextTone;
  align?: "start" | "center" | "end";
  /** The address part; `null` draws text that is not addressed (inside a decorative drawing). */
  part?: string | null;
  lines?: number;
  /** Equal-width digits, so times and amounts line up in a column. */
  tabular?: boolean;
  /** `number` role only: `compact` keeps the number font and weight at body size (a list index). */
  numberScale?: "display" | "compact";
  /** Struck through: an old price. */
  strike?: boolean;
} & TextFinish;

/** All visible text. Role picks the type scale and the preset's font family; tone picks a colour role. */
export function KitText(props: TextProps) {
  const { children, role = "body", tone = "text", align = "start", part = "root", lines } = props;
  const { tabular = false, numberScale = "display", strike = false, emphasis = "normal", density } = props;
  const style = useKitStyle();
  const theme = useTheme();
  // Some hosts omit Tamagui's root class; keep the local theme's foreground as a CSS fallback.
  const onAccent = isWeb && tone === "onAccent" && theme.onAccent?.val;
  const count = useSignatureProgress("count_up");
  const spin = useSignatureProgress("timer_spin");
  const address = usePart(part ?? "root", part !== null);
  const stepOf = useTextStep({ density, emphasis });
  const step = stepOf(role);
  const numberStep = stepOf("body");
  const heavier = variants.emphasis[emphasis][style.strong ? "strong" : "regular"]?.[step];
  const family =
    role === "display" || role === "title" || role === "heading"
      ? style.fonts.heading
      : role === "number"
        ? style.fonts.number
        : style.fonts.text;
  return (
    <Frame
      {...(part === null ? {} : address)}
      textRole={step}
      {...(part === "time" && spin < 1 ? { rotate: `${-motion.spinAngle * (1 - spin)}deg` } : {})}
      tone={tone}
      {...(onAccent ? { color: `var(--onAccent, ${onAccent})` } : {})}
      align={align}
      fontFamily={fontFamilies[family]}
      {...(heavier ? { fontWeight: heavier } : {})}
      {...(lines ? { numberOfLines: lines } : {})}
      {...(tabular ? { fontVariant: ["tabular-nums"] as const } : {})}
      {...(strike ? { textDecorationLine: "line-through" as const } : {})}
      {...(role === "number" && numberScale === "compact"
        ? {
            fontSize: typography[numberStep].size,
            lineHeight: typography[numberStep].lineHeight,
            letterSpacing: typography.body.tracking,
          }
        : {})}
    >
      {role === "number" && typeof children === "string" ? countText(children, count) : children}
    </Frame>
  );
}
