import { useEffect, useRef, useState, type ReactNode } from "react";
import { YStack } from "tamagui";
import { durations, motion, springs } from "../../catalog";
import { useKit } from "../provider";
import { animateNumber } from "./animate";
import { useReveal } from "./use-motion";
type MotionProps = {
  children: ReactNode;
  index?: number;
  exiting?: boolean;
  cue?: string;
};

export function KitMotion({ children, index = 0, exiting = false, cue = "filled" }: MotionProps) {
  const { environment } = useKit();
  const measured = useRef<number | undefined>(undefined),
    cancel = useRef<(() => void) | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const progress = useReveal(`${cue}:${exiting}`, !environment.agentMode, {
    ...(environment.reduceMotion || exiting ? { duration: durations.fast } : { spring: springs.gentle }),
    delay: exiting ? 0 : Math.min(index, motion.staggerLimit - 1) * motion.stagger,
  });
  const opacity = exiting ? 1 - progress : progress;
  useEffect(() => () => cancel.current?.(), []);
  return (
    <YStack
      opacity={opacity}
      y={
        environment.reduceMotion || environment.agentMode ? 0 : exiting ? 0 : motion.arriveY * (1 - progress)
      }
      {...(exiting
        ? {
            height: (measured.current ?? 0) * (1 - progress),
            overflow: "hidden" as const,
            pointerEvents: "none" as const,
            "aria-hidden": true,
          }
        : height === undefined
          ? {}
          : { height, overflow: "hidden" as const })}
    >
      <YStack
        onLayout={(event) => {
          const next = event.nativeEvent.layout.height,
            previous = measured.current;
          measured.current = next;
          if (
            previous === undefined ||
            previous === next ||
            exiting ||
            environment.agentMode ||
            environment.reduceMotion
          )
            return;
          cancel.current?.();
          cancel.current = animateNumber(previous, next, setHeight, {
            spring: springs.snappy,
            done: () => setHeight(undefined),
          });
        }}
      >
        {children}
      </YStack>
    </YStack>
  );
}
