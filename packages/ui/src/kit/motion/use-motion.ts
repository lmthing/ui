import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { durations, signatures, springs, type SignatureName } from "../../catalog";
import { useKit } from "../provider";
import { usePartContext } from "../part";
import { animateNumber, type Spring } from "./animate";
export function useReveal(
  key: string | number,
  enabled: boolean,
  options: { spring?: Spring; duration?: number; delay?: number } = {},
): number {
  const [value, setValue] = useState(1);
  const config = useRef(options);
  config.current = options;
  useLayoutEffect(() => {
    if (!enabled) {
      setValue(1);
      return;
    }
    setValue(0);
    return animateNumber(0, 1, setValue, config.current);
  }, [key, enabled, options.duration]);
  return Math.min(1, Math.max(0, value));
}
export function useSignatureProgress(name: SignatureName): number {
  const { environment } = useKit();
  const context = usePartContext();
  return useReveal(
    `${context.component}:${context.cue ?? 0}:${environment.cue ?? 0}`,
    environment.signature === name &&
      context.signature === name &&
      !environment.reduceMotion &&
      !environment.agentMode,
    { spring: signatures[name].spring },
  );
}
export function useAnimatedValue(target: number, disabled = false): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (disabled) {
      current.current = target;
      setValue(target);
      return;
    }
    return animateNumber(
      current.current,
      target,
      (next) => {
        current.current = next;
        setValue(next);
      },
      { spring: springs.snappy, ...(target === 0 ? { duration: durations.fast } : {}) },
    );
  }, [target, disabled]);
  return value;
}
export function countText(value: string, progress: number): string {
  if (progress >= 1) return value;
  const match = value.match(/^([^0-9-]*)(-?[0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/);
  if (!match) return value;
  const amount = Number(match[2]!.replace(/,/g, ""));
  const places = match[2]!.split(".")[1]?.length ?? 0;
  const counted = (amount * progress).toFixed(places);
  return `${match[1]}${counted}${match[3]}`;
}
