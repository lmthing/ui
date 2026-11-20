import { clockLine, durationLine, timeOfDayLine, wordsFor } from "../../../catalog";
import { homeWordsFor } from "../lang";

export const { babyLabels } = homeWordsFor();
type Kind = Exclude<keyof typeof babyLabels, "none">;
export const babyLogTitle = homeWordsFor().babyLog.title;
export const babyEmptyLog = homeWordsFor().babyLog.empty;
export const babyRunningLine = (kind: Kind | "none", lang?: string) => {
  const { babyLabels, babyLog } = homeWordsFor(lang);
  return kind === "none" ? babyLabels.none : babyLog.running(babyLabels[kind]);
};
export const babyClock = clockLine(0);
export const babyLastLine = (time?: string, lang?: string) =>
  homeWordsFor(lang).babyLog.last(time ? timeOfDayLine(time, lang) : undefined);

type Tile = { id?: string; kind: Kind; entryKind: "tile"; active: boolean; last?: string | undefined };
type Entry = {
  id?: string;
  kind: Kind;
  entryKind: "log";
  time: string;
  minutes?: number | undefined;
  amount?: string | undefined;
};

export const babyTileAction = (active: boolean, lang?: string) =>
  wordsFor(lang).timerLabels[active ? "stop" : "start"];

export function babyCopyFor(lang?: string) {
  const { babyLabels, babyLog } = homeWordsFor(lang);
  return {
    ...babyLog,
    labels: babyLabels,
    clock: clockLine(0, lang),
    duration: (minutes: number) => durationLine(minutes, lang),
    entry: (entry: Entry) => babyEntryLine(entry, lang),
    last: (time?: string) => babyLastLine(time, lang),
    running: (kind: Kind | "none") => babyRunningLine(kind, lang),
    action: (active: boolean) => babyTileAction(active, lang),
  };
}

export function babyEntryLine(entry: Entry, lang?: string) {
  return [
    homeWordsFor(lang).babyLabels[entry.kind],
    timeOfDayLine(entry.time, lang),
    entry.minutes === undefined ? undefined : durationLine(entry.minutes, lang),
    entry.amount,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function babyRead(
  { running, entries }: { running: Kind | "none"; entries: (Tile | Entry)[] },
  lang?: string,
  visibleOnly = false,
) {
  const copy = babyCopyFor(lang);
  return [
    copy.running(running),
    ...(running === "none" ? [] : [copy.clock]),
    ...entries.map((entry) => {
      const label =
        entry.entryKind === "tile"
          ? [
              copy.labels[entry.kind],
              copy.action(entry.active),
              ...(entry.last || !visibleOnly ? [copy.last(entry.last)] : []),
            ].join(" · ")
          : copy.entry(entry);
      return entry.id ? `${entry.id} ${label}` : label;
    }),
    copy.title,
    copy.history,
    ...(entries.some(({ entryKind }) => entryKind === "log") ? [] : [copy.empty]),
  ];
}
