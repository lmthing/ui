import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { YStack } from "tamagui";
import { component, durations, motion, radius, signatures, space } from "../../catalog";
import { useKit } from "../provider";
import { animateNumber, easeOut } from "./animate";
import { isRecordArrival, receiptPose } from "./record-arrival";

/** Accent only the receiving record; its layout, text and live controls do not move. */
export function KitRecordArrival({
  receipt,
  children,
}: {
  receipt: Record<string, unknown>;
  children: ReactNode;
}) {
  const kit = useKit();
  const pose = receiptPose(receipt);
  const previous = useRef(pose);
  const [progress, setProgress] = useState(1);
  const { record, phase } = pose ?? {};
  const enabled =
    kit.environment.signature === "record_arrive" &&
    !kit.environment.reduceMotion &&
    !kit.environment.agentMode &&
    !kit.visualOnly;
  const duration = kit.motion === "lively" ? durations.slow : signatures.record_arrive.duration;
  useLayoutEffect(() => {
    const from = previous.current;
    const to = record === undefined ? undefined : { record, phase };
    previous.current = to;
    if (enabled && isRecordArrival(from, to))
      return animateNumber(0, 1, setProgress, { duration, easing: easeOut });
    setProgress(1);
  }, [record, phase, enabled, duration]);
  return (
    <YStack position="relative">
      {children}
      {enabled && phase === "received" && progress < 1 && (
        <YStack
          data-record-arrival=""
          position="absolute"
          left={0}
          top={space.lg}
          bottom={space.lg}
          width={component.base.borderWidth * 2}
          borderRadius={radius.pill}
          backgroundColor="$good"
          y={motion.arriveY * (1 - progress)}
          opacity={1 - progress}
          pointerEvents="none"
          aria-hidden
          accessibilityElementsHidden
        />
      )}
    </YStack>
  );
}
