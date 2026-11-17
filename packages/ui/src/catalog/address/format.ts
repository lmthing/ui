import type { Address } from "./grammar";
import { parseAddress } from "./parse";

export function formatAddress(address: Address): string {
  const { screen, component, item, part, after } = address;
  if ((after && (component || item || part)) || ((item || part) && !component)) {
    throw new Error("Invalid address hierarchy");
  }
  const value = after
    ? `${screen}/~after:${after}`
    : [screen, component, item, part].filter((segment) => segment !== undefined).join("/");
  const parsed = parseAddress(value);
  if (!parsed || parsed.item !== item || parsed.part !== part || parsed.after !== after) {
    throw new Error("Invalid address segments");
  }
  return value;
}
