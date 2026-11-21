export function registerPart(parts: Map<string, symbol>, local: string) {
  const token = Symbol(local);
  parts.set(local, token);
  return () => {
    if (parts.get(local) === token) parts.delete(local);
  };
}
