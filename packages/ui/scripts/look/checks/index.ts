import { checkOutside } from "./outside";
import { checkIcon, checkBorder, checkLoading, checkTextContrast } from "./contrast";
import { checkTargets } from "./targets";
import { checkClipped, checkTextSpacing } from "./clipped";
import { checkAlignment } from "./alignment";
import { checkLead } from "./lead";
import { checkRhythm } from "./rhythm";
import { checkOverlap } from "./overlap";
import { checkTypeSizes } from "./type-sizes";
import { checkActionTone } from "./action-tone";
import { checkGroupSpacing, checkHeadingGap } from "./group-spacing";
import { checkNumericColumns } from "./numeric-columns";
import { checkEmptyCopy } from "./empty-copy";
import { drawMarks } from "./marks";
import { ownText, partOf, type LookIssue, type FrameCheck, type TextBox } from "./shared";
export type { LookIssue } from "./shared";

export function find(): LookIssue[] {
  const issues: LookIssue[] = [];
  const add: FrameCheck["add"] = (kind, frame, el, detail) => {
    issues.push({ kind, frame, part: partOf(el) || "root", detail });
  };
  for (const frameEl of Array.from(document.querySelectorAll("[data-look-frame]"))) {
    checkFrame({
      frameEl,
      frame: frameEl.getAttribute("data-look-frame")!,
      box: frameEl.getBoundingClientRect(),
      add,
    });
  }
  return issues;
}

function checkFrame(context: FrameCheck) {
  const texts: TextBox[] = [];
  for (const el of Array.from(context.frameEl.querySelectorAll("*"))) {
    const rect = el.getBoundingClientRect();
    const hasText = ownText(el);
    if ((!rect.width || !rect.height) && !hasText) continue;
    const check = { el, rect, style: getComputedStyle(el), frame: context.frame, add: context.add };
    if (!rect.width || !rect.height) {
      if (Math.abs(context.box.width - 390) < 1) checkClipped(check, context);
      continue;
    }
    checkOutside(check, context);
    if (el.tagName.toLowerCase() === "svg") {
      checkIcon(check);
      continue;
    }
    checkBorder(check);
    checkTargets(check);
    checkLoading(check);
    if (!hasText) continue;
    texts.push({ el, rect });
    checkClipped(check, context);
    checkTextContrast(check);
    checkTextSpacing(check);
  }
  checkAlignment(context);
  checkLead(context);
  checkRhythm(context);
  checkOverlap(context, texts);
  if (Math.abs(context.box.width - 390) >= 1) return;
  const parts = new Map(
    Array.from(context.frameEl.querySelectorAll("[data-testid]"), (el) => [partOf(el), el] as const),
  );
  checkGroupSpacing(context, parts);
  checkTypeSizes(context, texts);
  checkNumericColumns(context, texts, parts);
  checkActionTone(context);
  checkHeadingGap(context, parts);
  checkEmptyCopy(context, texts);
}

declare global {
  interface Window {
    lookChecks: { find: typeof find; drawMarks: typeof drawMarks };
  }
}
window.lookChecks = { find, drawMarks };
