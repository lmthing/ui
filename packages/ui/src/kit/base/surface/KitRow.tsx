import { useContext, type ReactNode } from "react";
import { XStack, YStack, styled } from "tamagui";
import { component, size, space, type as typography } from "../../../catalog";
import { useKit, useKitStyle } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { CardStyleContext, shifted, surfaceOf, tintOf, type SurfaceTone } from "../text";

const Frame = styled(XStack, { alignItems: "center", minHeight: size.control.md });
const Content = styled(XStack, { flex: component.base.bodyFlex, alignItems: "flex-start" });
const Body = styled(YStack, { flex: component.base.bodyFlex });
// Leading and trailing items centre on the title's first line, not on the middle of the text stack.
// Taller items (a 44px touch target) overflow the line equally above and below.
const Edge = styled(XStack, { alignSelf: "flex-start", justifyContent: "center", alignItems: "center" });
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
  tone?: SurfaceTone | undefined;
  /** `line`: centre the leading item on the first line (icons). `row`: centre it on the whole text (a thumbnail taller than a line). */
  leadingAlign?: "line" | "row";
  /** Reserve the same avatar-width leading column for every row in a mixed list. */
  leadingWidth?: "avatar" | undefined;
  /** An inset-free, tightly spaced row inside an already padded surface. */
  inline?: boolean;
  /** Horizontal inset: `md` (a row in a card) or `none` (a cell in a `KitGrid`, which spaces its own columns). */
  inset?: "md" | "none";
};

export function Row({
  children,
  leading,
  trailing,
  goto,
  label,
  lineRole = "body",
  role,
  expanded,
  tone,
  leadingAlign = "line",
  leadingWidth,
  inline = false,
  inset = "md",
}: RowProps) {
  const line = typography[lineRole].lineHeight;
  const ks = useKitStyle(),
    kit = useKit(),
    style = useContext(CardStyleContext);
  const part = usePart();
  return (
    <Frame
      {...part}
      {...(tone ? tintOf(tone) : style === "cards" ? surfaceOf(ks.surface) : {})}
      paddingVertical={inline ? component.base.none : space[ks.density.rowPad]}
      paddingHorizontal={inline || inset === "none" ? component.base.none : space.md}
      borderRadius={shifted("md", ks.radiusShift)}
      accessibilityRole={goto ? "link" : (role ?? "listitem")}
      accessibilityLabel={label}
      {...(expanded === undefined ? {} : { "aria-expanded": expanded })}
      {...(kit.interactive && kit.controller
        ? { onPress: () => kit.controller!.press(part.testID) }
        : kit.interactive && goto
          ? { onPress: () => kit.onLink?.(goto, part.testID) }
          : {})}
    >
      <Content gap={inline ? space.xs : space[ks.density.gap]}>
        {leading && (
          <Edge
            {...(leadingAlign === "row" ? { alignSelf: "center" as const } : { height: line })}
            {...(leadingWidth === "avatar" ? { width: size.avatar.md } : {})}
          >
            {leading}
          </Edge>
        )}
        <Body>{children}</Body>
        {trailing && <Edge height={line}>{trailing}</Edge>}
      </Content>
    </Frame>
  );
}
export function KitRow({
  item,
  ...props
}: {
  item?: string;
  label: string;
  children: ReactNode;
  role?: "listitem" | "text" | "button";
  expanded?: boolean;
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
  if (!item) return <Row role="text" {...props} />;
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Row {...props} />
    </PartContext.Provider>
  );
}
