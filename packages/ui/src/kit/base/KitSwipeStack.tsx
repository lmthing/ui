import type { ReactNode } from "react";
import { YStack } from "tamagui";
import { component, space } from "../../catalog";
import { useKitStyle } from "../provider";
import { PartContext, usePart, usePartContext } from "../part";
import { shifted, surfaceOf } from "./style";

function Front({ label, children }: { label: string; children: ReactNode }) {
  const ks = useKitStyle();
  return (
    <YStack
      {...usePart()}
      {...surfaceOf(ks.surface === "hairline" ? "hairline" : "soft")}
      borderRadius={shifted("lg", ks.radiusShift)}
      overflow="hidden"
      accessibilityRole="button"
      aria-roledescription="swipe card"
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
  const behind = cards.slice(1, 3);
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
            borderRadius={shifted("lg", ks.radiusShift)}
            aria-hidden
            accessibilityElementsHidden
          />
        ))}
      {cards[0] && (
        <PartContext.Provider value={{ ...context, item: cards[0].id }}>
          <Front label={cards[0].label}>{cards[0].children}</Front>
        </PartContext.Provider>
      )}
    </YStack>
  );
}
