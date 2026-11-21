import { describe, partOf, shown, type FrameCheck } from "./shared";

const actions = "button, a[href], [role=button], [role=link]";
const negativePart = /(?:^|_)(?:decline|reject|delete|discard|remove|revoke|cancel)(?:_|$)/;
const negativeLabel =
  /^(?:(?:decline|reject|delete|discard|revoke)(?:\s|$)|cancel (?:booking|order|subscription|appointment)\b)/i;
const positiveTokens = ["--accent", "--accentSoft", "--good", "--goodSoft"];

function paints(el: Element, control: Element): string[] {
  const css = getComputedStyle(el);
  if (el !== control && el.closest(actions) !== control) return [];
  const colors = [css.backgroundColor];
  if (
    el.childNodes.length &&
    Array.from(el.childNodes).some((node) => node.nodeType === 3 && node.textContent?.trim())
  )
    colors.push(css.color);
  if (el instanceof SVGElement) colors.push(css.stroke, css.fill);
  if (parseFloat(css.borderTopWidth)) colors.push(css.borderTopColor);
  return colors;
}

export function checkActionTone({ frameEl, frame, add }: FrameCheck) {
  const canvas = document.createElement("canvas").getContext("2d");
  if (!canvas) return;
  const color = (raw: string) => {
    if (!CSS.supports("color", raw)) return "";
    canvas.fillStyle = raw;
    return canvas.fillStyle;
  };
  for (const el of frameEl.querySelectorAll(actions)) {
    const name = el.getAttribute("aria-label") || el.textContent?.trim() || "";
    if (!(negativePart.test(partOf(el).split("/").at(-1)!) || negativeLabel.test(name)) || !shown(el))
      continue;
    const css = getComputedStyle(el);
    const positive = new Map(
      positiveTokens.map((token) => [color(css.getPropertyValue(token).trim()), token]),
    );
    positive.delete("");
    const used = [el, ...el.querySelectorAll("*")].filter(shown).flatMap((node) => paints(node, el));
    const token = used.map((paint) => positive.get(color(paint))).find(Boolean);
    if (token) add("action-tone", frame, el, `${describe(el)} uses the positive ${token.slice(2)} color`);
  }
}
