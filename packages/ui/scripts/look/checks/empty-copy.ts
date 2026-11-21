import { emptyLine } from "../../../src/catalog";
import { describe, shown, type FrameCheck, type TextBox } from "./shared";

declare const LOOK_EMPTY_STATES: Readonly<Record<string, string>>;

export function checkEmptyCopy({ frame, frameEl, add }: FrameCheck, texts: TextBox[]) {
  if (!frame.endsWith("_empty")) return;
  const expected = LOOK_EMPTY_STATES[frame.split("_")[0]!];
  if (!expected) return;
  const neutral = emptyLine(undefined, frameEl.closest("[lang]")?.getAttribute("lang") ?? undefined);
  const fallback = texts.find(({ el }) => el.textContent?.trim() === neutral && shown(el));
  if (fallback)
    add(
      "empty-copy",
      frame,
      fallback.el,
      `${describe(fallback.el)} uses the shared neutral line; needs specific copy (${expected})`,
    );
}
