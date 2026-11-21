import { expect } from "vitest";
import type { Affordance } from "@lmthing/ui/catalog";
import { hasStepTarget, type AddressedElement } from "../../render";
import { hasColumnTarget } from "../column-target";

const roles: Record<string, string[]> = {
  press: ["button", "link"],
  toggle: ["switch", "checkbox", "button"],
  check: ["checkbox"],
  select: ["radio", "tab", "button", "option", "radiogroup"],
  swipe: ["button"],
  flip: ["button"],
  increment: ["button"],
  decrement: ["button"],
  move: ["button"],
  start: ["button"],
  stop: ["button"],
  dismiss: ["button"],
  send: ["button"],
  play: ["button"],
  pause: ["button"],
  seek: ["slider"],
  type: ["textbox", "searchbox"],
  set: ["slider", "spinbutton"],
};

export function expectTarget(read: string, addressed: Map<string, AddressedElement>, offer: Affordance) {
  const { address, action, part } = offer;
  expect(read, `${address} is missing from the read`).toContain(`[${address} ${action}`);
  const element = addressed.get(`home/${address}${part === "root" ? "/root" : ""}`);
  expect(element, `${address} offers ${action} but is not on screen`).toBeDefined();
  if (element && (hasStepTarget(element, action) || hasColumnTarget(element, action))) return;
  const role = element?.attributes.match(/\brole="([^"]+)"/)?.[1];
  if (
    action === "set" &&
    role === "textbox" &&
    element?.tag === "input" &&
    /\bdata-set-kind="date"/.test(element.attributes) &&
    /\baria-label="[^"]+"/.test(element.attributes)
  )
    return;
  expect(roles[action] ?? [], `${address} has role ${role ?? "none"}`).toContain(role);
}
