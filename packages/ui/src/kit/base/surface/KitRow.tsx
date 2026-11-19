import { useContext, type ReactNode } from "react";
import { XStack, YStack, styled, useThemeName } from "tamagui";
import { component, size, space, type as typography } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { CardStyleContext, shifted, surfaceOf, tintOf, type SurfaceTone, type TextTone } from "../text";

const Frame = styled(XStack, { alignItems: "center", minHeight: size.control.md });
const Content = styled(XStack, { flex: component.base.bodyFlex, alignItems: "flex-start" });
const Body = styled(YStack, { flex: component.base.bodyFlex });
// Leading and trailing items centre on the title's first line, not on the middle of the text stack.
// Taller items (a 44px touch target) overflow the line equally above and below.
const Edge = styled(YStack, { alignSelf: "flex-start", justifyContent: "center", alignItems: "center" });
type LineRole = keyof typeof typography;
type RowProps = {
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  goto?: string | undefined;
  label: string;
  lineRole?: LineRole;
  role?: "listitem" | "text" | "button";
  /** A row that opens in place (role `button`): whether its content is shown. */
  expanded?: boolean;
  selected?: boolean;
  tone?: SurfaceTone | undefined;
  rowTone?: TextTone | undefined;
  /** `line`: centre the leading item on the first line (icons). `row`: centre it on the whole text (a thumbnail taller than a line). */
  leadingAlign?: "line" | "row";
  /** Reserve the same avatar-width leading column for every row in a mixed list. */
  leadingWidth?: "avatar" | undefined;
  /** An inset-free, tightly spaced row inside an already padded surface. */
  inline?: boolean;
  addressed?: boolean;
  part?: string | null;
  /** Horizontal inset: `md` (a row in a card) or `none` (a cell in a `KitGrid`, which spaces its own columns). */
  inset?: "md" | "none";
};

function rowTint(tone: TextTone | undefined) {
  if (!tone) return {};
  if (tone === "text" || tone === "muted") return { backgroundColor: "$raised" } as const;
  return {
    backgroundColor: tintOf(tone === "accent" || tone === "onAccent" ? "neutral" : tone).backgroundColor,
  };
}

function useRowSurface(tone: RowProps["tone"], rowTone: RowProps["rowTone"]) {
  const style = useContext(CardStyleContext);
  const { surface } = useKitStyle();
  return { ...(tone ? tintOf(tone) : style === "cards" ? surfaceOf(surface) : {}), ...rowTint(rowTone) };
}

function RowDecoration({ fade = false }: { fade?: boolean }) {
  const ks = useKitStyle();
  return (
    <YStack
      position="absolute"
      top={component.base.none}
      right={component.base.none}
      bottom={component.base.none}
      left={component.base.none}
      borderRadius={shifted("md", ks.radiusShift)}
      {...(fade
        ? { backgroundColor: "$raised", opacity: component.base.stackFade }
        : { borderWidth: component.base.strongBorder, borderColor: "$accent" })}
      pointerEvents="none"
      aria-hidden
    />
  );
}

function RowStatusRule({ tone }: { tone: "good" | "warn" | "bad" }) {
  return (
    <YStack
      position="absolute"
      left={space.xs}
      top={space.sm}
      bottom={space.sm}
      width={component.base.strongBorder}
      backgroundColor={tintOf(tone).borderColor}
      pointerEvents="none"
      aria-hidden
    />
  );
}

function useRowStatus(tone: TextTone | undefined, inset: boolean) {
  const dark = useThemeName().includes("dark");
  return dark && inset && (tone === "good" || tone === "warn" || tone === "bad") ? tone : null;
}

function useRowPress(address: string, part: RowProps["part"], goto: RowProps["goto"]) {
  const kit = useKit();
  if (part === null || !kit.interactive) return undefined;
  if (kit.controller) return () => kit.controller!.press(address);
  if (goto) return () => kit.onLink?.(goto, address);
}

export function Row({
  children,
  leading,
  trailing,
  goto,
  label,
  lineRole = "body",
  role,
  expanded,
  selected,
  tone,
  rowTone,
  leadingAlign = "line",
  leadingWidth,
  inline = false,
  addressed = true,
  part = "root",
  inset = "md",
}: RowProps) {
  const line = typography[lineRole].lineHeight;
  const ks = useKitStyle();
  const status = useRowStatus(rowTone, !inline && inset === "md");
  const address = usePart(part ?? "root", addressed && part !== null);
  return (
    <Frame
      {...(addressed && part !== null ? address : {})}
      {...useRowSurface(tone, rowTone ?? (selected ? "accent" : undefined))}
      paddingVertical={inline ? component.base.none : space[ks.density.rowPad]}
      paddingHorizontal={inline || inset === "none" ? component.base.none : space.md}
      borderRadius={shifted("md", ks.radiusShift)}
      accessibilityRole={goto ? "link" : (role ?? "listitem")}
      accessibilityLabel={label}
      aria-current={selected || undefined}
      aria-expanded={expanded}
      onPress={useRowPress(address.testID, part, goto)}
    >
      {status && <RowDecoration fade />}
      <Content
        gap={inline ? space.xs : space[ks.density.gap]}
        minHeight={inline ? line : Math.max(line, size.control.md - space[ks.density.rowPad] * 2)}
      >
        {leading && (
          <Edge
            {...(leadingAlign === "row" ? { alignSelf: "center" as const } : { height: line })}
            {...(leadingWidth === "avatar" ? { width: size.avatar.md } : {})}
          >
            {leading}
          </Edge>
        )}
        <Body>{children}</Body>
        {trailing && <RowTrailing line={line}>{trailing}</RowTrailing>}
      </Content>
      {status && <RowStatusRule tone={status} />}
      {selected && <RowDecoration />}
    </Frame>
  );
}

function RowTrailing({ line, children }: { line: number; children: ReactNode }) {
  return (
    <Edge height={line}>
      <XStack alignItems="center">{children}</XStack>
    </Edge>
  );
}

export function KitRow({
  item,
  tone,
  ...props
}: {
  item?: string;
  /** Named control; omit for the item root or pass null to leave the row unaddressed. */
  part?: string | null;
  label: string;
  children: ReactNode;
  role?: "listitem" | "text" | "button";
  expanded?: boolean;
  selected?: boolean;
  tone?: TextTone;
  leading?: ReactNode;
  trailing?: ReactNode;
  goto?: string | undefined;
  /** The text role of the first line (default body), so leading and trailing centre on it. */
  lineRole?: LineRole;
  leadingAlign?: "line" | "row";
  leadingWidth?: "avatar" | undefined;
  inline?: boolean;
  inset?: "md" | "none";
}) {
  const context = usePartContext();
  if (!item) return <Row addressed={props.part !== undefined} role="text" rowTone={tone} {...props} />;
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Row rowTone={tone} {...props} />
    </PartContext.Provider>
  );
}
