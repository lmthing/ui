import type { Address } from "./grammar";

export function climb(address: Address): Address | null {
  const { screen, component, item } = address;
  if (address.part && component) return item ? { screen, component, item } : { screen, component };
  if (item && component) return { screen, component };
  if (component || address.after) return { screen };
  return null;
}
