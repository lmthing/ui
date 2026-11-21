import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Timeline/history shows one stream of past events, not two sides' match incidents.
export const meta = {
  id: "MatchFeed",
  status: "draft",
  group: "data",
  purpose: "See each side's match incidents and record a new one.",
  pick: "Home and away incidents within one match by minute: goals, cards, substitutions and notes. Not a one-sided history or daily plan (Timeline) or community posts (Feed).",
  writeHints: [
    "Write one event per incident, newest minute first. On a screen with Scoreboard, include exactly one goal event for each seeded goal and match the side.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "Incidents are added on the scorekeeper's phone; following them live needs a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "add"],
  items: { key: "events", parts: ["root", "minute", "side", "kind", "text"] },
  states: ["filled", "empty"],
  actions: { parts: { add: ["press"] } },
  emptyActions: ["add.press"],
  read: (input, _state, lang): string[] => {
    const { events } = input as z.output<typeof props>;
    return events.map(
      ({ minute, side, kind, text }) =>
        `${c.numberLine(minute, lang)}′ ${side} ${kind.replaceAll("_", " ")}: ${text}`,
    );
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  events: z
    .array(
      z.strictObject({
        minute: z.int().min(0).max(130),
        side: z.enum(["home", "away"]),
        kind: z.enum(["goal", "card_yellow", "card_red", "sub", "note"]),
        text: c.text(36),
      }),
    )
    .min(1)
    .max(12),
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
      { minute: 32, side: "away", kind: "card_yellow", text: "Caution for Birch" },
      { minute: 15, side: "home", kind: "sub", text: "Moss replaces Gardner" },
    ],
  },
  {
    density: "compact",
    surface: "plain",
    events: [
      { minute: 57, side: "away", kind: "card_red", text: "Banks sent off" },
      { minute: 30, side: "away", kind: "goal", text: "Rivers heads in" },
      { minute: 0, side: "home", kind: "note", text: "Trot Town kick off" },
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
  read("Open the picker to add a new match incident", { address: "m1/add", action: "press" }),
] satisfies c.Probe[];
