// Fixed values for kit bases and single components that no scale token covers.
// Key by base (`base`) or by component id. Add a key only when no token in space/size/radius/type fits.
export const component = {
  base: { borderWidth: 1, none: 0, bodyFlex: 1, skeletonOpacity: 0.4 },
  Gallery: { cardWidth: 360, minWidth: 320, previewHeight: 288, maxWidth: 1200 },
} as const;
