import type { StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type StoriesCopy = {
  mine: boolean;
  detail: "full" | "brief";
  people: readonly { name: string; seen: boolean }[];
};

export function storiesReading(input: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled") return [];
  const { mine, detail, people } = input as StoriesCopy;
  const { stories } = socialWordsFor(lang);
  return [
    ...(mine ? [stories.add, ...(detail === "full" ? [stories.own] : [])] : []),
    ...people.map(({ name, seen }) => stories.status(name, seen)),
  ];
}
