import { useWords, useKit, useKitStyle } from "../../provider";
import { useSwipe, useControlValue } from "../../interact";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { XStack, YStack, isWeb, type TamaguiElement } from "tamagui";
import { component, formatAddress, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitLocalAction, KitText, shifted, surfaceOf } from "../text";

type Direction = "left" | "right";
type Card = { id: string; label: string; children: ReactNode };

function Front({
  label,
  children,
  move,
}: Pick<Card, "label" | "children"> & { move?: ((direction: Direction) => void) | undefined }) {
  const { swipeLabels, swipeCard } = useWords().words;
  const ks = useKitStyle();
  const address = usePart();
  const swipe = useSwipe("horizontal", Boolean(move), (direction) => {
    if (direction !== "down") move?.(direction);
  });
  return (
    <YStack
      {...address}
      {...(swipe.handlers as object)}
      x={swipe.offset}
      {...surfaceOf(ks.surface)}
      borderRadius={shifted("md", ks.radiusShift)}
      overflow="hidden"
      accessibilityRole="button"
      aria-roledescription={swipeCard}
      {...(move
        ? ({
            ...(isWeb ? { tabIndex: 0, "data-swipe-front": "" } : {}),
            onKeyDown: (event: KeyboardEvent) => {
              if (["ArrowLeft", "ArrowRight", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                if (!event.repeat) move(event.key === "ArrowLeft" ? "left" : "right");
              }
            },
          } as object)
        : {})}
      {...(!isWeb && move
        ? ({
            accessibilityActions: [
              { name: "swipe_left", label: swipeLabels.left },
              { name: "swipe_right", label: swipeLabels.right },
            ],
            onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) =>
              move(event.nativeEvent.actionName === "swipe_left" ? "left" : "right"),
          } as object)
        : {})}
      accessibilityLabel={label}
    >
      {children}
    </YStack>
  );
}

function StackBackdrop({ cards }: { cards: readonly Card[] }) {
  const ks = useKitStyle();
  const peek = component.base.stackPeek;
  return cards
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
        {...surfaceOf(ks.surface)}
        backgroundColor="$raised"
        opacity={1 - depth * component.base.stackFade}
        borderRadius={shifted("md", ks.radiusShift)}
        aria-hidden
        accessibilityElementsHidden
      />
    ));
}

function useSwipeFocus(cursor: number) {
  const { nativeHost } = useKit();
  const root = useRef<TamaguiElement>(null);
  const terminal = useRef<TamaguiElement>(null);
  const restore = useRef(false);
  const request = () => {
    restore.current =
      !isWeb || Boolean((root.current as HTMLElement | null)?.contains(document.activeElement));
  };
  const cancel = () => {
    restore.current = false;
  };
  useLayoutEffect(() => {
    if (!restore.current) return;
    restore.current = false;
    if (isWeb) {
      const end = terminal.current as HTMLElement | null;
      if (end) end.tabIndex = -1;
      const target =
        end ?? (root.current as HTMLElement | null)?.querySelector<HTMLElement>("[data-swipe-front]");
      target?.focus({ preventScroll: true });
    } else if (terminal.current) nativeHost?.focusAccessibility?.(terminal.current);
  }, [cursor, nativeHost]);
  return { root, terminal, request, cancel };
}

/**
 * A stack of cards: the first drawn fully on a card surface (the item `root`, the one that is swiped),
 * the next two peeking behind it, smaller and lower, hidden from reading. Each visible card's children
 * are scoped to its item id. Declare `swipe` on the item root with `when: { root: { $first: true } }`.
 */
export function KitSwipeStack({ cards, empty }: { cards: readonly Card[]; empty?: ReactNode }) {
  const context = usePartContext();
  const { interactive, controller } = useKit();
  const { swipeLabels, swipeComplete } = useWords().words;
  const cursor = useControlValue(`${context.screen}/${context.component}/$cursor`, 0);
  const visible = cards.slice(cursor);
  const behind = visible.slice(1, 3);
  const peek = component.base.stackPeek;
  const { root, terminal, request, cancel } = useSwipeFocus(cursor);
  const front = visible[0];
  if (!front || empty) {
    if (!cursor) return empty ?? null;
    return (
      <YStack
        ref={terminal}
        accessibilityRole="status"
        aria-live="polite"
        {...(isWeb ? { tabIndex: -1 } : {})}
      >
        <KitText role="label" part={null}>
          {swipeComplete}
        </KitText>
      </YStack>
    );
  }
  const address = formatAddress({ ...context, item: front.id, part: "root" });
  const move =
    interactive && controller
      ? (direction: Direction) => {
          request();
          if (!controller.act({ address, action: "swipe", value: direction }).ok) cancel();
        }
      : undefined;
  return (
    <YStack ref={root} gap={space.sm}>
      <YStack paddingBottom={behind.length * peek} paddingTop={space.xs}>
        <StackBackdrop cards={behind} />
        <PartContext.Provider value={{ ...context, item: front.id }}>
          <Front key={front.id} label={front.label} move={move}>
            {front.children}
          </Front>
        </PartContext.Provider>
      </YStack>
      {move && (
        <XStack gap={space.sm} justifyContent="space-between">
          <KitLocalAction label={swipeLabels.left} onPress={() => move("left")} />
          <KitLocalAction label={swipeLabels.right} onPress={() => move("right")} />
        </XStack>
      )}
    </YStack>
  );
}
