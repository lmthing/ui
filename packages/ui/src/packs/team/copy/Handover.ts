import { teamWordsFor } from "../lang";

export function handoverDetails<T extends { time: string }>({
  detail,
  notes,
}: {
  detail: "full" | "brief";
  notes: readonly T[];
}) {
  if (detail === "brief") return { notes: notes.map((note) => ({ ...note, time: undefined })) };
}

export function handoverReading(
  { notes }: { notes: readonly { id: string; seen: boolean }[] },
  lang?: string,
) {
  const words = teamWordsFor(lang).handover;
  return notes.map(({ id, seen }) => `${id} ${seen ? words.seen : words.unseen}`);
}
