import { useRef, useState, type ReactNode } from "react";
import { isWeb, YStack } from "tamagui";
import { motion, motionProfiles } from "../../catalog";
import { KitVisualOnly, useKit } from "../provider";
import { useReveal } from "./use-motion";
import { useChangeReveal } from "./use-change-reveal";
import { useMotionValue } from "./use-motion-value";
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
  appear = false,
}: MotionProps) {
  const { environment, motion: mode } = useKit();
  const still = environment.reduceMotion || environment.agentMode;
  const profile = motionProfiles[mode];
  const measured = useRef<number | undefined>(undefined);
  const [canArrive, setCanArrive] = useState(appear && cue === "filled" && !still);
  // A cue update, exit/re-entry or a preference change cannot re-arm this insertion.
  if (canArrive && (!appear || cue !== "filled" || exiting || still)) setCanArrive(false);
  const arrival = useReveal("insert", canArrive && !exiting && !still && index < motion.staggerLimit, {
    spring: profile.arrival,
    delay: index * motion.stagger,
  });
  const change = useChangeReveal(exiting ? undefined : cue);
  const exit = useMotionValue(exiting ? 0 : 1, still, "timed");
  const effect = motion.reducedFadeStart + (1 - motion.reducedFadeStart) * change;
  const size = exiting && measured.current !== undefined ? measured.current * exit : undefined;
  return (
    <YStack
      opacity={exiting ? exit * effect : Math.max(exit, motion.reducedFadeStart) * effect}
      y={still || exiting ? 0 : motion.arriveY * (1 - arrival)}
      {...(size === undefined ? {} : { height: size, overflow: "hidden" as const })}
      {...(exiting
        ? {
            pointerEvents: "none" as const,
            "aria-hidden": true,
            ...(isWeb
              ? { inert: true }
              : {
                  accessibilityElementsHidden: true,
                  importantForAccessibility: "no-hide-descendants" as const,
                }),
          }
        : {})}
    >
      {/* Keep live layout unconstrained. Local bases animate their own changed rows/marks. */}
      <YStack
        onLayout={({ nativeEvent }) => {
          if (!exiting) measured.current = nativeEvent.layout.height;
        }}
      >
        <KitVisualOnly active={exiting}>{children}</KitVisualOnly>
      </YStack>
    </YStack>
  );
}
