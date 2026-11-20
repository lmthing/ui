type Accepts = ((reference: string) => boolean) | undefined;
export type PrivateMarks = Map<string, { token: symbol; accepts: Accepts }>;

const markSuffix = "/$privateMark";
export const privateMarkKey = (screen: string, address: string) => `${screen}/${address}${markSuffix}`;

/** Reads may use a shared or restored store after the mount that captured the mark is gone. */
export function redactPrivateMarks(screen: string, values: Record<string, unknown>) {
  const prefix = `${screen}/`;
  const parts = Object.keys(values).filter(
    (key) => key.startsWith(prefix) && key.endsWith(markSuffix) && values[key] === true,
  );
  const addresses = new Set<string>();
  if (!parts.length) return { values, addresses };
  const readable = { ...values };
  for (const key of parts) {
    const full = key.slice(0, -markSuffix.length);
    addresses.add(full.slice(prefix.length));
    delete readable[key];
    delete readable[full];
    delete readable[`${full}/root`];
  }
  return { values: readable, addresses };
}

export function registerPrivateMark(
  marks: PrivateMarks,
  address: string,
  accepts: Accepts,
  commit: (reference: string, token: symbol) => void,
) {
  const token = Symbol();
  marks.set(address, { token, accepts });
  return {
    capture: (reference: string) => commit(reference, token),
    unregister: () => {
      // Keep shielding the stored reference when this pad is no longer on screen.
      if (marks.get(address)?.token === token) marks.set(address, { token, accepts: undefined });
    },
  };
}

export function acceptsPrivateMark(
  marks: PrivateMarks,
  address: string,
  value: unknown,
  token: symbol | undefined,
) {
  const pad = marks.get(address);
  if (!pad) return token === undefined;
  if (pad.token !== token || !pad.accepts || typeof value !== "string" || !value) return false;
  try {
    return pad.accepts(value);
  } catch {
    // A failed local lookup is an unavailable control, not a reason to expose the reference.
    return false;
  }
}
