import { itemPattern, slugPattern, type Address } from "./grammar";

export function parseAddress(value: string): Address | null {
  const [screen, component, third, fourth, ...extra] = value.split("/");
  if (!screen || !slugPattern.test(screen) || extra.length) return null;
  if (component === undefined) return { screen };
  if (component.startsWith("~after:")) {
    const after = component.slice("~after:".length);
    return slugPattern.test(after) && third === undefined ? { screen, after } : null;
  }
  if (!slugPattern.test(component)) return null;
  const address: Address = { screen, component };
  if (third === undefined) return address;
  if (!slugPattern.test(third)) return null;
  if (!itemPattern.test(third)) {
    return fourth === undefined ? { ...address, part: third } : null;
  }
  if (fourth === undefined) return { ...address, item: third };
  return slugPattern.test(fourth) ? { ...address, item: third, part: fourth } : null;
}
