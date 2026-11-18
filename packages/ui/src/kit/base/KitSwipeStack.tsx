import { useKit } from "../provider";
import { useSwipe } from "../interact/use-swipe";
import { useControlValue } from "../interact/use-control";
import { swipeLabels } from "../../catalog";
import type { ReactNode } from "react";
import { YStack } from "tamagui";
import { component, space } from "../../catalog";
import { useKitStyle } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";
import { shifted, surfaceOf } from "./style";

function Front({ label, children }: { label: string; children: ReactNode }) {
  const ks = useKitStyle();
  const kit = useKit();
  const address = usePart();
  const swipe = useSwipe("horizontal", Boolean(kit.interactive && kit.controller), (direction) => {
    if (direction !== "down")
      kit.controller?.act({ address: address.testID, action: "swipe", value: direction });
  });
  return (
    <YStack
      {...address}
      {...(swipe.handlers as object)}
      x={swipe.offset}
      {...surfaceOf(ks.surface === "hairline" ? "hairline" : "soft")}
      borderRadius={shifted("md", ks.radiusShift)}
      overflow="hidden"
      accessibilityRole="button"
      aria-roledescription="swipe card"
      {...(kit.interactive && kit.controller
        ? ({
            onKeyDown: (event: KeyboardEvent) => {
              if (["ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                kit.controller!.act({
                  address: address.testID,
                  action: "swipe",
                  value: event.key === "ArrowLeft" ? "left" : "right",
                });
              }
            },
            accessibilityActions: [
              { name: "swipe_left", label: swipeLabels.left },
              { name: "swipe_right", label: swipeLabels.right },
            ],
            onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) =>
              kit.controller!.act({
                address: address.testID,
                action: "swipe",
                value: event.nativeEvent.actionName === "swipe_left" ? "left" : "right",
              }),
          } as object)
        : {})}
      accessibilityLabel={label}
    >
      {children}
    </YStack>
  );
}

/**
 * A stack of cards: the first drawn fully on a card surface (the item `root`, the one that is swiped),
 * the next two peeking behind it, smaller and lower, hidden from reading. Each visible card's children
 * are scoped to its item id. Declare `swipe` on the item root with `when: { root: { $first: true } }`.
 */
export function KitSwipeStack({
  cards,
}: {
  cards: readonly { id: string; label: string; children: ReactNode }[];
}) {
  const context = usePartContext();
  const ks = useKitStyle();
  const cursor = useControlValue(`${context.screen}/${context.component}/$cursor`, 0);
  const visible = cards.slice(cursor);
  const behind = visible.slice(1, 3);
  const peek = component.base.stackPeek;
  return (
    <YStack paddingBottom={behind.length * peek} paddingTop={space.xs}>
      {behind
        .map((card, index) => ({ card, depth: index + 1 }))
        .reverse()
        .map(({ card, depth }) => (
          <YStack
            key={card.id}
            position="absolute"
            left={depth * peek}
            right={depth * peek}
            top={depth * peek + space.xs}
            bottom={0}
            {...surfaceOf(ks.surface === "hairline" ? "hairline" : "soft")}
            backgroundColor="$raised"
            opacity={1 - depth * component.base.stackFade}
            borderRadius={shifted("md", ks.radiusShift)}
            aria-hidden
            accessibilityElementsHidden
          />
        ))}
      {visible[0] && (
        <PartContext.Provider value={{ ...context, item: visible[0].id }}>
          <Front label={visible[0].label}>{visible[0].children}</Front>
        </PartContext.Provider>
      )}
    </YStack>
  );
}
