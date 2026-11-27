import type { ImageKind } from "./image-slot";

export const framingDirection = {
  square: "Square crop. Keep the recognizable subject away from the outside edges.",
  wide: "Wide landscape crop. Keep essential details in the middle horizontal band, even after a shallow crop.",
  icon: "Square icon crop. Use a single central silhouette with generous mask-safe margins on all sides.",
} as const;

export type ImageFraming = keyof typeof framingDirection;
export const imageFraming = {
  app_icon: "icon",
  hero: "wide",
  cover: "wide",
  onboarding: "wide",
  pattern: "square",
  empty_state: "square",
  success: "square",
  badge: "icon",
  error: "square",
  product: "square",
  dish: "square",
  plant: "square",
  pet: "square",
  place: "wide",
  room: "wide",
  item: "square",
  media_cover: "square",
  poster: "square",
  step_illustration: "wide",
  avatar: "icon",
} satisfies Record<ImageKind, ImageFraming>;
