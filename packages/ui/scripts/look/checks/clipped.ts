import { boxOf, describe, label, shown, textRects, type ElementCheck, type FrameCheck } from "./shared";

const tolerance = 1;

function clipReason(el: Element, frameEl: Element, style: CSSStyleDeclaration) {
  const rects = textRects(el);
  // A scroll region may intentionally have whole items (or whole words) outside its initial view.
  // Check the visible portion of each run, while retaining local ellipsis/clamp as a fault.
  const visible = rects.map(({ left, right, top, bottom }) => ({ left, right, top, bottom }));
  let reason: string | undefined;
  for (let node: Element | null = el; node && node !== frameEl.parentElement; node = node.parentElement) {
    const css = node === el ? style : getComputedStyle(node);
    const clipX = node === frameEl || css.overflowX !== "visible";
    const clipY = node === frameEl || css.overflowY !== "visible";
    if ((!clipX && !clipY) || !(node instanceof HTMLElement) || css.display === "inline") continue;
    const box = node.getBoundingClientRect();
    const x = box.left + node.clientLeft;
    const y = box.top + node.clientTop;
    const scrollX = /^(auto|scroll)$/.test(css.overflowX);
    const scrollY = /^(auto|scroll)$/.test(css.overflowY);
    for (const run of visible) {
      const { left, right, top, bottom } = run;
      if (clipX) {
        run.left = Math.max(left, x);
        run.right = Math.min(right, x + node.clientWidth);
      }
      if (clipY) {
        run.top = Math.max(top, y);
        run.bottom = Math.min(bottom, y + node.clientHeight);
      }
      const lostX = right - left - Math.max(0, run.right - run.left);
      const lostY = bottom - top - Math.max(0, run.bottom - run.top);
      if (right <= left || bottom <= top) continue;
      if (lostX > tolerance && (!scrollX || run.right > run.left))
        reason ??=
          css.textOverflow === "ellipsis" ? "is truncated by an ellipsis" : "is clipped horizontally";
      // A Range includes font ascenders/descenders even when a line's actual glyphs fit.
      const verticalTolerance = Math.max(tolerance, (bottom - top) / 4);
      if (
        lostY > verticalTolerance &&
        (!scrollY || run.bottom > run.top) &&
        (node !== el || node.scrollHeight > node.clientHeight)
      )
        reason ??=
          parseInt(css.webkitLineClamp) > 0 ? "is truncated by a line clamp" : "is clipped vertically";
    }
    if (!visible.some((run) => run.right > run.left && run.bottom > run.top)) {
      if (scrollX || scrollY) return;
      break;
    }
  }
  return reason;
}

export function checkClipped({ el, style, frame, add }: ElementCheck, { frameEl, box }: FrameCheck) {
  const size = parseFloat(style.fontSize);
  if (Math.abs(box.width - 390) < tolerance) {
    if (shown(el)) {
      const reason = clipReason(el, frameEl, style);
      if (reason) add("clipped", frame, el, `${describe(el)} ${reason} at 390px`);
    }
  } else if (el.scrollWidth > el.clientWidth + tolerance && style.overflow !== "visible") {
    add("clipped", frame, el, `${describe(el)} needs ${el.scrollWidth}px, has ${el.clientWidth}px`);
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
