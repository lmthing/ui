import { rgb, ratio, ownBackground, backgroundOf, label, type ElementCheck } from "./shared";
export function checkIcon({ el, rect, style, frame, add }: ElementCheck) {
  if (el.tagName.toLowerCase() === "svg") {
    const stroke = rgb(style.stroke) ?? rgb(style.color);
    if (stroke && ratio(stroke, backgroundOf(el.parentElement)) < 3) {
      add("graphic", frame, el, `icon ${ratio(stroke, backgroundOf(el.parentElement)).toFixed(2)}:1`);
    }
    return;
  }
}
export function checkBorder({ el, rect, style, frame, add }: ElementCheck) {
  const role = el.getAttribute("role");
  if (role && ["checkbox", "switch"].includes(role) && parseFloat(style.borderTopWidth) > 0) {
    const border = rgb(style.borderTopColor);
    const fill = ownBackground(el);
    const behind = backgroundOf(el.parentElement);
    if (border && !fill && ratio(border, behind) < 3) {
      add("graphic", frame, el, `${role} border ${ratio(border, behind).toFixed(2)}:1`);
    }
  }
}
export function checkLoading({ el, rect, style, frame, add }: ElementCheck) {
  if (el.getAttribute("aria-label") === "Loading") {
    const behind = backgroundOf(el.parentElement);
    const bars = Array.from(el.querySelectorAll("*")).filter((node) => ownBackground(node));
    if (!bars.length) add("faint", frame, el, "loading state draws nothing visible");
    for (const bar of bars.slice(0, 3)) {
      const shown = ratio(ownBackground(bar)!, behind);
      if (shown < 1.25) add("faint", frame, bar, `loading bar ${shown.toFixed(2)}:1 against its card`);
    }
  }
}
export function checkTextContrast({ el, rect, style, frame, add }: ElementCheck) {
  const size = parseFloat(style.fontSize);
  const fg = rgb(style.color);
  if (fg && style.visibility !== "hidden" && +style.opacity > 0.2) {
    const r = ratio(fg, backgroundOf(el));
    const large = size >= 18 || (size >= 14 && +style.fontWeight >= 700);
    if (r < (large ? 3 : 4.5)) add("contrast", frame, el, `${r.toFixed(2)}:1 for ${label(el)}`);
  }
}
