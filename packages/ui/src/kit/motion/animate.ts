import { durations, springs } from "../../catalog";
export type Spring = { stiffness: number; damping: number };
type AnimationOptions = {
  spring?: Spring;
  duration?: number;
  delay?: number;
  easing?(progress: number): number;
  velocity?: number;
  onVelocity?(velocity: number): void;
  done?(): void;
};

/** A bounded ease-out for short effects. Spatial motion can use a spring instead. */
export const easeOut = (progress: number) => 1 - (1 - progress) ** 2;

export function springStep(position: number, velocity: number, target: number, dt: number, spring: Spring) {
  const next = velocity + (spring.stiffness * (target - position) - spring.damping * velocity) * dt;
  return { position: position + next * dt, velocity: next };
}
/** Shared transform/opacity/height driver, usable with the host's native RAF or the browser. */
export function animateNumber(
  from: number,
  to: number,
  update: (value: number) => void,
  options: AnimationOptions = {},
): () => void {
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  let position = from;
  let velocity = options.velocity ?? 0;
  let start: number | undefined;
  let previous = 0;
  const spring = options.spring ?? springs.gentle;
  const run = (time: number) => {
    if (cancelled) return;
    if (start === undefined) {
      start = time;
      previous = time;
    }
    const elapsed = time - start;
    if (options.duration) {
      const progress = Math.min(1, elapsed / options.duration);
      position = from + (to - from) * (options.easing?.(progress) ?? progress);
    } else {
      const seconds = Math.min(0.064, Math.max(0.001, (time - previous) / 1000));
      const steps = Math.ceil(seconds / (1 / 120));
      for (let i = 0; i < steps; i++)
        ({ position, velocity } = springStep(position, velocity, to, seconds / steps, spring));
    }
    previous = time;
    const finished = options.duration
      ? elapsed >= options.duration
      : (Math.abs(to - position) < 0.001 && Math.abs(velocity) < 0.01) || elapsed >= durations.slow * 4;
    options.onVelocity?.(finished ? 0 : velocity);
    update(finished ? to : position);
    if (cancelled) return;
    if (finished) options.done?.();
    else frame = requestAnimationFrame(run);
  };
  const begin = () => {
    if (!cancelled) {
      update(from);
      frame = requestAnimationFrame(run);
    }
  };
  if (options.delay) timer = setTimeout(begin, options.delay);
  else begin();
  return () => {
    cancelled = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    if (timer !== undefined) clearTimeout(timer);
  };
}
