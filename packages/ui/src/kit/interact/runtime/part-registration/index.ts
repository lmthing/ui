export function registerPart(parts: Map<string, symbol>, local: string, revoke?: (address: string) => void) {
  if (parts.has(local)) revoke?.(local);
  const token = Symbol(local);
  parts.set(local, token);
  return () => {
    if (parts.get(local) !== token) return;
    parts.delete(local);
    revoke?.(local);
  };
}
