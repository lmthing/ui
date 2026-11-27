import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { YStack } from "tamagui";
import { component, durations, motion, radius, signatures, space } from "../../catalog";
import { useKit } from "../provider";
import { usePartContext } from "../part";
import { animateNumber, easeOut } from "./animate";
import { isRecordArrival, matchesReceived, receiptPose, RecordArrivalContext } from "./record-arrival";

/** Accent only the receiving record; its layout, text and live controls do not move. */
export function KitRecordArrival({
  receipt,
  children,
}: {
  receipt: Record<string, unknown>;
  children: ReactNode;
}) {
  const kit = useKit();
  const { component: id } = usePartContext();
  const cue = useContext(RecordArrivalContext);
  const scripted = cue?.component === id ? cue : undefined;
  const pose = receiptPose(receipt);
  const previous = useRef(pose);
  const [progress, setProgress] = useState(1);
  const { record, phase } = pose ?? {};
  // Compute during render so Strict Mode can replay the same commit, but not a new snapshot.
  const accepted = scripted !== undefined && matchesReceived(scripted, pose);
  const enabled =
    (scripted !== undefined || kit.environment.signature === "record_arrive") &&
    !kit.environment.reduceMotion &&
    !kit.environment.agentMode &&
    !kit.visualOnly;
  const duration = kit.motion === "lively" ? durations.slow : signatures.record_arrive.duration;
  useLayoutEffect(() => {
    const from = previous.current;
    const to = record === undefined ? undefined : { record, phase };
    previous.current = to;
    const accept = cue ? accepted : isRecordArrival(from, to);
    if (enabled && accept) return animateNumber(0, 1, setProgress, { duration, easing: easeOut });
    setProgress(1);
  }, [record, phase, enabled, duration, cue]);
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
