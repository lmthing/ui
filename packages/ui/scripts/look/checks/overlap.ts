import { label, type FrameCheck, type TextBox } from "./shared";
export function checkOverlap({ frame, add }: FrameCheck, texts: TextBox[]) {
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const [a, b] = [texts[i]!, texts[j]!];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
      const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
      if (w > 2 && h > 2) add("overlap", frame, a.el, `overlaps ${label(b.el)}`);
    }
  }
}
