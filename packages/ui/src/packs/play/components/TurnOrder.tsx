import { z } from "zod";
import {
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: People/default cannot track a game turn cursor, laps, skips or reversed direction.
export const meta = {
  id: "TurnOrder",
  status: "draft",
  group: "data",
  purpose: "Track the current game player, lap and direction with next, skip and reverse.",
  pick: "Game turns, laps and play direction. Not a plain roster (People), scheduled events (Timeline), or rotating household duties (Turns).",
  writeHints: [
    "first is a zero-based index into players. Optional laps bounds the game; omit it for open-ended rotation. Never write current player, lap, completed turns or skips.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  confirmParts: ["restart"],
  realPath: "An ordered roster and turn events live on one device without accounts or remote replies.",
  items: { key: "players", parts: ["root", "name", "photo"] },
  parts: ["root", "current", "lap", "next", "skip", "reverse", "restart"],
  states: ["filled", "loading", "success"],
  actions: { parts: { next: ["press"], skip: ["press"], reverse: ["press"], restart: ["press"] } },
  read: (input) => {
    const value = input as z.output<typeof props>;
    return [value.players[value.first]!.name, value.direction];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    players: z
      .array(z.strictObject({ name: text(24), photo: photo.optional() }))
      .min(2)
      .max(6),
    first: z.int().min(0).max(5).default(0),
    direction: z.enum(["forward", "reverse"]).default("forward"),
    laps: z.int().min(1).max(12).optional(),
    style: z.enum(["ring", "queue"]).default("ring"),
  })
  .refine(({ players, first }) => first < players.length, {
    path: ["first"],
    message: "First must index an existing player",
  });
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const players = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 24, thing) ?? placeholderTitle(index),
  }));
  while (players.length < 2) players.push({ name: placeholderTitle(players.length) });
  return { players };
}
export const examples = [
  // Ledge's two-lap game.
  {
    players: [{ name: "Anna", photo: "lib:people" }, { name: "Ben" }, { name: "Sam" }],
    laps: 2,
    style: "ring",
  },
  // Trot's walkers play an open-ended reverse queue.
  { players: [{ name: "Jo" }, { name: "Lee" }], first: 1, direction: "reverse", style: "queue" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("TurnOrder");
export const probes = [
  choose("Show whose game turn it is, advance or skip a turn, reverse order and stop after two laps"),
  choose("Show a plain roster of people with names and photos, without a turn cursor or game laps", "People"),
  write("Anna, Ben and Sam take turns for two laps; Ben starts, forward direction, displayed as a queue"),
  read("Move to the next player's turn", { address: "t1/next", action: "press" }),
  read("Reverse the following play order", { address: "t1/reverse", action: "press" }),
] satisfies Probe[];
