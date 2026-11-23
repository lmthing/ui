import type { FrameCheck } from "./shared";
export function checkAlignment(context: FrameCheck) {
  const { frameEl } = context;
  // Same-named parts of different items (r1/label, r2/label, …) should line up: in one row they share
  // a top edge, and across rows they start at a few shared x positions (one per column).
  const byPart = new Map<string, DOMRect[]>();
  for (const el of Array.from(frameEl.querySelectorAll("[data-testid]"))) {
    const m = el.getAttribute("data-testid")!.match(/^(.+)\/r\d+\/([a-z_]+)$/);
    const rect = el.getBoundingClientRect();
    // Chat bubbles align to two sides on purpose (theirs left, mine right): no column check.
    if (el.closest("[data-look-twoedge]")) continue;
    if (m && m[2] !== "root" && rect.width) {
      const key = `${m[1]}/${m[2]}`;
      byPart.set(key, [...(byPart.get(key) ?? []), rect]);
    }
  }

  for (const [key, rects] of byPart) checkPart(context, key.slice(key.lastIndexOf("/") + 1), rects);
}
function checkPart({ frame, frameEl, add }: FrameCheck, part: string, rects: DOMRect[]) {
  const lefts = [...new Set(rects.map((r) => Math.round(r.left / 3)))];
  const rights = [...new Set(rects.map((r) => Math.round(r.right / 3)))];
  const rows = new Map<number, number[]>();
  for (const r of rects)
    rows.set(Math.round(r.top / 24), [...(rows.get(Math.round(r.top / 24)) ?? []), r.top]);
  const columns = Math.max(...[...rows.values()].map((tops) => tops.length));
  const centres = [...new Set(rects.map((r) => Math.round((r.left + r.right) / 6)))];
  // A conversation aligns each item to one of two edges (theirs left, mine right): fine when every
  // item sits on a left or right edge it shares with another item.
  const shared = (key: (r: DOMRect) => number) => {
    const counts = new Map<number, number>();
    for (const r of rects) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
    return (r: DOMRect) => (counts.get(key(r)) ?? 0) > 1;
  };
  const onLeft = shared((r) => Math.round(r.left / 3));
  const onRight = shared((r) => Math.round(r.right / 3));
  const twoEdged = rects.length > 2 && rects.every((r) => onLeft(r) || onRight(r));
  if (!twoEdged && lefts.length > columns && rights.length > columns && centres.length > columns) {
    add(
      "align",
      frame,
      frameEl,
      `${part} starts at ${lefts.length} different x positions for ${columns} column(s)`,
    );
  }
  for (const r of rects) {
    const sameRow = rects.filter((o) => o !== r && o.bottom > r.top && o.top < r.bottom);
    if (sameRow.some((o) => Math.abs(o.top - r.top) > 2)) {
      add("align", frame, frameEl, `${part} tops differ within one row`);
      break;
    }
  }
}
