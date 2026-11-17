import { YStack } from "tamagui";
import { radius, space } from "../../catalog";
import { PartContext, usePart, usePartContext } from "../part";
import { KitText } from "./KitText";

function Bubble({ from, text, grouped }: { from: "me" | "them"; text: string; grouped: boolean }) {
  const me = from === "me";
  return (
    <YStack
      {...usePart()}
      alignSelf={me ? "flex-end" : "flex-start"}
      maxWidth="80%"
      marginTop={grouped ? space.xs : space.sm}
      paddingVertical={space.sm}
      paddingHorizontal={space.md}
      borderRadius={radius.lg}
      {...(me ? { borderBottomRightRadius: radius.sm } : { borderBottomLeftRadius: radius.sm })}
      backgroundColor={me ? "$accent" : "$raised"}
      accessibilityRole="text"
    >
      <KitText role="body" tone={me ? "onAccent" : "text"} part="text">
        {text}
      </KitText>
    </YStack>
  );
}

/**
 * One chat message: `me` on the right on an accent bubble, `them` on the left on a raised one, at most
 * 80% wide and wrapping. `grouped` (the same side as the message before) sits closer to it. One item.
 */
export function KitBubble({
  item,
  grouped = false,
  ...props
}: {
  item: string;
  from: "me" | "them";
  text: string;
  grouped?: boolean;
}) {
  const context = usePartContext();
  return (
    <PartContext.Provider value={{ ...context, item }}>
      <Bubble {...props} grouped={grouped} />
    </PartContext.Provider>
  );
}
