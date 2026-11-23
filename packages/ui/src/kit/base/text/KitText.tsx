import { Text, isWeb, styled, useTheme } from "tamagui";
import { Children, createContext, isValidElement, useContext, type ReactNode } from "react";
import { fontFamilies, motion, size, space, type as typography, variants } from "../../../catalog";
import { useSignatureProgress, countText } from "../../motion";
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
    align: {
      start: { textAlign: variants.align.start.text },
      center: { textAlign: variants.align.center.text },
      end: { textAlign: "right" },
    },
  } as const,
});

// Reserve space in the paragraph rather than extending a hit area across adjacent text.
const webLinkSlot = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: size.control.md,
  minWidth: size.control.md,
  maxWidth: "100%",
  overflowWrap: "anywhere",
} as const;

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
  /** Keep an unbroken name or code inside its available width. */
  breakLongWords?: boolean;
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

const LoadingRuns = createContext(false);
/** Table cells default to end alignment and tabular figures without changing text content. */
export const TableFigures = createContext(false);
const barCap = "radial-gradient(circle closest-side, var(--line), var(--line) 90%, transparent)";
const barFill = "linear-gradient(var(--line), var(--line))";
const barCapSize = `${space.sm}px ${space.sm}px`;
const barFillSize = `calc(100% - ${space.sm}px) ${space.sm}px`;
const bar = isWeb
  ? {
      backgroundImage: `${barCap}, ${barCap}, ${barFill}`,
      backgroundSize: `${barCapSize}, ${barCapSize}, ${barFillSize}`,
      backgroundPosition: "left center, right center, center",
      backgroundRepeat: "no-repeat",
    }
  : { backgroundColor: "$line" as const };
const options = ({ emphasis, item, goto }: TextProps) =>
  emphasis === "strong" || emphasis === "emphasis" || item !== undefined || goto !== undefined;

function hasOptions(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (node) =>
      isValidElement<TextProps>(node) &&
      ((node.type === KitText && options(node.props)) || hasOptions(node.props.children)),
  );
}

function useRunLoading(props: TextProps) {
  const inherited = useContext(LoadingRuns);
  return usePartContext().state === "loading" && (inherited || options(props) || hasOptions(props.children));
}

function maskRuns(children: ReactNode) {
  return (
    <LoadingRuns.Provider value>
      {Children.map(children, (run) =>
        isValidElement(run) ? (
          run
        ) : (
          <Frame {...(typeof run === "string" && /[\p{L}\p{N}]/u.test(run) ? bar : {})}>
            <Text opacity={0}>{run}</Text>
          </Frame>
        ),
      )}
    </LoadingRuns.Provider>
  );
}

function useRunTypography(role: TextRole, { density, emphasis }: TextProps, strong: boolean) {
  const finish = emphasis === "strong" || emphasis === "emphasis" ? "normal" : (emphasis ?? "normal");
  const stepOf = useTextStep({ density, emphasis: finish });
  const step = stepOf(role);
  const heavier = variants.emphasis[finish][strong ? "strong" : "regular"]?.[step];
  const weight =
    emphasis === "strong" && (!heavier || Number(heavier) < Number(typography.display.weight))
      ? typography.display.weight
      : heavier;
  return { step, weight, numberStep: stepOf("body") };
}

function useFigureTypography({ role, align, tabular }: TextProps) {
  const table = useContext(TableFigures);
  const figure = table && role === "number";
  return { align: align ?? (figure ? "end" : "start"), tabular: tabular ?? figure } as const;
}

function wrapProse({ role = "body", lines, children, breakLongWords }: TextProps) {
  if (!isWeb || lines || typeof children !== "string") return {};
  const pretty = role === "body";
  if (!pretty && !breakLongWords) return {};
  return {
    style: {
      ...(pretty && { textWrap: "pretty" }),
      ...(breakLongWords && { overflowWrap: "anywhere" }),
    } as never,
  };
}

function TextRun(props: TextProps) {
  const { children, role = "body", tone = "text", part = "root", lines } = props;
  const { numberScale = "display", strike = false, emphasis, goto } = props;
  const { align, tabular } = useFigureTypography(props);
  const style = useKitStyle();
  const theme = useTheme();
  // Some hosts omit Tamagui's root class; keep the local theme's foreground as a CSS fallback.
  const onAccent = isWeb && tone === "onAccent" && theme.onAccent?.val;
  const count = useSignatureProgress("count_up");
  const spin = useSignatureProgress("timer_spin");
  const state = usePartContext().state;
  const loading = useRunLoading(props);
  const nested = loading && Children.toArray(children).some(isValidElement);
  const linkSlot = Boolean(goto && part !== null && state !== "empty" && children);
  const linked = linkSlot && !loading;
  const target = useTextLink(part, linked ? goto : undefined, !loading);
  const { step, numberStep, weight } = useRunTypography(role, props, style.strong);
  const content = role === "number" && typeof children === "string" ? countText(children, count) : children;
  const webLink = linkSlot && isWeb;
  const text = (
    <Frame
      {...(!webLink ? target : {})}
      textRole={step}
      {...(part === "time" && spin < 1 ? { rotate: `${-motion.spinAngle * (1 - spin)}deg` } : {})}
      color={
        loading ? "transparent" : linked ? "$accent" : onAccent ? `var(--onAccent, ${onAccent})` : `$${tone}`
      }
      {...(loading && { "aria-hidden": true, ...(!nested && bar) })}
      align={align}
      fontFamily={fontOf(role, style.fonts)}
      {...(weight ? { fontWeight: weight } : {})}
      {...(emphasis === "emphasis" ? { fontStyle: "italic" as const } : {})}
      {...(lines ? { numberOfLines: lines } : {})}
      {...wrapProse(props)}
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
      {nested ? maskRuns(children) : loading && isWeb ? <Text opacity={0}>{content}</Text> : content}
    </Frame>
  );
  return webLink ? (
    <Text {...target} aria-hidden={loading || undefined} style={webLinkSlot as never}>
      {text}
    </Text>
  ) : (
    text
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
