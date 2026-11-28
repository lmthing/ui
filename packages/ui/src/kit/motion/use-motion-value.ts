import { useLayoutEffect, useRef, useState } from "react";
import { motionProfiles } from "../../catalog";
import { useKit } from "../provider";
import { animateNumber, easeOut } from "./animate";

/** Retarget from the last painted value and skip work for initial or unchanged values. */
export function useMotionValue(target: number, disabled = false, timing: "spring" | "timed" = "spring") {
  const { environment, motion } = useKit();
  const settled = disabled || environment.reduceMotion || environment.agentMode;
  const profile = motionProfiles[motion];
  const current = useRef(target);
  const velocity = useRef(0);
  const [value, setValue] = useState(target);
  useLayoutEffect(() => {
    const update = (next: number) => {
      current.current = next;
      setValue(next);
    };
    if (settled) {
      velocity.current = 0;
      update(target);
      return;
    }
    if (timing === "timed") velocity.current = 0;
    if (current.current === target && !velocity.current) return;
    return animateNumber(
      current.current,
      target,
      update,
      timing === "timed"
        ? { duration: profile.feedback, easing: easeOut }
        : {
            spring: profile.spring,
            velocity: velocity.current,
            onVelocity: (next) => {
              velocity.current = next;
            },
          },
    );
  }, [settled, target, timing, profile]);
  return settled ? target : value;
}
