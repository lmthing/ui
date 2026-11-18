import type { FrameCheck } from "./shared";
export function checkLead({ frameEl, frame, add }: FrameCheck) {
  // A photo or avatar beside text should centre on the text block when it is taller than one line.
  for (const img of Array.from(frameEl.querySelectorAll('[role="img"]'))) {
    const r = img.getBoundingClientRect();
    const row = img.parentElement?.parentElement;
    if (!row || !r.height || r.width > 120) continue;
    const beside = Array.from(row.querySelectorAll("*")).filter((el) => {
      const own = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
      const t = el.getBoundingClientRect();
      return own && t.left >= r.right && t.top < r.bottom + 24 && t.bottom > r.top - 24;
    });
    if (!beside.length) continue;
    const top = Math.min(...beside.map((el) => el.getBoundingClientRect().top));
    const bottom = Math.max(...beside.map((el) => el.getBoundingClientRect().bottom));
    const firstLine = Math.min(...beside.map((el) => el.getBoundingClientRect().height));
    const off = (r.top + r.bottom) / 2 - (top + bottom) / 2;
    if (r.height > firstLine * 1.4 && Math.abs(off) > 4) {
      add("lead", frame, img, `photo centre is ${Math.round(off)}px off the centre of its text`);
    }
  }
}
