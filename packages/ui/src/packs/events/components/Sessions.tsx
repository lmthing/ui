import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  chronologicalSessions,
  projectSessions,
  sessionCapacity,
  sessionEmpty,
  sessionLocation,
  sessionRange,
  sessionTrackChoices,
  sessionsReading,
} from "../copy";
import { eventsWordsFor } from "../lang";
import { seedTitles } from "../seeds";
import { prompt } from "../../../entry/prompt-Sessions.generated";

// Core first: Timeline/hours shows duration blocks but cannot filter event tracks, show capacity or bookmark talks.
export const meta = {
  id: "Sessions",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "The schedule and bookmarks live on the device; live capacity and agenda sync use a shared event app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["speaker"] } },
  parts: ["root", "track", "empty", "feedback"],
  items: {
    key: "sessions",
    parts: ["root", "time", "title", "room", "speaker", "capacity", "conflict", "save"],
    visibleWhen: { visible: true },
    toggles: { save: "saved" },
  },
  states: ["filled", "empty", "loading", "success"],
  actions: {
    parts: { track: ["select"] },
    items: { root: ["press"], save: ["toggle"] },
    when: { track: { style: "tracks" }, root: { linked: true } },
  },
  selections: { track: { prop: "activeTrack", choices: { prop: "trackChoices" }, runtime: true } },
  emptyActions: ["track.select"],
  successActions: ["track.select", "root.press", "save.toggle"],
  readSuccess: true,
  live: { derive: projectSessions },
  read: sessionsReading,
} as const satisfies c.Meta;

const track = c.text(16);
const session = z
  .strictObject({
    id: c.text(24).meta({ read: false }),
    title: c.text(32),
    track,
    start: c.clock,
    end: c.clock,
    room: c.text(20),
    speaker: c.text(24).optional(),
    booked: z.int().nonnegative().optional(),
    capacity: z.int().nonnegative().optional(),
    saved: z.boolean(),
    goto: c.screenId.optional(),
  })
  .refine(({ start, end }) => start < end, { path: ["end"], message: "End must be after start" })
  .refine(({ booked, capacity }) => booked === undefined || capacity === undefined || booked <= capacity, {
    path: ["booked"],
    message: "Bookings must fit the capacity",
  });

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    tracks: z.array(track).min(1).max(6),
    selectedTrack: track.optional(),
    sessions: z.array(session).min(1).max(24),
    style: z.enum(["tracks", "mine"]).default("tracks"),
  })
  .refine(({ tracks }) => new Set(tracks).size === tracks.length, {
    path: ["tracks"],
    message: "Use distinct track labels",
  })
  .refine(({ tracks, selectedTrack }) => selectedTrack === undefined || tracks.includes(selectedTrack), {
    path: ["selectedTrack"],
    message: "Select a listed track",
  })
  .refine(({ tracks, sessions }) => sessions.every((row) => tracks.includes(row.track)), {
    path: ["sessions"],
    message: "Each session needs a listed track",
  })
  .refine(({ sessions }) => new Set(sessions.map(({ id }) => id)).size === sessions.length, {
    path: ["sessions"],
    message: "Use distinct session ids",
  });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const track = c.clip(c.placeholderTitle(0, input.lang), 16);
  return {
    tracks: [track],
    sessions: seedTitles(input, 32, 1).map((title, index) => ({
      id: `session_${index + 1}`,
      title,
      track,
      start: "09:00",
      end: "09:30",
      room: c.clip(c.placeholderTitle(1, input.lang), 20),
      saved: false,
    })),
  };
}

// prettier-ignore
export const examples = [
  {
    tracks: ["Main stage", "Workshops"],
    sessions: [
      { id: "welcome", title: "Opening keynote", track: "Main stage", start: "09:00", end: "09:45", room: "Harbour Hall", speaker: "Ruth Shah", saved: false, goto: "keynote" },
      { id: "studio", title: "Design by hand", track: "Workshops", start: "09:30", end: "10:15", room: "North Studio", speaker: "Imani Cole", capacity: 18, booked: 14, saved: true },
      { id: "panel", title: "Ask the makers", track: "Main stage", start: "10:30", end: "11:15", room: "Harbour Hall", capacity: 60, booked: 60, saved: false },
    ],
  },
  {
    style: "mine", selectedTrack: "Talks",
    tracks: ["Talks", "Demos"],
    sessions: [
      { id: "lighting", title: "Lighting on location", track: "Talks", start: "13:00", end: "13:45", room: "Elm Room", speaker: "Hugo Wells", saved: true },
      { id: "editing", title: "Editing live", track: "Demos", start: "13:30", end: "14:00", room: "Studio 2", saved: true },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Sessions");
export const probes = [
  choose(
    "Show our festival's sessions in time order by stage, how many seats are left, and let me bookmark the talks for my own agenda.",
  ),
  choose(
    "Show the start and finish times for three activities on one day's hour rail, with gaps between them.",
    "Timeline",
  ),
  write(
    "List the Design Fair tracks Main stage and Workshops. Opening keynote is 09:00–09:45 in Harbour Hall with Ruth Shah, not saved. Design by hand is 09:30–10:15 in North Studio with Imani Cole, 14 of 18 seats booked, saved. Show all tracks.",
  ),
  {
    ...write(
      "Show the Talks track with Lighting on location, 13:00–13:45 in Elm Room, speaker Hugo Wells, not saved. Keep the speaker in the data but hide the speaker name in the list. Leave spacing and card surface unset.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Filter the schedule to Workshops.", { address: "s1/track", action: "select" }),
  read("Bookmark Opening keynote without opening it.", { address: "s1/r1/save", action: "toggle" }),
  read("Open the Opening keynote details.", { address: "s1/r1", action: "press" }),
] satisfies c.Probe[];

type SessionsProps = c.Props<typeof props, typeof meta>;
type SessionRow = ReturnType<typeof projectSessions>["sessions"][number];
type Density = c.ThemeDensity;

function TrackFilter({
  tracks,
  active,
  loading,
}: Pick<SessionsProps, "tracks"> & { active: unknown; loading: boolean }) {
  const { lang, words } = kit.useWords(eventsWordsFor);
  return (
    <kit.KitTrack part="track" role="radiogroup" {...(loading ? {} : { label: words.sessions.track })}>
      {sessionTrackChoices(tracks, lang).map(({ value, label }) => (
        <kit.KitChip
          key={value}
          item={null}
          role="radio"
          look="box"
          value={value}
          label={label}
          on={active === value}
          {...(loading ? { disabled: true, part: null } : {})}
        />
      ))}
    </kit.KitTrack>
  );
}

function SessionDetails({ row, density }: { row: SessionRow; density: Density }) {
  const { lang, words } = kit.useWords(eventsWordsFor);
  const capacity = sessionCapacity(row, lang);
  const details = (
    <kit.KitMetaLine
      density={density}
      title={{ part: "time", role: "figure", compact: true, tabular: true, text: sessionRange(row, lang) }}
      meta={[
        { part: "room", text: sessionLocation(row, lang) },
        { part: "speaker", text: row.speaker },
        { part: "conflict", text: row.conflict ? words.sessions.conflict : undefined, tone: "warn" },
      ]}
    />
  );
  return capacity ? (
    <kit.KitGrid fitLast density={density}>
      {details}
      <kit.KitTrail
        kind="badge"
        value={capacity}
        part="capacity"
        tone={capacity === words.sessions.full ? "warn" : "muted"}
        density={density}
      />
    </kit.KitGrid>
  ) : (
    details
  );
}

function SaveSession({ row }: { row: SessionRow }) {
  const { words } = kit.useWords(eventsWordsFor);
  return (
    <kit.KitAction
      part="save"
      action="toggle"
      contentParts={{}}
      icon={row.saved ? "check" : "bookmark"}
      kind={row.saved ? "secondary" : "quiet"}
      a11y={row.saved ? words.sessions.unsave(row.title) : words.sessions.save(row.title)}
    />
  );
}

function ScheduleRow({ row, density }: { row: SessionRow; density: Density }) {
  const loading = kit.useComponentState() === "loading";
  return (
    <kit.KitRow item={row.id} part={null} inset="none" density={density} label={row.title}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitRow
          part={loading ? null : "root"}
          inset="none"
          inline
          density={density}
          label={row.title}
          goto={loading ? undefined : row.goto}
          trailing={row.goto && <kit.KitIcon name="chevron_right" decorative loading={loading} />}
        >
          <kit.KitLayoutText line={{ part: "title", text: row.title, strong: true }} density={density} />
        </kit.KitRow>
        <SaveSession row={row} />
      </kit.KitGrid>
      <SessionDetails row={row} density={density} />
    </kit.KitRow>
  );
}

export function Sessions(input: SessionsProps) {
  const state = kit.useComponentState();
  const live = kit.useLiveControls(meta, input);
  const { lang, words } = kit.useWords(eventsWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const rows = chronologicalSessions(c.visibleItems<SessionRow>(meta, live));
  const mine = input.style === "mine";
  const empty = sessionEmpty(mine, lang);
  const agenda = (
    <kit.KitContent density={density} rhythm="flush">
      {mine && <kit.KitHeader title={{ text: words.sessions.agenda }} density={density} />}
      {rows.length ? (
        <kit.KitRowGroup density={density}>
          {rows.map((row) => (
            <ScheduleRow key={row.id} {...{ row, density }} />
          ))}
        </kit.KitRowGroup>
      ) : (
        state !== "loading" && (
          <kit.KitEmpty
            part="empty"
            title={empty}
            icon={mine ? "bookmark" : "clock"}
            prominence="body"
            density={density}
            decorativeIcon
          />
        )
      )}
    </kit.KitContent>
  );
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {!mine && <TrackFilter tracks={input.tracks} active={live.activeTrack} loading={state === "loading"} />}
      <kit.KitState
        loading={rows.length ? agenda : undefined}
        retain
        density={density}
        part={state === "empty" ? "empty" : "feedback"}
        message={state === "empty" ? empty : state === "success" ? words.sessions.updated : undefined}
        icon={state === "empty" ? (mine ? "bookmark" : "clock") : undefined}
      >
        {agenda}
      </kit.KitState>
    </kit.KitCard>
  );
}
