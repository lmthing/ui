import type { PartEntry } from "./types";

export function createMemoryParts() {
  const entries = new Map<string, PartEntry>();
  return {
    register(entry: PartEntry) { entries.set(entry.address, entry); },
    unregister(entry: Omit<PartEntry, "rect">) {
      if (entries.get(entry.address)?.rev === entry.rev) entries.delete(entry.address);
    },
    snapshot() { return [...entries.values()]; },
  };
}
