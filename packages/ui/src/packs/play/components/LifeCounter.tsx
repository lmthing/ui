import { z } from "zod";
import * as c from "../../../catalog";
import { lifeCounterLines } from "../copy";

// Core first: Counter/default supports one fixed-step total, not opposing seats with separate resources.
export const meta = {
  id: "LifeCounter",
  status: "draft",
  group: "input",
  purpose: "Track each player's live total and resource counters around a shared table.",
  pick: "Live life or point totals and resource counters for multiple tabletop players. Not one isolated number (Counter), round history (ScoreSheet), or a sports match (Scoreboard).",
  writeHints: ["Write starting totals and counter seeds, not net changes or match results."],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "One device keeps each seat's live totals and resources for the current match.",
  parts: ["root", "reset"],
  states: ["filled", "loading", "success"],
  items: { key: "players", parts: ["root", "name", "life", "counter"] },
  actions: {
    parts: { reset: ["press"] },
    items: { life: ["increment", "decrement"], counter: ["increment", "decrement"] },
  },
  confirmParts: ["reset"],
  successActions: ["reset.press"],
  read: (input, state, lang) =>
    state === "loading" ? [] : lifeCounterLines(input as z.output<typeof props>, lang),
} as const satisfies c.Meta;

export const props = z.strictObject({
  startingLife: z.int().min(1).max(999).default(20),
  players: z
    .array(
      z.strictObject({
        name: c.text(16),
        life: z.int().min(-999).max(9999).optional(),
        swatch: c.swatch.optional(),
        counters: z
          .array(z.strictObject({ label: c.text(12), value: z.int().min(0).max(99) }))
          .min(0)
          .max(3)
          .default([]),
      }),
    )
    .min(2)
    .max(6),
  flipTop: z.boolean().default(true),
  style: z.enum(["table", "stack"]).default("table"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const players = c.itemsOf(cast, 2).map((item, i) => ({
    name: c.titleOf(item, 16, thing) ?? c.placeholderTitle(i, lang),
  }));
  while (players.length < 2) players.push({ name: c.placeholderTitle(players.length, lang) });
  return { players };
}

export const examples = [
  {
    players: [
      { name: "Fern", swatch: "green", counters: [{ label: "Water", value: 3 }] },
      { name: "Pothos", life: 18 },
    ],
    style: "table",
  },
  {
    players: [{ name: "Clover" }, { name: "Juniper" }, { name: "Otis" }],
    startingLife: 30,
    flipTop: false,
    style: "stack",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("LifeCounter");
export const probes = [
  choose(
    "At a shared tabletop game, give each player quick life adjustments and their own resource counters.",
  ),
  choose("Let me add or remove one point from one running score.", "Counter"),
  write(
    "Track two players, Fern and Pothos, at 20 life each on a phone between them. Fern starts with three Water counters.",
  ),
  read("Restore the starting totals for everyone", { address: "l1/reset", action: "press" }),
] satisfies c.Probe[];
