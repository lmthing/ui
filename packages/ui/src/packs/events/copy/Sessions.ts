import { numberLine, timeOfDayLine, type StateName } from "../../../catalog";
import { eventsWordsFor } from "../lang";

type Row = {
  id: string;
  title: string;
  track: string;
  start: string;
  end: string;
  room: string;
  speaker?: string;
  booked?: number;
  capacity?: number;
  saved: boolean;
  goto?: string;
};

type Schedule = {
  style?: "tracks" | "mine";
  detail?: "full" | "brief";
  tracks: readonly string[];
  selectedTrack?: string;
  activeTrack?: string;
  sessions: readonly Row[];
};

const allTracks = "all";
const trackValue = (track: string) => `track:${track}`;

export function sessionTrackChoices(tracks: readonly string[], lang?: string) {
  const words = eventsWordsFor(lang).sessions;
  return [
    { value: allTracks, label: words.allTracks },
    ...tracks.map((label) => ({
      value: trackValue(label),
      label: label === words.allTracks ? words.namedTrack(label) : label,
    })),
  ];
}

const overlaps = (a: Row, b: Row) => a.start < b.end && b.start < a.end;

export function projectSessions(input: Readonly<Record<string, unknown>>) {
  const { tracks, sessions, selectedTrack, activeTrack, style, detail } = input as Schedule;
  const filter = activeTrack ?? (selectedTrack === undefined ? allTracks : trackValue(selectedTrack));
  const mine = style === "mine";
  const saved = mine ? sessions.filter((row) => row.saved) : [];
  return {
    activeTrack: filter,
    trackChoices: sessionTrackChoices(tracks),
    sessions: sessions.map((row) => ({
      ...row,
      speaker: detail === "brief" ? undefined : row.speaker,
      linked: row.goto !== undefined,
      save: { value: row.saved ? "on" : "off" },
      visible: mine ? row.saved : filter === allTracks || filter === trackValue(row.track),
      conflict: mine && row.saved && saved.some((other) => other !== row && overlaps(row, other)),
    })),
  };
}

export function sessionCapacity(row: Pick<Row, "booked" | "capacity">, lang?: string) {
  const words = eventsWordsFor(lang).sessions;
  if (row.capacity === undefined) return undefined;
  if (row.booked === undefined && row.capacity !== 0) return words.capacity(numberLine(row.capacity, lang));
  const remaining = row.capacity - (row.booked ?? 0);
  return remaining <= 0 ? words.full : words.remaining(numberLine(remaining, lang));
}

export function sessionsReading(input: unknown, state: StateName, lang?: string) {
  if (state !== "filled" && state !== "success") return [];
  const { style, tracks, sessions } = input as Omit<Schedule, "sessions"> & {
    sessions: (Row & { visible: boolean; conflict: boolean })[];
  };
  const words = eventsWordsFor(lang).sessions;
  return [
    ...(state === "success" ? [words.updated] : []),
    ...(style === "mine"
      ? [words.agenda]
      : [words.track, ...sessionTrackChoices(tracks, lang).map(({ label }) => label)]),
    ...sessions
      .filter(({ visible }) => visible)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((row) =>
        words.line([
          row.id,
          words.range(timeOfDayLine(row.start, lang), timeOfDayLine(row.end, lang)),
          row.title,
          row.track,
          row.room,
          row.speaker,
          sessionCapacity(row, lang),
          row.conflict ? words.conflict : undefined,
        ]),
      ),
  ];
}
