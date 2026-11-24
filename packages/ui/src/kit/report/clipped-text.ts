import type { Issue } from "../../catalog";

const selector = "[data-report-clipped]";
const scrolls = (overflow: string) => overflow === "auto" || overflow === "scroll";
const clips = (overflow: string) => overflow === "hidden" || overflow === "clip";
const outside = (start: number, end: number, low: number, high: number, tolerance = 1) =>
  start < low - tolerance || end > high + tolerance;

function clipsLabel(label: HTMLElement, root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view || !label.getClientRects().length || view.getComputedStyle(label).visibility !== "visible")
    return false;
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(label);
  const runs = Array.from(range.getClientRects());
  let horizontal = true;
  let vertical = true;
  for (let node: HTMLElement | null = label; node; node = node.parentElement) {
    const { overflowX, overflowY } = view.getComputedStyle(node);
    horizontal &&= !scrolls(overflowX);
    vertical &&= !scrolls(overflowY);
    const clipX = horizontal && clips(overflowX);
    const clipY = vertical && clips(overflowY);
    if (clipX || clipY) {
      const box = node.getBoundingClientRect();
      if (
        runs.some(
          ({ left, right, top, bottom, height }) =>
            (clipX && outside(left, right, box.left, box.right)) ||
            (clipY && outside(top, bottom, box.top, box.bottom, height / 4)),
        )
      )
        return true;
      if (node === label && clipY && label.scrollHeight > label.clientHeight + 1) return true;
      if (node === label && clipX && label.scrollWidth > label.clientWidth + 1) return true;
    }
    if (node === root || (!horizontal && !vertical)) break;
  }
  return false;
}

/** Report text loss, not the intentional viewport boundary of a scroller. */
export function clippedText(root: HTMLElement): Issue[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).flatMap((label) => {
    const address = label.dataset.testid ?? label.dataset.reportClipped;
    return address && clipsLabel(label, root)
      ? [{ code: "clipped_text", address, message: "Choice label does not fit" }]
      : [];
  });
}
