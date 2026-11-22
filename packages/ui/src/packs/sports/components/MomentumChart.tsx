import { z } from "zod";
import * as c from "../../../catalog";
import { momentumReading } from "../copy";

// Core first: Sparkline/default shows a quick personal trend, not an even-split axis or selectable match events.
export const meta = {
  id: "MomentumChart",
  status: "draft",
  group: "data",
  purpose: "See which team held the advantage and when the match turned.",
  pick: "How momentum or win probability shifted during one match, with match-clock events. Not team totals (MatchStats), a tiny personal trend (Sparkline), or a business trend (LineChart).",
  writeHints: [
    "Use chronological match order and unique point ids. Win probability is 0–100 with 50 even; momentum is -100–100 with 0 even and positive values favoring home.",
    'Use detail "brief" only to hide event callouts; keep the supplied events. Leave other axes null unless requested.',
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath:
    "Sports analytics services stream win probability and momentum observations over the match clock.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["root", "event"] } },
  parts: ["root", "plot", "event"],
  items: { key: "samples", parts: ["root"], visibleWhen: { inspectable: true } },
  states: ["filled", "empty", "loading"],
  select: { prop: "selectedPoint", value: { field: "ref" } },
  actions: { items: { root: ["select"] }, when: { root: { inspectable: true } } },
  read: (input, state, lang): string[] =>
    state === "filled" ? momentumReading(input as Parameters<typeof momentumReading>[0], lang) : [],
} as const satisfies c.Meta;

const point = z.strictObject({
  id: c.text(12),
  clock: c.text(12),
  value: z.number().min(-100).max(100),
  event: c.text(40).optional(),
});

const schema = z
  .strictObject({
    ...c.variantProps(meta.variants),
    home: c.text(20),
    away: c.text(20),
    mode: z.enum(["win_prob", "momentum"]).default("win_prob"),
    points: z.array(point).min(6).max(60),
  })
  .refine(({ mode, points }) => mode === "momentum" || points.every(({ value }) => value >= 0), {
    path: ["points"],
    message: "Win probability is between 0 and 100",
  })
  .refine(({ points }) => new Set(points.map(({ id }) => id)).size === points.length, {
    path: ["points"],
    message: "Point ids must be unique",
  });

function withSamples(input: z.output<typeof schema>) {
  return {
    ...input,
    samples: input.points.map(({ id: ref, ...row }) => ({
      ...row,
      ref,
      inspectable: input.detail === "full" && !!row.event,
    })),
  };
}

export const props = schema.overwrite(withSamples) as typeof schema &
  z.ZodType<ReturnType<typeof withSamples>, z.input<typeof schema>>;

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 2);
  const name = (index: number) =>
    (items[index] && c.titleOf(items[index], 20, thing)) || c.clip(c.placeholderTitle(index, lang), 20);
  return {
    home: name(0),
    away: name(1),
    points: Array.from({ length: 6 }, (_, index) => ({
      id: String(index + 1),
      clock: c.clip(c.placeholderTitle(index, lang), 12),
      value: 50,
    })),
  };
}

export const examples = [
  {
    home: "Ledge Lions",
    away: "Fern House",
    points: [
      { id: "kickoff", clock: "0′", value: 50 },
      { id: "early", clock: "12′", value: 54 },
      { id: "lead", clock: "24′", value: 73, event: "Amara opens the scoring" },
      { id: "level", clock: "42′", value: 46, event: "Fern House equalizes" },
      { id: "pressure", clock: "64′", value: 63 },
      { id: "late", clock: "84′", value: 82, event: "Reed scores for Ledge" },
    ],
  },
  {
    home: "Trot Town",
    away: "Canal Club",
    mode: "momentum",
    density: "compact",
    detail: "brief",
    points: [
      { id: "kickoff", clock: "0′", value: 0 },
      { id: "start", clock: "10′", value: -23 },
      { id: "chance", clock: "26′", value: -58, event: "Canal hits the post" },
      { id: "restart", clock: "46′", value: 12 },
      { id: "turn", clock: "62′", value: 60, event: "Trot wins a corner" },
      { id: "end", clock: "90′", value: 19 },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("MomentumChart");
export const probes = [
  choose(
    "Show how the home team's win probability rose and fell throughout this match, with the goals marked where they changed it.",
  ),
  choose(
    "Put a tiny unlabelled trend under today's total walks. No axes, time labels, teams or events.",
    "Sparkline",
  ),
  write(
    "Plot Lions vs Fern win probability at 0, 10, 20, 35, 55 and 75 minutes: 50%, 52%, 65%, 48%, 62% and 80%. Lions opened the scoring at 20 and Fern equalized at 35; mark both goals.",
  ),
  {
    ...write(
      "Show Lions vs Fern attack momentum at 0, 10, 20, 35, 55 and 75 minutes: 0, -12, 30, -8, 12 and 48. Keep the event note that Lions scored at 20 but hide the event callout and marker controls.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Inspect the point where Fern House equalizes at 42 minutes.", { address: "c1/r4", action: "select" }),
] satisfies c.Probe[];

export function MomentumChart(_input: c.Props<typeof props, typeof meta>) {
  return null;
}
