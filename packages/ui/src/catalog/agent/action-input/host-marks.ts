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
