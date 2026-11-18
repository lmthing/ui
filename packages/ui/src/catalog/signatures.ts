import { durations, springs } from "./tokens";
export const signatures = {
  ring_fill: { component: "Ring", duration: durations.slow, spring: springs.gentle },
  bars_grow: { component: "Bars", duration: durations.slow, spring: springs.gentle },
  check_burst: { component: "Checklist", duration: durations.base, spring: springs.bouncy },
  count_up: { component: "Stats", duration: durations.slow, spring: springs.gentle },
  calendar_sweep: { component: "Calendar", duration: durations.slow, spring: springs.gentle },
  timer_spin: { component: "Timer", duration: durations.base, spring: springs.snappy },
  card_swipe: { component: "SwipeStack", duration: durations.base, spring: springs.snappy },
  day_unfold: { component: "Timeline", style: "hours", duration: durations.slow, spring: springs.gentle },
  streak_flame: { component: "Streak", duration: durations.base, spring: springs.bouncy },
  route_draw: { component: "Route", duration: durations.slow, spring: springs.gentle },
} as const;
export type SignatureName = keyof typeof signatures;
