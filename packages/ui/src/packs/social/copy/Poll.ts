import { appointmentDate, percentLine, pluralForm, totalLine, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type PollDate = { closes?: string | undefined; detail: "full" | "brief" };
type PollCopy = PollDate & {
  options: readonly { label: string; votes: number }[];
  voted?: number | undefined;
};

export function pollDate({ closes, detail }: PollDate, lang?: string) {
  return closes && detail === "full"
    ? socialWordsFor(lang).poll.closes(appointmentDate(closes, lang))
    : undefined;
}

export function pollResults({ options, voted }: PollCopy, lang?: string) {
  const { poll } = socialWordsFor(lang);
  const total = options.reduce((sum, { votes }) => sum + votes, 0);
  return {
    total: totalLine(total, poll.votes(pluralForm(total, lang)), lang),
    rows: options.map(({ label, votes }, index) => ({
      label,
      share: percentLine(votes, total, lang),
      ratio: total > 0 ? votes / total : 0,
      selected: index === voted,
    })),
  };
}

export function pollReading(input: unknown, state: StateName, lang?: string): string[] {
  const value = input as PollCopy;
  const { poll } = socialWordsFor(lang);
  const closes = pollDate(value, lang);
  const date = closes ? [closes] : [];
  if (state !== "filled" && state !== "success") return [];
  if (value.voted === undefined && state === "filled") return date;
  const { rows, total } = pollResults(value, lang);
  return [
    total,
    ...rows.flatMap(({ label, share, selected }) => [
      ...(selected ? [poll.chosen(label)] : []),
      poll.share(label, share),
    ]),
    ...date,
  ];
}
