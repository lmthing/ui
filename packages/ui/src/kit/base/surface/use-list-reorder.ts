import { useLayoutEffect, useRef } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { motionEase, motionProfiles } from "../../../catalog";
import { useKit } from "../../provider";
import { announceMotionSettled } from "../../part";

export function useListReorder(order: string) {
  const { environment, motion } = useKit();
  const { reduceMotion, agentMode } = environment;
  const ref = useRef<TamaguiElement>(null);
  const previous = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    if (!isWeb || !ref.current || agentMode) return;
    const root = ref.current as HTMLElement;
    const old = previous.current;
    const select = () => Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-list-motion]"));
    const rows = select();
    const measure = () => new Map(select().map((row) => [row.dataset.listMotion!, row.offsetTop]));
    const next = measure();
    const animations: Animation[] = [];
    let moved = false;
    for (const row of rows) {
      const key = row.dataset.listMotion!;
      const y = next.get(key)!;
      const from = old.get(key);
      if (from === undefined || from === y) continue;
      moved = true;
      if (!reduceMotion && row.animate) {
        animations.push(
          row.animate(rowFrames(from - y), {
            duration: motionProfiles[motion].navigation,
            easing: motionEase,
          }),
        );
      }
    }
    previous.current = next;
    // Exit height and expanding row content can move siblings without changing key order.
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => {
            previous.current = measure();
          });
    for (const row of rows) observer?.observe(row);
    observer?.observe(root);
    if (moved)
      void Promise.allSettled(animations.map((flight) => flight.finished)).then(() =>
        announceMotionSettled(root),
      );
    return () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
    };
  }, [order, motion, reduceMotion, agentMode]);
  return ref;
}

function rowFrames(delta: number): Keyframe[] {
  const first = { transform: `translateY(${delta}px)`, opacity: 1 };
  const last = { transform: "none", opacity: 1 };
  // The row moving down yields visually while it passes the row coming up.
  return delta > 0
    ? [first, last]
    : [
        first,
        { transform: `translateY(${delta * 0.8}px)`, opacity: 0, offset: 0.2 },
        { transform: `translateY(${delta * 0.2}px)`, opacity: 0, offset: 0.8 },
        last,
      ];
}
