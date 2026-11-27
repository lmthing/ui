export const durations = { fast: 120, base: 220, slow: 420 } as const;
export const springs = {
  snappy: { stiffness: 420, damping: 34 },
  gentle: { stiffness: 180, damping: 24 },
  bouncy: { stiffness: 300, damping: 14 },
} as const;

export const motion = {
  arriveY: 8,
  stagger: 40,
  staggerLimit: 6,
  pressScale: 0.97,
  pulseScale: 0.16,
  spinAngle: 20,
  chipDip: 0.94,
  figureRoll: 6,
  errorTurns: 3,
  collapseTitleAt: 48,
  expandTitleAt: 12,
  reducedFadeStart: 0.72,
} as const;

export const motionProfiles = {
  calm: {
    navigation: durations.base,
    feedback: durations.fast,
    push: 20,
    sheet: 24,
    error: 3,
    spring: springs.snappy,
  },
  lively: {
    navigation: durations.slow,
    feedback: durations.base,
    push: 40,
    sheet: 40,
    error: 6,
    spring: springs.bouncy,
  },
} as const;

export const motionEase = "cubic-bezier(0.2, 0, 0, 1)";
