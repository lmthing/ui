import { useLayoutEffect, useRef } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { durations, motion as tokens, motionEase, motionProfiles, type ThemeMotion } from "../../../catalog";
import { useKit } from "../../provider";
import { announceMotionSettled } from "../../part";

export function useListReorder(order: string) {
  const { environment, motion } = useKit();
  const { reduceMotion, agentMode } = environment;
  const ref = useRef<TamaguiElement>(null);
  const previous = useRef(new Map<string, number>());
  const last = useRef(order);
  useLayoutEffect(() => {
    if (!isWeb || !ref.current) return;
    const root = ref.current as HTMLElement;
    const old = previous.current;
    const select = () => Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-list-motion]"));
    const measure = () => new Map(select().map((row) => [row, row.offsetTop]));
    const save = (positions: Map<HTMLElement, number>) => {
      previous.current = new Map(Array.from(positions, ([row, top]) => [row.dataset.listMotion!, top]));
    };
    const changed = last.current !== order;
    const next = changed || typeof ResizeObserver === "undefined" ? measure() : undefined;
    const animations = next && changed && !agentMode ? playRows(old, next, motion, reduceMotion) : [];
    last.current = order;
    if (next) save(next);
    // An exit can leave after its key changed. Keep the measured baseline current when it does.
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => {
            save(measure());
          });
    observer?.observe(root);
    if (animations.length && !reduceMotion)
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

function playRows(
  before: Map<string, number>,
  after: Map<HTMLElement, number>,
  mode: ThemeMotion,
  reduced: boolean,
) {
  const profile = motionProfiles[mode];
  const animations: Animation[] = [];
  for (const [row, top] of after) {
    if (!row.animate) continue;
    const from = before.get(row.dataset.listMotion!);
    if (row.hasAttribute("data-list-exiting")) {
      animations.push(
        row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: durations.fast, fill: "forwards" }),
      );
    } else if (from === undefined) {
      animations.push(
        row.animate(
          [
            { opacity: 0, transform: reduced ? "none" : `translateY(${tokens.arriveY}px)` },
            { opacity: 1, transform: "none" },
          ],
          { duration: reduced ? durations.fast : profile.feedback, easing: motionEase },
        ),
      );
    } else if (from !== top && !reduced) {
      animations.push(
        row.animate(rowFrames(from - top), { duration: profile.navigation, easing: motionEase }),
      );
    }
  }
  return animations;
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
