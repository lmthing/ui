import { describe, partOf, shown, type FrameCheck, type TextBox } from "./shared";

export function checkTypeSizes({ frame, add }: FrameCheck, texts: TextBox[]) {
  const items = new Map<Element | string, Map<string, Element>>();
  for (const { el } of texts) {
    const item = partOf(el).match(/^r\d+\//)?.[0] ?? el.closest("li, [role=listitem]");
    if (!item || !shown(el) || !/[\p{L}\p{N}]/u.test(el.textContent ?? "")) continue;
    const sizes = items.get(item) ?? new Map<string, Element>();
    const size = getComputedStyle(el).fontSize;
    if (!sizes.has(size)) sizes.set(size, el);
    items.set(item, sizes);
  }
  for (const sizes of items.values()) {
    if (sizes.size <= 3) continue;
    const parts = Array.from(sizes, ([size, el]) => `${describe(el)} (${size})`);
    add(
      "type-sizes",
      frame,
      Array.from(sizes.values())[3]!,
      `${sizes.size} type sizes in one item: ${parts.join(", ")}`,
    );
  }
}
