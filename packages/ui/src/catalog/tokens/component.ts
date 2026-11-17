// Fixed values for kit bases and single components that no scale token covers.
// Key by base (`base`) or by component id. Add a key only when no token in space/size/radius/type fits.
export const component = {
  base: {
    borderWidth: 1,
    strongBorder: 2,
    none: 0,
    bodyFlex: 1,
    skeletonOpacity: 0.4,
    wideRatio: 16 / 9,
    tallRatio: 3 / 4,
    stripShare: 0.4,
    ringMd: 120,
    ringLg: 168,
    timeWidth: 64,
    barsHeight: 120,
    dayMinWidth: 40,
    hourHeight: 56,
    stackPeek: 8,
    pinRadius: 11,
    streetWidth: 6,
    gridOpacity: 0.35,
    stackFade: 0.25,
    blockMinHeight: 60,
    sparkHeight: 48,
    emptyMinHeight: 280,
  },
  Gallery: { cardWidth: 360, minWidth: 320, previewHeight: 288, maxWidth: 1200 },
} as const;
