import { size } from "../../../catalog";

export type Point = { x: number; y: number };
export type Pin = Point & {
  selected?: boolean | undefined;
  mark?: "pin" | "dot" | "price" | "avatar";
  photo?: string;
  initials?: string;
  target?: { item?: string; part: string };
} & Record<"id" | "label", string>;

function markerCenter(coordinate: number, extent: number, markSize: number, imageSpace: boolean) {
  const share = Number.isFinite(coordinate) ? Math.max(0, Math.min(1, coordinate)) : 0.5;
  if (imageSpace) {
    const bounded = Math.min(markSize, extent);
    return offset(share * extent, extent, bounded) + bounded / 2;
  }
  return markSize / 2 + share * (extent - markSize);
}

export const offset = (center: number, extent: number, target: number = size.control.md) =>
  Math.max(0, Math.min(extent - target, center - target / 2));

export const markSizeOf = (pin: Pin) =>
  pin.mark === "dot" ? size.icon.sm : pin.mark === "avatar" ? size.avatar.md : size.avatar.sm;
export const targetWidthOf = (pin: Pin, width: number) =>
  pin.mark === "price" ? Math.min(width, size.avatar.lg) : size.control.md;
export const centerOf = (pin: Pin, width: number, height: number, imageSpace = false): Point => ({
  x: markerCenter(
    pin.x,
    width,
    pin.mark === "price" ? targetWidthOf(pin, width) : markSizeOf(pin),
    imageSpace,
  ),
  y: markerCenter(pin.y, height, markSizeOf(pin), imageSpace),
});
export function nearestPin(
  at: Point,
  pins: readonly Pin[],
  width: number,
  height: number,
  imageSpace = false,
) {
  let closest: Pin | undefined,
    best = Infinity;
  for (const pin of pins) {
    if (!pin.target) continue;
    const { x, y } = centerOf(pin, width, height, imageSpace);
    const targetWidth = targetWidthOf(pin, width);
    const inside = (delta: number, extent: number) => delta >= 0 && delta <= extent;
    if (
      !inside(at.x - offset(x, width, targetWidth), targetWidth) ||
      !inside(at.y - offset(y, height), size.control.md)
    )
      continue;
    const distance = Math.hypot(x - at.x, y - at.y);
    if (distance >= best) continue;
    [best, closest] = [distance, pin];
  }
  return closest;
}
