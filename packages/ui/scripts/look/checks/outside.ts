import { visibleX, type FrameCheck, type ElementCheck } from "./shared";
export function checkOutside({ el, rect, frame, add }: ElementCheck, { box }: FrameCheck) {
  const seen = visibleX(el, rect);
  if (seen.right > seen.left && (seen.left < box.left - 1 || seen.right > box.right + 1)) {
    add(
      "outside",
      frame,
      el,
      `x ${Math.round(rect.left - box.left)}..${Math.round(rect.right - box.left)} of ${Math.round(box.width)}`,
    );
  }
}
