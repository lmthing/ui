import { z } from "zod";
import * as c from "../../../catalog";
import { scoreboardRecord } from "../match-runtime";

const status = ["upcoming", "live", "break", "final"] as const;
const modes = ["display", "keeper"] as const;
const number = z.int().nonnegative();

// Core first: Counter/count adjusts one value, not two sides with a shared match clock and status.
export const meta = {
  id: "Scoreboard",
  status: "draft",
  group: "data",
  purpose: "Follow the current score or keep score for both sides.",
  pick: "The score and match clock for one contest between a home side and an away side. Not a practice result (Result), one adjustable count (Counter) or a standalone clock (Timer).",
  writeHints: [
    'Use style "keeper" only when a scorekeeper must change scores or operate the clock. Use "display" for following the match. On a screen with MatchFeed, each score must equal its side’s seeded goal count.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { root: "people" },
  realPath: "One phone keeps the score; following it live elsewhere needs a shared app.",
  variants: { density: ["comfortable", "compact"], emphasis: ["normal", "quiet"] },
  parts: ["root", "home", "away", "home_score", "away_score", "clock", "period", "status"],
  states: ["filled", "loading"],
  signature: "count_up",
  actions: {
    parts: { home: ["increment", "decrement"], away: ["increment", "decrement"], clock: ["start", "stop"] },
    when: { home: { style: "keeper" }, away: { style: "keeper" }, clock: { style: "keeper" } },
  },
  confirmParts: ["home", "away"],
  ...scoreboardRecord,
  clocks: [
    {
      id: "match_clock",
      kind: "up",
      prop: "elapsed",
      start: { part: "clock", action: "start" },
      stop: { part: "clock", action: "stop" },
    },
  ],
  read: (input, _state, lang): string[] => {
    const { home, away, homeScore, awayScore, status, elapsed } = input as z.output<typeof props> & {
      elapsed?: number;
    };
    return [
      `${home} ${c.numberLine(homeScore, lang)}–${c.numberLine(awayScore, lang)} ${away}`,
      status,
      c.clockLine(elapsed ?? 0, lang),
    ];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  home: c.text(20),
  away: c.text(20),
  homeScore: number,
  awayScore: number,
  period: c.text(12).optional(),
  status: z.enum(status),
  style: z.enum(modes).default("display"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const teams = c.itemsOf(cast, 2);
  const label = (index: number) =>
    (teams[index] && c.titleOf(teams[index], 20, thing)) || c.placeholderTitle(index, lang);
  return { home: label(0), away: label(1), homeScore: 0, awayScore: 0, status: "upcoming" };
}

export const examples = [
  {
    home: "Ledge Rovers",
    away: "Fern House",
    homeScore: 2,
    awayScore: 1,
    period: "Second half",
    status: "live",
    style: "keeper",
  },
  {
    home: "Trot Town",
    away: "River Rovers",
    homeScore: 3,
    awayScore: 3,
    status: "final",
    density: "compact",
    emphasis: "quiet",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Scoreboard");
export const probes = [
  choose(
    "Show the live football score for both sides with the match period and let the scorekeeper adjust either side.",
  ),
  choose(
    "Give me one big tally of laps, with plus and minus to change it. There is only a single count.",
    "Counter",
  ),
  write(
    "Keep the live score of Trot Town 2, River Rovers 1 in the second half, with controls to add or undo a point for either side and start or stop the match clock.",
  ),
  read("Add a goal for Ledge Rovers, the home side", { address: "s1/home", action: "increment" }),
  read("Undo one goal for the away side", { address: "s1/away", action: "decrement" }),
  read("Start, not stop, the match clock", { address: "s1/clock", action: "start" }),
] satisfies c.Probe[];
