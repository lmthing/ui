import { useRef, type ReactNode, type RefObject } from "react";
import { ScrollView, XStack, isWeb, type TamaguiElement } from "tamagui";
import { component } from "../../../catalog";
import { useKit } from "../../provider";
import { useAddressedJump } from "../../interact";
import { matrixKey } from "./matrix-layout";

type MatrixJump = { part: string; offset: number; anchor: RefObject<TamaguiElement | null> };
type ScrollNode = {
  getScrollableNode?: () => HTMLElement;
  scrollTo?: (options: { x: number; y: number; animated: boolean }) => void;
};

function JumpEffect({ jump, scroll }: { jump: MatrixJump; scroll: RefObject<ScrollNode | null> }) {
  const kit = useKit();
  useAddressedJump(jump.part, () => {
    const anchor = jump.anchor.current;
    if (!anchor) return;
    scroll.current?.scrollTo?.({ x: jump.offset, y: 0, animated: false });
    if (isWeb) (anchor as HTMLElement).focus({ preventScroll: true });
    else {
      (anchor as { focus?: () => void }).focus?.();
      kit.nativeHost?.ensureVisible?.(anchor);
    }
  });
  return null;
}

export function MatrixScroll({
  children,
  loading = false,
  fitted,
  label,
  jump,
}: {
  children: ReactNode;
  loading?: boolean | undefined;
  fitted?: boolean | undefined;
  label: string;
  jump?: MatrixJump | undefined;
}) {
  const scroll = useRef<ScrollNode>(null);
  const kit = useKit();
  if (fitted) return <>{children}</>;
  return (
    <ScrollView
      ref={scroll as never}
      horizontal
      minWidth={component.base.none}
      showsHorizontalScrollIndicator
      contentContainerStyle={{ minWidth: "100%" }}
      {...({
        role: "region",
        tabIndex: loading ? -1 : 0,
        "aria-label": label,
        onKeyDown: matrixKey,
      } as object)}
      onFocus={(event: { target: unknown }) => {
        const node = scroll.current?.getScrollableNode?.();
        const target = event.target as HTMLElement;
        if (!node || !target.getBoundingClientRect) kit.nativeHost?.ensureVisible?.(event.target);
        else {
          const box = target.getBoundingClientRect(),
            view = node.getBoundingClientRect();
          node.scrollBy({
            left: box.right > view.right ? box.right - view.right : Math.min(0, box.left - view.left),
          });
        }
      }}
    >
      <XStack>
        {jump && <JumpEffect jump={jump} scroll={scroll} />}
        {children}
      </XStack>
    </ScrollView>
  );
}
