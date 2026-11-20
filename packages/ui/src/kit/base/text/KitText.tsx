import { useSignatureProgress, countText } from "../../motion";
import { motion } from "../../../catalog";
import { Text, isWeb, styled, useTheme } from "tamagui";
import type { ReactNode } from "react";
import { fontFamilies, space, type as typography, variants } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
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
  goto?: string | undefined;
  item?: string | undefined;
  emphasis?: TextFinish["emphasis"] | "strong" | "emphasis";
} & Omit<TextFinish, "emphasis">;

function useTextLink(part: TextProps["part"], goto: TextProps["goto"], enabled: boolean) {
  const kit = useKit();
  const address = usePart(part ?? "root", part !== null && enabled);
  const link = Boolean(goto && part !== null && enabled);
  const press = () => {
    if (goto) kit.onLink?.(goto, address.testID);
  };
  return {
    ...(part !== null && enabled ? address : {}),
    ...(link ? { accessibilityRole: "link" as const } : {}),
    ...(link && kit.interactive
      ? {
          focusable: true,
          cursor: "pointer" as const,
          onPress: (event: { stopPropagation?(): void }) => {
            event.stopPropagation?.();
            return press();
          },
          onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.stopPropagation();
            return press();
          },
        }
      : {}),
  };
}

function fontOf(role: TextRole, fonts: ReturnType<typeof useKitStyle>["fonts"]) {
  if (role === "display" || role === "title" || role === "heading") return fontFamilies[fonts.heading];
  return fontFamilies[role === "number" ? fonts.number : fonts.text];
}

const loadingText = {
  color: "transparent",
  "aria-hidden": true,
  ...(isWeb
    ? {
        backgroundImage: `linear-gradient(transparent calc(50% - ${space.xs}px), var(--line) calc(50% - ${space.xs}px) calc(50% + ${space.xs}px), transparent calc(50% + ${space.xs}px))`,
      }
    : { backgroundColor: "$line" }),
} as const;

function TextRun(props: TextProps) {
  const { children, role = "body", tone = "text", align = "start", part = "root", lines } = props;
  const { tabular = false, numberScale = "display", strike = false, emphasis, density, goto, item } = props;
  const style = useKitStyle();
  const theme = useTheme();
  // Some hosts omit Tamagui's root class; keep the local theme's foreground as a CSS fallback.
  const onAccent = isWeb && tone === "onAccent" && theme.onAccent?.val;
  const count = useSignatureProgress("count_up");
  const spin = useSignatureProgress("timer_spin");
  const state = usePartContext().state;
  const inline = emphasis === "strong" || emphasis === "emphasis";
  const loading = state === "loading" && (inline || item !== undefined || goto !== undefined);
  const linked = Boolean(goto && part !== null && state !== "empty" && !loading && children);
  const target = useTextLink(part, linked ? goto : undefined, !loading);
  const finish = inline ? "normal" : (emphasis ?? "normal");
  const stepOf = useTextStep({ density, emphasis: finish });
  const step = stepOf(role);
  const numberStep = stepOf("body");
  const heavier = variants.emphasis[finish][style.strong ? "strong" : "regular"]?.[step];
  const weight =
    emphasis === "strong" && (!heavier || Number(heavier) < Number(typography.display.weight))
      ? typography.display.weight
      : heavier;
  return (
    <Frame
      {...target}
      textRole={step}
      {...(part === "time" && spin < 1 ? { rotate: `${-motion.spinAngle * (1 - spin)}deg` } : {})}
      tone={linked ? "accent" : tone}
      {...(loading ? loadingText : onAccent && !linked ? { color: `var(--onAccent, ${onAccent})` } : {})}
      align={align}
      fontFamily={fontOf(role, style.fonts)}
      {...(weight ? { fontWeight: weight } : {})}
      {...(emphasis === "emphasis" ? { fontStyle: "italic" as const } : {})}
      {...(lines ? { numberOfLines: lines } : {})}
      {...(tabular ? { fontVariant: ["tabular-nums"] as const } : {})}
      {...(linked
        ? { textDecorationLine: "underline" as const }
        : strike && !loading
          ? { textDecorationLine: "line-through" as const }
          : {})}
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

/** All visible text, including nested inline runs and addressed screen links. */
export function KitText(props: TextProps) {
  const context = usePartContext();
  if (props.item === undefined) return <TextRun {...props} />;
  return (
    <PartContext.Provider value={{ ...context, item: props.item }}>
      <TextRun {...props} />
    </PartContext.Provider>
  );
}
