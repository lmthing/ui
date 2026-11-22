import type { Definition } from "../../probes";
import type { Affordance } from "../affordances";

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

type Accepts = ((reference: string) => boolean) | undefined;
type Registration = { token: symbol; accepts: Accepts };
export type PrivateMarks = Readonly<{ has(address: string): boolean; size: number }>;
const registries = new WeakMap<PrivateMarks, Map<string, Registration>>();

export function createPrivateMarks(): PrivateMarks {
  const entries = new Map<string, Registration>();
  const marks = Object.freeze({
    has: (address: string) => entries.has(address),
    get size() {
      return entries.size;
    },
  });
  registries.set(marks, entries);
  return marks;
}

export function registerPrivateMark(
  marks: PrivateMarks,
  address: string,
  accepts: Accepts,
  commit: (reference: string, token: symbol) => void,
) {
  const entries = registries.get(marks)!;
  const token = Symbol();
  entries.set(address, { token, accepts });
  return {
    capture: (reference: string) => commit(reference, token),
    unregister: () => {
      // Keep shielding the stored reference when this pad is no longer on screen.
      if (entries.get(address)?.token === token) entries.set(address, { token, accepts: undefined });
    },
  };
}

export function acceptsPrivateMark(marks: PrivateMarks, address: string, value: unknown, token: symbol) {
  const entries = registries.get(marks);
  const pad = entries?.get(address);
  if (!pad || pad.token !== token || !pad.accepts || typeof value !== "string" || !value) return false;
  try {
    return pad.accepts(value) && entries?.get(address) === pad;
  } catch {
    // A failed local lookup is an unavailable control, not a reason to expose the reference.
    return false;
  }
}
