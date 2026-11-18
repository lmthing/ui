import type { ElementCheck } from "./shared";
export function checkTargets({ el, rect, style, frame, add }: ElementCheck) {
  const role = el.getAttribute("role");
  if (
    role &&
    ["button", "link", "checkbox", "switch", "tab"].includes(role) &&
    // A calendar day (data-dense) may be 40px wide so a week fits a 320px phone; it stays 44px tall.
    (rect.height < 43.5 || rect.width < (el.hasAttribute("data-dense") ? 39.5 : 43.5))
  ) {
    add("target", frame, el, `${role} is ${Math.round(rect.width)}×${Math.round(rect.height)}, needs 44×44`);
  }
}
