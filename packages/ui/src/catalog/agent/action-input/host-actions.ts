import type { Definition } from "../../probes";
import type { Affordance } from "../index";

type HostOnlyParts = { parts?: readonly string[]; items?: readonly string[] };
type HostPolicy = { hostOnlyParts?: HostOnlyParts };

/** Spread into definition metadata to declare parts only a trusted host can operate. */
export const hostOnlyParts = (parts: HostOnlyParts) => ({ hostOnlyParts: parts });

export function hostOnlyAddresses(def: Definition, instance: string, offers: readonly Affordance[]) {
  const policy = (def.meta as Definition["meta"] & HostPolicy).hostOnlyParts;
  if (!policy) return;
  return new Set(
    offers
      .filter(({ part, address }) => {
        const own = part === "root" ? instance : `${instance}/${part}`;
        return (address === own ? policy.parts : policy.items)?.includes(part);
      })
      .map(({ address }) => address),
  );
}

// Also guard previously captured marks when reading or acting on an older definition.
const privateMarkSuffix = "/$privateMark";
export const privateMarkKey = (screen: string, address: string) => `${screen}/${address}${privateMarkSuffix}`;
export const isPrivateMark = (values: Record<string, unknown>, address: string) =>
  values[`${address}${privateMarkSuffix}`] === true;

/** Redact capture data before projections or copy callbacks read the screen-local values. */
export function redactPrivateMarks(values: Record<string, unknown>) {
  const tags = Object.keys(values).filter((key) => key.endsWith(privateMarkSuffix) && values[key] === true);
  const addresses = new Set<string>();
  if (!tags.length) return { values, addresses };
  const readable = { ...values };
  for (const tag of tags) {
    const address = tag.slice(0, -privateMarkSuffix.length);
    addresses.add(address);
    delete readable[tag];
    delete readable[address];
    delete readable[`${address}/root`];
  }
  return { values: readable, addresses };
}
