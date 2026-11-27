import { useEffect, useRef, useState, type ReactNode } from "react";
import { isWeb, YStack } from "tamagui";
import { durations, motion, motionProfiles, springs } from "../../catalog";
import { useKit } from "../provider";
import { animateNumber } from "./animate";
import { useReveal } from "./use-motion";
type MotionProps = {
  children: ReactNode;
  index?: number;
  exiting?: boolean;
  cue?: string;
  appear?: boolean;
};

export function KitMotion({
  children,
  index = 0,
  exiting = false,
  cue = "filled",
  appear = true,
}: MotionProps) {
  const { environment, motion: mode } = useKit();
  const [last, setLast] = useState({ cue, changed: false });
  if (last.cue !== cue) setLast({ cue, changed: true });
  const stateChange = last.changed || last.cue !== cue;
  const error = cue === "error";
  const loading = cue === "loading";
  const profile = motionProfiles[mode];
  const { height, measured, onLayout } = useMotionHeight(
    exiting || environment.agentMode || environment.reduceMotion,
  );
  const progress = useReveal(
    `${cue}:${exiting}`,
    !environment.agentMode && (exiting || (!loading && (appear || stateChange))),
    {
      ...(environment.reduceMotion || exiting || stateChange || error
        ? { duration: error && !environment.reduceMotion && !exiting ? profile.navigation : durations.fast }
        : { spring: springs.gentle }),
      delay: exiting || stateChange || error ? 0 : Math.min(index, motion.staggerLimit - 1) * motion.stagger,
    },
  );
  const still = environment.reduceMotion || environment.agentMode;
  const shake = error && !exiting && !still;
  return (
    <YStack
      opacity={exiting ? 1 - progress : shake ? 1 : progress}
      x={shake ? Math.sin(progress * motion.errorTurns * Math.PI * 2) * (1 - progress) * profile.error : 0}
      y={still || exiting || stateChange || error ? 0 : motion.arriveY * (1 - progress)}
      {...(exiting
        ? {
            ...(environment.reduceMotion ? {} : { height: (measured.current ?? 0) * (1 - progress) }),
            overflow: "hidden" as const,
            pointerEvents: "none" as const,
            "aria-hidden": true,
            ...(isWeb ? { inert: true } : { accessibilityElementsHidden: true }),
          }
        : height === undefined
          ? {}
          : { height, overflow: "hidden" as const })}
    >
      <YStack onLayout={onLayout}>{children}</YStack>
    </YStack>
  );
}

function useMotionHeight(still: boolean) {
  const measured = useRef<number | undefined>(undefined);
  const animation = useRef<(() => void) | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (still) setHeight(undefined);
    return () => animation.current?.();
  }, [still]);
  const onLayout = ({ nativeEvent }: { nativeEvent: { layout: { height: number } } }) => {
    const next = nativeEvent.layout.height;
    const previous = measured.current;
    measured.current = next;
    if (still || previous === undefined || previous === next) return;
    animation.current?.();
    animation.current = animateNumber(height ?? previous, next, setHeight, {
      spring: springs.snappy,
      done: () => setHeight(undefined),
    });
  };
  return { height: still ? undefined : height, measured, onLayout };
}
