import type { ReplayProbe } from "@lmthing/ui/catalog";

/** Keep the instructions, task and own entries. Only drop entries inside the shared block. */
export function legacyLocalPrompt(prompt: string, listing: NonNullable<ReplayProbe["listing"]>): string {
  const choose = prompt.includes("\nComponents:\n");
  const startMarker = choose ? "\nComponents:\n" : "\n\n";
  const endMarker = choose ? "\n\nNeed, in the person's words: \"" : "\n\nIdea: ";
  const marker = prompt.indexOf(startMarker);
  if (marker < 0) return prompt;
  const start = marker + startMarker.length;
  const end = prompt.indexOf(endMarker, start);
  if (end < 0) return prompt;
  const local = prompt
    .slice(start, end)
    .split("\n")
    .filter((line) => {
      const entry = /^- (\w+): /u.exec(line);
      return !entry || listing.ids.includes(entry[1]!);
    });
  return `${prompt.slice(0, start)}${local.join("\n")}${prompt.slice(end)}`;
}
