const aliases: Record<string, string> = {
  daytimeline: "Timeline",
  dayplan: "Timeline",
  timeblocks: "Timeline",
  hourly: "Timeline",
  daily: "Timeline",
  chronology: "Timeline",
};
export function legacyTarget(name: string): string | undefined {
  return aliases[name.replace(/[\s_-]/g, "").toLowerCase()];
}
