import type { FrameCheck } from "./shared";

function siblingParent(el: Element) {
  const parent = el.parentElement;
  // A presentational row in a list grid only lays out its cells.
  if (
    el.getAttribute("role") === "listitem" &&
    parent?.getAttribute("role") === "presentation" &&
    parent.parentElement?.getAttribute("role") === "list"
  )
    return parent.parentElement;
  return parent;
}

function unevenGap(siblings: Set<Element>): string | undefined {
  const boxes = Array.from(siblings, (el) => ({
    kind: el.getAttribute("role") ?? el.localName,
    rect: el.getBoundingClientRect(),
  })).sort((a, b) => a.rect.top - b.rect.top);
  const gapsByKind = new Map<string, number[]>();
  for (let index = 1; index < boxes.length; index++) {
    const previous = boxes[index - 1]!;
    const next = boxes[index]!;
    if (next.kind !== previous.kind) continue;
    const gap = next.rect.top - previous.rect.bottom;
    if (gap < 0) continue;
    const gaps = gapsByKind.get(next.kind) ?? [];
    gaps.push(gap);
    gapsByKind.set(next.kind, gaps);
  }
  for (const gaps of gapsByKind.values()) {
    const min = Math.min(...gaps);
    const max = Math.max(...gaps);
    if (gaps.length >= 2 && max - min > 6)
      return `gaps between items vary from ${Math.round(min)} to ${Math.round(max)}px`;
  }
}

export function checkRhythm({ frameEl, frame, add }: FrameCheck) {
  const groups = new Map<Element, Set<Element>>();
  for (const el of Array.from(frameEl.querySelectorAll("[data-testid]"))) {
    if (!/\/r\d+\/root$/.test(el.getAttribute("data-testid")!)) continue;
    // Timed layouts have intentional gaps. For lists, a root can be a control inside its card.
    if (el.closest("[data-look-timed]")) continue;
    const item = el.closest('[role="listitem"]');
    const box = item && frameEl.contains(item) ? item : el;
    const parent = siblingParent(box);
    if (!parent) continue;
    const siblings = groups.get(parent) ?? new Set<Element>();
    siblings.add(box);
    groups.set(parent, siblings);
  }
  for (const siblings of groups.values()) {
    const detail = unevenGap(siblings);
    if (detail) {
      add("rhythm", frame, frameEl, detail);
      return;
    }
  }
}
