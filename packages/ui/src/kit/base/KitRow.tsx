import { useContext, type ReactNode } from "react";
import { XStack, YStack, styled } from "tamagui";
import { component, size, space, type as typography } from "../../catalog";
import { useKit, useKitStyle } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";
import { CardStyleContext, shifted, surfaceOf, tintOf, type SurfaceTone } from "./style";

const Frame = styled(XStack, { alignItems: "center", minHeight: size.control.md });
const Body = styled(YStack, { flex: component.base.bodyFlex });
// Leading and trailing items centre on the title's first line, not on the middle of the text stack.
// Taller items (a 44px touch target) overflow the line equally above and below.
const Edge = styled(YStack, { alignSelf: "flex-start", justifyContent: "center", alignItems: "center" });
type LineRole = "body" | "heading" | "title" | "display" | "number";
export function Row({
  children,
  leading,
  trailing,
  goto,
  label,
  lineRole = "body",
  role,
  tone,
  leadingAlign = "line",
  inset = "md",
}: {
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  goto?: string | undefined;
  label: string;
  lineRole?: LineRole;
  role?: "listitem" | "text";
  tone?: SurfaceTone | undefined;
  /** `line`: centre the leading item on the first line (icons). `row`: centre it on the whole text (a thumbnail taller than a line). */
  leadingAlign?: "line" | "row";
  /** Horizontal inset: `md` (a row in a card) or `none` (a cell in a `KitGrid`, which spaces its own columns). */
  inset?: "md" | "none";
}) {
  const line = typography[lineRole].lineHeight;
  const ks = useKitStyle(),
    kit = useKit(),
    style = useContext(CardStyleContext);
  const part = usePart();
  return (
    <Frame
      {...part}
      {...(tone ? tintOf(tone) : style === "cards" ? surfaceOf(ks.surface) : {})}
      paddingVertical={space[ks.density.rowPad]}
      paddingHorizontal={inset === "none" ? component.base.none : space.md}
      gap={space[ks.density.gap]}
      borderRadius={shifted("md", ks.radiusShift)}
      accessibilityRole={goto ? "link" : (role ?? "listitem")}
      accessibilityLabel={label}
      {...(kit.interactive && goto ? { onPress: () => kit.onLink?.(goto, part.testID) } : {})}
    >
      {leading &&
        (leadingAlign === "row" ? (
          <Edge alignSelf="center">{leading}</Edge>
        ) : (
          <Edge height={line}>{leading}</Edge>
        ))}
      <Body>{children}</Body>
      {trailing && <Edge height={line}>{trailing}</Edge>}
    </Frame>
  );
}
export function KitRow({
  item,
  ...props
}: {
  item: string;
  label: string;
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  goto?: string | undefined;
  /** The text role of the first line (default body), so leading and trailing centre on it. */
  lineRole?: LineRole;
  leadingAlign?: "line" | "row";
  inset?: "md" | "none";
}) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Row {...props} />
    </PartContext.Provider>
  );
}
