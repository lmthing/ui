import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { matchFeedReading, matchMinute } from "../copy";
import { sportsWordsFor } from "../lang";
import { goalEvents } from "../match-record";
import { matchFeedRecord } from "../match-runtime";

// Core first: Timeline/history shows one stream of past events, not two sides' match incidents.
export const meta = {
  id: "MatchFeed",
  status: "ready",
  group: "data",
  purpose: "See each side's match incidents and record a new one.",
  pick: "Home and away incidents within one match by minute: goals, cards, substitutions and notes. Not a one-sided history or daily plan (Timeline) or community posts (Feed).",
  writeHints: [
    "Write one event per incident, newest minute first. On a screen with Scoreboard, include exactly one goal event for each seeded goal and match the side.",
    'For an ordinary feed, write "density":null, "surface":null, and "detail":null. Set "detail":"brief" only on an explicit request to hide the written event-type labels; keep the kind to draw its icon. Leave density and surface null unless separately requested.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "Incidents are added on the scorekeeper's phone; following them live needs a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["kind_label"] } },
  parts: ["root", "title", "empty", "add", "add_icon", "add_label"],
  items: { key: "events", parts: ["root", "minute", "side", "kind", "kind_label", "text"] },
  states: ["filled", "empty"],
  actions: { parts: { add: ["press"] } },
  emptyActions: ["add.press"],
  live: { derive: () => ({ add: { goto: "sheet" } }) },
  ...matchFeedRecord,
  read: (input, _state, lang): string[] => {
    const { matchFeed } = sportsWordsFor(lang);
    return [
      matchFeed.title,
      matchFeed.add,
      ...matchFeedReading((input as z.output<typeof props>).events, lang),
    ];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  events: goalEvents,
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const events = c.itemsOf(cast, 3).map((item, index) => ({
    minute: 0,
    side: "home" as const,
    kind: "note" as const,
    text: c.titleOf(item, 36, thing) || c.placeholderTitle(index, lang),
  }));
  return {
    events: events.length
      ? events
      : [{ minute: 0, side: "home", kind: "note", text: c.placeholderTitle(0, lang) }],
  };
}

export const examples = [
  {
    events: [
      { minute: 48, side: "home", kind: "goal", text: "Reed scores from the edge" },
      { minute: 32, side: "away", kind: "card_yellow", text: "Birch booked" },
      { minute: 15, side: "home", kind: "sub", text: "Moss is on, Gardner off" },
      { minute: 7, side: "away", kind: "note", text: "Pike hits the near post" },
    ],
  },
  {
    density: "compact",
    events: [
      { minute: 57, side: "away", kind: "card_red", text: "Banks sent off" },
      { minute: 30, side: "away", kind: "goal", text: "Rivers heads in" },
      { minute: 18, side: "home", kind: "goal", text: "Field taps in" },
      { minute: 0, side: "home", kind: "note", text: "Trot kick off" },
    ],
  },
  {
    surface: "plain",
    events: [
      { minute: 61, side: "away", kind: "sub", text: "Pike is on, Banks off" },
      { minute: 44, side: "home", kind: "goal", text: "Green finishes a low cross" },
      { minute: 23, side: "home", kind: "note", text: "Moss off bar" },
      { minute: 9, side: "away", kind: "goal", text: "Birch heads in" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("MatchFeed");
export const probes = [
  choose(
    "Who scored, got booked or was substituted in this football match? Put each incident on its team's side, with the minute.",
  ),
  choose(
    "Show my past training sessions in one vertical chronological history with dates, one team only and no in-match incidents.",
    "Timeline",
  ),
  write("Show home Reed's goal at minute 48 and an away yellow card for Birch at minute 32, newest first."),
  {
    ...write(
      "Show home Reed's goal at minute 48 and an away yellow card for Birch at minute 32. Keep their event-type icons, but don't write out the event-type labels on the screen. Don't change the spacing or card treatment.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Press Add event to open the picker for a new match incident.", {
    address: "m1/add",
    action: "press",
  }),
] satisfies c.Probe[];

type MatchFeedProps = c.Props<typeof props, typeof meta>;
type Incident = MatchFeedProps["events"][number];
const kindIcons = {
  goal: { name: "target", tone: "good" },
  card_yellow: { name: "alert", tone: "warn" },
  card_red: { name: "square", tone: "bad" },
  sub: { name: "undo", tone: "muted" },
  note: { name: "file_text", tone: "muted" },
} as const;

// prettier-ignore
function IncidentRow({ event, density, detail }: {
  event: Incident; density: c.ThemeDensity; detail: c.AxisValue<"detail">;
}) {
  const { lang, words: { matchFeed } } = kit.useWords(sportsWordsFor);
  const { id, minute, side, kind, text } = event;
  const readableMinute = matchMinute(minute, lang);
  const description = (
    <kit.KitContent density={density}>
      <kit.KitText part="text" density={density}>{text}</kit.KitText>
      <kit.KitText part="side" role="label" tone="muted" density={density}>{matchFeed.sides[side]}</kit.KitText>
    </kit.KitContent>
  );
  return (
    <kit.KitRow item={id} label={matchFeed.event(readableMinute, matchFeed.sides[side], matchFeed.kinds[kind], text)}
      inline density={density}>
      <kit.KitGrid columns={3} density={density}>
        {side === "home" ? description : <></>}
        <kit.KitContent align="center" density={density}>
          <kit.KitText part="minute" role="number" numberScale="compact" tone="muted" tabular align="center"
            lines={1} density={density}>{readableMinute}</kit.KitText>
          <kit.KitIcon part="kind" scale="sm" {...kindIcons[kind]} />
          {detail === "full" && <kit.KitText part="kind_label" align="center" role="label" tone="muted"
            density={density}>{matchFeed.kinds[kind]}</kit.KitText>}
        </kit.KitContent>
        {side === "away" ? description : <></>}
      </kit.KitGrid>
    </kit.KitRow>
  );
}

export function MatchFeed(seed: MatchFeedProps) {
  const input = kit.useLiveControls(meta, seed) as MatchFeedProps & { state?: c.StateName };
  const {
    words: { matchFeed },
  } = kit.useWords(sportsWordsFor);
  const state = kit.useComponentState();
  const empty = (input.state ?? state) === "empty";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitText part="title" role="heading" density={density}>
        {matchFeed.title}
      </kit.KitText>
      {empty ? (
        <kit.KitEmpty part="empty" icon="clock" decorativeIcon />
      ) : (
        <kit.KitGrid arrange="rows" density={density} list listRowGap="cards">
          {input.events.map((event) => (
            <IncidentRow key={event.id} {...{ event, density, detail }} />
          ))}
        </kit.KitGrid>
      )}
      <kit.KitAction part="add" action="press" icon="plus" label={matchFeed.add} kind="secondary" full />
    </kit.KitCard>
  );
}
