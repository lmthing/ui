const aliases: Record<string, string> = {
  daytimeline: "Timeline",
  dayplan: "Timeline",
  timeblocks: "Timeline",
  hourly: "Timeline",
  daily: "Timeline",
  chronology: "Timeline",
};
export const normalizeComponentId = (name: string) => name.replace(/[\s_-]/g, "").toLowerCase();

export function legacyTarget(name: string): string | undefined {
  return aliases[normalizeComponentId(name)];
}
