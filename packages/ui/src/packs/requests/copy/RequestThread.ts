import { appointmentDate, timeOfDayLine, type StateName } from "../../../catalog";
import { requestsWordsFor, type RequestsWords } from "../lang";

type Words = RequestsWords["thread"];
type Status = keyof Words["statuses"];
type Entry = {
  id?: string;
  by: string;
  date: string;
  time: string;
  audience: keyof Words["audiences"];
  kind: "message" | keyof Words["events"];
  from?: Status | undefined;
  to?: Status | undefined;
  who?: string | undefined;
  order?: string | undefined;
  photo?: string | undefined;
  text?: string | undefined;
};

export function threadOrder<T extends Entry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

export function threadEntryCopy(entry: Entry, detail: "full" | "brief", lang?: string) {
  const { kind, from, to, who, order } = entry;
  const { thread: words } = requestsWordsFor(lang);
  const event = kind === "message" ? undefined : words.events[kind];
  const fact =
    detail === "brief"
      ? undefined
      : kind === "status" && from && to
        ? words.statusChange(words.statuses[from], words.statuses[to])
        : kind === "assignment" && who
          ? words.assignee(who)
          : order;
  return {
    event,
    fact,
    date: appointmentDate(entry.date, lang),
    time: timeOfDayLine(entry.time, lang),
    audience: words.audiences[entry.audience],
  };
}

type Thread = {
  number: string;
  entries: readonly Entry[];
  detail: "full" | "brief";
  draft?: string | undefined;
  audience_choices?: readonly Entry["audience"][];
};

export function threadLoading({ number, entries, detail }: Thread, lang?: string) {
  const { thread: words } = requestsWordsFor(lang);
  return [
    { lines: [{ role: "heading" as const, text: words.heading(number) }] },
    ...threadOrder(entries).map((entry) => {
      const { event, fact, date, time, audience } = threadEntryCopy(entry, detail, lang);
      return { title: event ?? entry.by, sub: fact ?? entry.text, meta: `${time} ${date} · ${audience}` };
    }),
  ];
}

export function threadRead(input: unknown, state: StateName, lang?: string): string[] {
  const { number, entries, detail, draft, audience_choices } = input as Thread;
  const { thread: words } = requestsWordsFor(lang);
  return [
    words.heading(number),
    ...threadOrder(entries).map((entry) => {
      const { event, fact, date, time, audience } = threadEntryCopy(entry, detail, lang);
      return [entry.id, entry.by, date, time, audience, event, fact, entry.photo && words.photo]
        .filter(Boolean)
        .join(" · ");
    }),
    ...(state === "success"
      ? [words.sent]
      : audience_choices?.length
        ? [
            words.audience,
            ...audience_choices.map((choice) => words.audiences[choice]),
            draft || words.field,
            words.send,
          ]
        : []),
  ];
}
