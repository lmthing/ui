import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Calendar/week shows dates, not opponents, venues and results or a full next-match card.
export const meta = {
  id: "Fixtures",
  status: "draft",
  group: "data",
  purpose: "See who we play next and how recent matches ended.",
  pick: "A team’s fixture schedule and results: opponents, venues and home or away, or one next-match card with meet time and kit. Not dates alone (Calendar), live scoring (Scoreboard), an appointment (Appointment) or a community event (EventCard).",
  writeHints: [
    "Order matches by date and kickoff time. In next style put the next match first. Supply both scores for a result, or neither for an unplayed match.",
    'To hide venue, meet time and kit, use detail "brief"; keep the values in the data. Write density: null unless the person asks to change spacing.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "The captain enters fixtures on one phone; teammates following them need a shared app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["venue", "meet", "kit"] } },
  parts: ["root"],
  items: {
    key: "matches",
    parts: ["root", "date", "time", "opponent", "badge", "side", "venue", "score", "result", "meet", "kit"],
    visibleWhen: { visible: true },
  },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang): string[] => {
    const { matches } = input as z.output<typeof props>;
    return matches.flatMap(({ date, time, us, them }) => [
      c.appointmentDate(date, lang),
      c.timeOfDayLine(time, lang),
      ...(us === undefined || them === undefined
        ? []
        : [`${c.numberLine(us, lang)}–${c.numberLine(them, lang)}`]),
    ]);
  },
} as const satisfies c.Meta;

const match = z.strictObject({
  date: c.isoDate,
  time: c.clock,
  opponent: c.text(24),
  home: z.boolean(),
  venue: c.text(28).optional(),
  us: z.int().nonnegative().optional(),
  them: z.int().nonnegative().optional(),
  meet: c.clock.optional(),
  kit: c.text(16).optional(),
  goto: c.screenId,
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    matches: z.array(match).min(1).max(6),
    style: z.enum(["list", "next"]).default("list"),
  })
  .refine(({ matches }) => matches.every(({ us, them }) => (us === undefined) === (them === undefined)), {
    path: ["matches"],
  })
  .overwrite((input) => ({
    ...input,
    matches: input.matches.map((row, index) => ({
      ...row,
      ...(input.detail === "brief" || input.style === "list" ? { meet: undefined, kit: undefined } : {}),
      ...(input.detail === "brief" ? { venue: undefined } : {}),
      visible: input.style === "list" || index === 0,
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const opponents = c
    .itemsOf(cast, 3)
    .map((item, index) => c.titleOf(item, 24, thing) || c.placeholderTitle(index, lang));
  return {
    matches: (opponents.length ? opponents : [c.placeholderTitle(0, lang)]).map((opponent) => ({
      date: "2026-11-22",
      time: "09:00",
      opponent,
      home: true,
      goto: "details",
    })),
  };
}

export const examples = [
  {
    matches: [
      {
        date: "2026-11-15",
        time: "10:00",
        opponent: "Fern House",
        home: false,
        us: 3,
        them: 1,
        goto: "fern_match",
      },
      {
        date: "2026-11-22",
        time: "10:00",
        opponent: "Garden Crew",
        home: true,
        venue: "Ledge Park",
        goto: "garden_match",
      },
    ],
  },
  {
    style: "next",
    density: "compact",
    matches: [
      {
        date: "2026-11-22",
        time: "10:00",
        opponent: "River Rovers",
        home: true,
        venue: "Trot Field",
        meet: "09:40",
        kit: "Blue shirts",
        goto: "river_match",
      },
    ],
  },
  {
    style: "next",
    detail: "brief",
    matches: [
      {
        date: "2026-11-29",
        time: "11:00",
        opponent: "North Rovers",
        home: false,
        venue: "West Field",
        meet: "10:40",
        kit: "White shirts",
        goto: "north_match",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Fixtures");
export const probes = [
  choose(
    "Show our club's last few football results and upcoming matches, with opponents and home or away grounds.",
  ),
  choose(
    "Show a month grid and mark which dates have training. No opponents, venues or match results.",
    "Calendar",
  ),
  write(
    "Show our next match at home against River Rovers on 2026-11-22 at 10:00. Meet at 09:40 at Trot Field, blue shirts, and link the match to river_match.",
  ),
  {
    ...write(
      "Show the next match against North Rovers on 2026-11-29 at 11:00 away, linked to north_match. Keep West Field, 10:40 meet and white shirts in the data but hide venue, meet and kit from the preview.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the away match against Fern House", { address: "f1/r1", action: "press" }),
] satisfies c.Probe[];
