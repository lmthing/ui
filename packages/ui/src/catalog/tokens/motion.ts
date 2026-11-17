export const durations = { fast: 120, base: 220, slow: 420 } as const;
export const springs = {
  snappy: { stiffness: 420, damping: 34 },
  gentle: { stiffness: 180, damping: 24 },
  bouncy: { stiffness: 300, damping: 14 },
} as const;
