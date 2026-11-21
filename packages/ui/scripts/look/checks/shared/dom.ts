import { ownBackground } from "./colors";
export const boxOf = (el: Element): Element | null => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (node.hasAttribute("data-look-frame")) return null;
    if (ownBackground(node) || parseFloat(style.borderTopWidth) > 0) return node;
  }
  return null;
};

export const label = (el: Element) => `"${(el.textContent ?? "").trim().slice(0, 24)}"`;
export const ownText = (el: Element) =>
  Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());

export const partOf = (el: Element) =>
  el.closest("[data-testid]")?.getAttribute("data-testid")?.split("/").slice(2).join("/") || "";

export const describe = (el: Element) => {
  const part = partOf(el);
  const name = el.getAttribute("aria-label")?.trim();
  const copy = name ? `"${name.slice(0, 24)}"` : label(el);
  return part ? `${part} ${copy}` : copy;
};

export const shown = (el: Element) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });

export function textRects(el: Element): DOMRect[] {
  const range = el.ownerDocument.createRange();
  return Array.from(el.childNodes).flatMap((node) => {
    if (node.nodeType !== 3 || !node.textContent?.trim()) return [];
    const text = node.textContent;
    range.setStart(node, text.length - text.trimStart().length);
    range.setEnd(node, text.trimEnd().length);
    return Array.from(range.getClientRects()).filter((rect) => rect.width && rect.height);
  });
}

// The part of an element a person can see: its box cut by every ancestor that clips or scrolls
// sideways (a photo strip's last photo runs past the edge on purpose).
export const visibleX = (el: Element, rect: DOMRect) => {
  let [left, right] = [rect.left, rect.right];
  for (
    let node = el.parentElement;
    node && !node.hasAttribute("data-look-frame");
    node = node.parentElement
  ) {
    if (getComputedStyle(node).overflowX === "visible") continue;
    const clip = node.getBoundingClientRect();
    [left, right] = [Math.max(left, clip.left), Math.min(right, clip.right)];
  }
  return { left, right };
};
