import { checkOutside } from "./outside";
import { checkIcon, checkBorder, checkLoading, checkTextContrast } from "./contrast";
import { checkTargets } from "./targets";
import { checkClipped, checkTextSpacing } from "./clipped";
import { checkAlignment } from "./alignment";
import { checkLead } from "./lead";
import { checkRhythm } from "./rhythm";
import { checkOverlap } from "./overlap";
import { drawMarks } from "./marks";
import { ownText, type LookIssue, type FrameCheck, type TextBox } from "./shared";
export type { LookIssue } from "./shared";

export function find(): LookIssue[] {
  const issues: LookIssue[] = [];
  const add: FrameCheck["add"] = (kind, frame, el, detail) => {
    const part = el.closest("[data-testid]")?.getAttribute("data-testid") ?? "?";
    issues.push({ kind, frame, part: part.split("/").slice(2).join("/") || "root", detail });
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
    if (!rect.width || !rect.height) continue;
    const check = { el, rect, style: getComputedStyle(el), frame: context.frame, add: context.add };
    checkOutside(check, context);
    if (el.tagName.toLowerCase() === "svg") {
      checkIcon(check);
      continue;
    }
    checkBorder(check);
    checkTargets(check);
    checkLoading(check);
    if (!ownText(el)) continue;
    texts.push({ el, rect });
    checkClipped(check);
    checkTextContrast(check);
    checkTextSpacing(check);
  }
  checkAlignment(context);
  checkLead(context);
  checkRhythm(context);
  checkOverlap(context, texts);
}

declare global {
  interface Window {
    lookChecks: { find: typeof find; drawMarks: typeof drawMarks };
  }
}
window.lookChecks = { find, drawMarks };
