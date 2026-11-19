import { clockLine, durationLine, emptyLine, timerLabels, type IconName } from "../../../catalog";

export const babyLabels = {
  feed_left: "Feed left",
  feed_right: "Feed right",
  bottle: "Bottle",
  nappy: "Nappy",
  sleep: "Sleep",
  none: "None running",
} as const;

type Kind = Exclude<keyof typeof babyLabels, "none">;
export const babyIcons = {
  feed_left: "heart",
  feed_right: "heart",
  bottle: "drop",
  nappy: "baby",
  sleep: "moon",
} as const satisfies Record<Kind, IconName>;

export const babyLogTitle = "Today’s log";
export const babyEmptyLog = emptyLine("entry");
export const babyRunningLine = (kind: Kind | "none") =>
  kind === "none" ? babyLabels.none : `${babyLabels[kind]} running`;
export const babyClock = clockLine(0);
export const babyLastLine = (time?: string) => (time ? `Last ${time}` : "—");

type Tile = { id?: string; kind: Kind; entryKind: "tile"; active: boolean; last?: string | undefined };
type Entry = {
  id?: string;
  kind: Kind;
  entryKind: "log";
  time: string;
  minutes?: number | undefined;
  amount?: string | undefined;
};

export const babyTileAction = (active: boolean) => timerLabels[active ? "stop" : "start"];

export const babyCopy = {
  clock: babyClock,
  duration: durationLine,
  empty: babyEmptyLog,
  entry: babyEntryLine,
  icons: babyIcons,
  last: babyLastLine,
  title: babyLogTitle,
  running: babyRunningLine,
  action: babyTileAction,
} as const;

export function babyEntryLine(entry: Entry) {
  return [
    babyLabels[entry.kind],
    entry.time,
    entry.minutes === undefined ? undefined : durationLine(entry.minutes),
    entry.amount,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function babyRead({ running, entries }: { running: Kind | "none"; entries: (Tile | Entry)[] }) {
  return [
    babyRunningLine(running),
    ...(running === "none" ? [] : [babyClock]),
    ...entries.map((entry) => {
      const label =
        entry.entryKind === "tile"
          ? [babyLabels[entry.kind], babyTileAction(entry.active), babyLastLine(entry.last)].join(" · ")
          : babyEntryLine(entry);
      return entry.id ? `${entry.id} ${label}` : label;
    }),
    babyLogTitle,
    ...(entries.some(({ entryKind }) => entryKind === "log") ? [] : [babyEmptyLog]),
  ];
}
