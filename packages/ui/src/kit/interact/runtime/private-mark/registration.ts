type Accepts = ((reference: string) => boolean) | undefined;
export type PrivateMarks = Map<string, { token: symbol; accepts: Accepts }>;

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
