import type { StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type StoriesCopy = {
  mine: boolean;
  detail: "full" | "brief";
  style?: "stories" | "notes";
  people: readonly { name: string; seen: boolean; note?: string }[];
};

export function storiesReading(input: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const { mine, detail, style, people } = input as StoriesCopy;
  const { stories } = socialWordsFor(lang);
  return [
    ...(mine ? [stories.add, ...(detail === "full" ? [stories.own] : [])] : []),
    ...people.map(({ name, seen, note }) =>
      style === "notes" && note
        ? stories.noteLink(stories.noteStatus(name, seen), note)
        : stories.status(name, seen),
    ),
  ];
}
