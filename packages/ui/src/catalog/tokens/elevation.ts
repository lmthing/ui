export const elevation = {
  flat: { shadowRadius: 0, shadowOpacity: 0, offset: 0, elevation: 0 },
  card: { shadowRadius: 12, shadowOpacity: 0.06, offset: 2, elevation: 2 },
  sheet: { shadowRadius: 24, shadowOpacity: 0.16, offset: 8, elevation: 8 },
} as const;

/** Stacking within one phone screen, not the host stage. */
export const zIndex = { base: 0, overlay: 1, sheet: 2 } as const;
