import type { FrameCheck } from "./shared";
export function checkRhythm({ frameEl, frame, add }: FrameCheck) {
  // Items placed by time (a day by the hour) have gaps that mean something: no rhythm check.
  const roots = Array.from(frameEl.querySelectorAll("[data-testid]"))
    .filter((el) => /\/r\d+\/root$/.test(el.getAttribute("data-testid")!))
    .filter((el) => !el.closest("[data-look-timed]"))
    .map((el) => el.getBoundingClientRect())
    .sort((a, b) => a.top - b.top);
  const gaps = roots
    .slice(1)
    .map((r, i) => r.top - roots[i]!.bottom)
    .filter((g) => g >= 0);
  if (gaps.length >= 2 && Math.max(...gaps) - Math.min(...gaps) > 6) {
    add(
      "rhythm",
      frame,
      frameEl,
      `gaps between items vary from ${Math.round(Math.min(...gaps))} to ${Math.round(Math.max(...gaps))}px`,
    );
  }
}
