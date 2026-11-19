import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Counter/default cannot store several players' numeric round cells and compute totals.
export const meta = {
  id: "ScoreSheet",
  status: "draft",
  group: "input",
  purpose: "Record players' round scores and compute totals, ranks and tied winners.",
  pick: "Editable numeric scores for several players across rounds. Not one running number (Counter), final ranking (List[ranked]), a live match (Scoreboard), or arbitrary records (Table).",
  writeHints: [
    "Each round's points has exactly one entry per player, in roster order: integer -999–999 or null for unplayed. Never write totals, ranks, winners or selected round.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { share: "people" },
  confirmParts: ["reset"],
  realPath: "Round scores are saved on the device; sharing publishes a versioned snapshot to a shared app.",
  items: { key: "cells", parts: ["root", "player", "round", "score"] },
  parts: ["root", "reset", "share"],
  states: ["filled", "empty", "loading", "success"],
  actions: {
    parts: { root: ["select"], reset: ["press"], share: ["press"] },
    items: { score: ["set"] },
    when: { share: { share: true } },
  },
  read: (input) => {
    const value = input as z.output<typeof props>;
    return value.rounds.flatMap((round) => [
      round.label,
      ...value.players.map((player, index) => `${player.name}: ${round.points[index] ?? "—"}`),
    ]);
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    players: z
      .array(z.strictObject({ name: text(24) }))
      .min(2)
      .max(6),
    rounds: z
      .array(
        z.strictObject({
          label: text(16),
          points: z.array(z.int().min(-999).max(999).nullable()).min(2).max(6),
        }),
      )
      .min(1)
      .max(12),
    wins: z.enum(["high", "low"]).default("high"),
    share: z.boolean().default(false),
    style: z.enum(["grid", "round"]).default("grid"),
  })
  .refine(({ players, rounds }) => rounds.every((round) => round.points.length === players.length), {
    path: ["rounds"],
    message: "Every round needs exactly one point entry per player",
  })
  .overwrite((value) => ({
    ...value,
    cells: value.rounds.flatMap((round) =>
      value.players.map((player, index) => ({
        player: player.name,
        round: round.label,
        score: round.points[index],
      })),
    ),
  }));

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const players = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 24, thing) ?? placeholderTitle(index),
  }));
  while (players.length < 2) players.push({ name: placeholderTitle(players.length) });
  return { players, rounds: [{ label: placeholderTitle(0), points: players.map(() => null) }] };
}
export const examples = [
  // Ledge's friends play a high-score game after tending the plants.
  {
    players: [{ name: "Anna" }, { name: "Ben" }, { name: "Sam" }],
    rounds: [
      { label: "Round one", points: [4, 2, 4] },
      { label: "Round two", points: [null, null, null] },
    ],
    style: "grid",
    share: true,
  },
  // Trot's walkers keep a low-score card-game round.
  {
    players: [{ name: "Jo" }, { name: "Lee" }],
    rounds: [{ label: "First hand", points: [-2, 5] }],
    wins: "low",
    style: "round",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ScoreSheet");
export const probes = [
  choose("Enter each of three players' points in every board-game round and compute their totals"),
  choose("One running score with plus and minus, without any round or player records", "Counter"),
  write(
    "Anna and Ben play two rounds: First has 4 and -2 points, Second has not been played. Higher total wins; no sharing.",
  ),
  read("Change Anna's score in round one", { address: "s1/r1/score", action: "set" }),
  read("Reset the round scores", { address: "s1/reset", action: "press" }),
] satisfies Probe[];
