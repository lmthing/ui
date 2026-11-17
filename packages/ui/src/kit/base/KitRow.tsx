import { useContext, type ReactNode } from "react";
import { XStack, YStack, styled } from "tamagui";
import { component, size, space, type as typography } from "../../catalog";
import { useKit, useKitStyle } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";
import { CardStyleContext, shifted, surfaceOf } from "./style";

const Frame = styled(XStack, { alignItems: "center", minHeight: size.control.md });
const Body = styled(YStack, { flex: component.base.bodyFlex });
// Leading and trailing items centre on the title's first line, not on the middle of the text stack.
// Taller items (a 44px touch target) overflow the line equally above and below.
const Edge = styled(YStack, { alignSelf: "flex-start", justifyContent: "center", alignItems: "center" });
type LineRole = "body" | "heading" | "title" | "display";
function Row({
  children,
  leading,
  trailing,
  goto,
  label,
  lineRole = "body",
}: {
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  goto?: string | undefined;
  label: string;
  lineRole?: LineRole;
}) {
  const line = typography[lineRole].lineHeight;
  const ks = useKitStyle(),
    kit = useKit(),
    style = useContext(CardStyleContext);
  const part = usePart();
  return (
    <Frame
      {...part}
      {...(style === "cards" ? surfaceOf(ks.surface) : {})}
      paddingVertical={space[ks.density.rowPad]}
      paddingHorizontal={space.md}
      gap={space[ks.density.gap]}
      borderRadius={shifted("md", ks.radiusShift)}
      accessibilityRole={goto ? "link" : "listitem"}
      accessibilityLabel={label}
      {...(kit.interactive && goto ? { onPress: () => kit.onLink?.(goto, part.testID) } : {})}
    >
      {leading && <Edge height={line}>{leading}</Edge>}
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
}) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Row {...props} />
    </PartContext.Provider>
  );
}
