import { useContext, type ReactNode } from "react";
import { XStack, YStack, styled } from "tamagui";
import { component, size, space, type as typography } from "../../catalog";
import { useKit, useKitStyle } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";
import { CardStyleContext, shifted, surfaceOf } from "./style";

const Frame = styled(XStack, { alignItems: "center", minHeight: size.control.md });
const Body = styled(YStack, { flex: component.base.bodyFlex });
// Leading icons and photos sit on the title's first line, not the middle of the text stack.
const Lead = styled(YStack, {
  alignSelf: "flex-start",
  minHeight: typography.body.lineHeight,
  justifyContent: "center",
});
function Row({
  children,
  leading,
  trailing,
  goto,
  label,
}: {
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  goto?: string | undefined;
  label: string;
}) {
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
      {leading && <Lead>{leading}</Lead>}
      <Body>{children}</Body>
      {trailing}
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
}) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Row {...props} />
    </PartContext.Provider>
  );
}
