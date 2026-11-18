import { label, boxOf, type ElementCheck } from "./shared";
export function checkClipped({ el, rect, style, frame, add }: ElementCheck) {
  const he = el as HTMLElement;
  const size = parseFloat(style.fontSize);
  if (he.scrollWidth > he.clientWidth + 1 && style.overflow !== "visible") {
    add("clipped", frame, el, `${label(el)} needs ${he.scrollWidth}px, has ${he.clientWidth}px`);
  }
  if (size < 12) add("small", frame, el, `${label(el)} is ${size}px`);
}
export function checkTextSpacing({ el, rect, style, frame, add }: ElementCheck) {
  const size = parseFloat(style.fontSize);
  const holder = boxOf(el);
  if (holder) {
    const h = holder.getBoundingClientRect();
    const side = Math.min(rect.left - h.left, h.right - rect.right);
    const end = Math.min(rect.top - h.top, h.bottom - rect.bottom);
    // Pills (badges, chips) may be tight above and below; boxes need room on every side.
    const pill = parseFloat(getComputedStyle(holder).borderTopLeftRadius) >= h.height / 2 - 1;
    if (side < 7.5 || end < (pill ? 2.5 : 7.5)) {
      const where = `${Math.max(0, Math.round(side))}px at the sides, ${Math.max(0, Math.round(end))}px above/below`;
      add("cramped", frame, el, `${label(el)} has ${where} inside its ${pill ? "pill" : "box"}`);
    }
  }
  const lineHeight = parseFloat(style.lineHeight) || size * 1.3;
  const lines = Math.round(rect.height / lineHeight);
  const words = (el.textContent ?? "").trim().split(/\s+/).length;
  if (lines >= 2 && words / lines <= 2)
    add("wrap", frame, el, `${label(el)} wraps into ${lines} lines of ≤2 words`);
}
