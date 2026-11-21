import { z } from "zod";
import * as c from "../../../catalog";
import { buzzerPadReady } from "../copy";

// Core first: Timer/up measures elapsed time, not which player's touch arrived first.
export const meta = {
  id: "BuzzerPad",
  status: "draft",
  group: "action",
  purpose: "Lock in the first player to buzz and show how much later others tapped.",
  pick: "Arbitrate who buzzes first in an in-person quiz or reaction round on one phone. Not one elapsed time (Timer), ordered turns (TurnOrder), random picks (Spinner), or question display (Trivia).",
  writeHints: [
    "Write the players, swatches, and an optional public prompt. Never write a winner, lock state, or timestamps.",
    'For stacked horizontal pads use arrange "rows"; the default "grid" spreads pads around the corners.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "One device locks the first touch and measures later taps against its monotonic timestamp.",
  variants: { arrange: ["grid", "rows"] },
  parts: ["root", "prompt", "winner", "reset"],
  items: { key: "players", parts: ["root", "buzz", "name", "delta"] },
  states: ["filled", "loading", "success"],
  actions: { parts: { reset: ["press"] }, items: { buzz: ["press"] } },
  // Lock the winner, not the remaining players' chance to register a reaction time.
  successActions: ["buzz.press", "reset.press"],
  read: (input, state, lang): string[] =>
    state === "filled" ? buzzerPadReady((input as z.output<typeof props>).prompt, lang) : [],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  players: z
    .array(z.strictObject({ name: c.text(16), swatch: z.enum(c.swatchNames) }))
    .min(2)
    .max(4),
  prompt: c.text(48).optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 2);
  const players = (["grey", "navy"] as const).map((swatch, i) => ({
    name: (items[i] ? c.titleOf(items[i], 16, thing) : undefined) ?? c.placeholderTitle(i, lang),
    swatch,
  }));
  return { players };
}

export const examples = [
  {
    prompt: "Name that leaf",
    players: [
      { name: "Fern team", swatch: "green" },
      { name: "Pothos team", swatch: "yellow" },
    ],
  },
  {
    arrange: "rows",
    players: [
      { name: "Clover", swatch: "blue" },
      { name: "Juniper", swatch: "purple" },
      { name: "Otis", swatch: "orange" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("BuzzerPad");
export const probes = [
  choose(
    "Give each player a buzzer on the same phone, lock the first tap as the winner and show later taps' reaction gaps.",
  ),
  choose("Give the host one stopwatch that counts up during the quiz; no player taps or winner.", "Timer"),
  write(
    "Create a two-player quiz buzzer with Fern team in green and Pothos team in yellow. The prompt is Name that leaf.",
  ),
  {
    ...write("Give Fern team in green and Pothos team in yellow buzzers stacked in horizontal rows."),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Buzz in as Fern team", { address: "b1/r1/buzz", action: "press" }),
] satisfies c.Probe[];
