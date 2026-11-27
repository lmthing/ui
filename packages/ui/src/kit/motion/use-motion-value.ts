import { useLayoutEffect, useRef, useState } from "react";
import { motionProfiles } from "../../catalog";
import { useKit } from "../provider";
import { animateNumber } from "./animate";

/** Retarget from the last painted value and skip work for initial or unchanged values. */
export function useMotionValue(target: number, disabled = false, timing: "spring" | "timed" = "spring") {
  const { environment, motion } = useKit();
  const settled = disabled || environment.reduceMotion || environment.agentMode;
  const profile = motionProfiles[motion];
  const current = useRef(target);
  const [value, setValue] = useState(target);
  useLayoutEffect(() => {
    const update = (next: number) => {
      current.current = next;
      setValue(next);
    };
    if (settled) {
      update(target);
      return;
    }
    if (current.current === target) return;
    return animateNumber(
      current.current,
      target,
      update,
      timing === "timed" ? { duration: profile.feedback } : { spring: profile.spring },
    );
  }, [settled, target, timing, profile]);
  return settled ? target : value;
}
