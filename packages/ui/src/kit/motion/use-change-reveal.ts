import { useLayoutEffect, useRef, useState } from "react";
import { durations, motion as tokens, motionProfiles } from "../../catalog";
import { useKit } from "../provider";
import { animateNumber } from "./animate";

export function useChangeReveal(key: string | undefined, allowFade = true) {
  const { motion, environment } = useKit();
  const previous = useRef(key);
  const [progress, setProgress] = useState(1);
  const duration = environment.reduceMotion ? durations.fast : motionProfiles[motion].feedback;
  const off = environment.agentMode || (!allowFade && environment.reduceMotion);
  useLayoutEffect(() => {
    const changed = previous.current !== key;
    previous.current = key;
    if (off || key === undefined) {
      setProgress(1);
      return;
    }
    if (changed) return animateNumber(0, 1, setProgress, { duration });
    setProgress(1);
  }, [duration, key, off]);
  return off ? 1 : progress;
}

export function useReducedFade(key: string | undefined) {
  const { environment } = useKit();
  const progress = useChangeReveal(environment.reduceMotion ? key : undefined);
  return progress < 1 ? { opacity: tokens.reducedFadeStart + (1 - tokens.reducedFadeStart) * progress } : {};
}
