import { z } from "zod";
import * as c from "../../../catalog";
import { passRevealCurtain } from "../copy";

// Core first: Choice/default lets one person pick an option, not pass a veiled secret between players.
export const meta = {
  id: "PassReveal",
  status: "draft",
  group: "content",
  purpose: "Privately reveal a different secret to each player on a shared phone.",
  pick: "Pass one phone around so each player privately reveals their own secret role, word, or prompt. Not ordinary private selection (Choice), host-read questions (Trivia), or spaced recall (Flashcard).",
  writeHints: [
    "Write player names and their private seeds, never the current player, number seen, or reveal state.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "One device hides each player's secret before the handoff, without claiming anti-cheat protection.",
  parts: ["root", "player", "prompt", "role", "detail", "reveal", "hide", "restart"],
  states: ["filled", "empty", "loading", "success"],
  // Do not expose the seed roster as readable items.
  read: (input, state, lang) => {
    if (state !== "filled") return [];
    const { players, prompt } = input as z.output<typeof props>;
    return passRevealCurtain(players[0]?.name, prompt, lang);
  },
  actions: { parts: { reveal: ["flip"], hide: ["press"], restart: ["press"] } },
  confirmParts: ["restart"],
  successActions: ["restart.press"],
} as const satisfies c.Meta;

export const props = z.strictObject({
  players: z
    .array(
      z.strictObject({
        name: c.text(24),
        role: c.text(32),
        detail: c.text(120).optional(),
        swatch: c.swatch.optional(),
      }),
    )
    .min(3)
    .max(12),
  prompt: c.text(48).optional(),
  style: z.enum(["curtain", "hold"]).default("curtain"),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const role = c.wordsFor(lang).placeholderDetail;
  const players = c.itemsOf(cast, 3).map((item, i) => ({
    name: c.titleOf(item, 24, thing) ?? c.placeholderTitle(i, lang),
    role,
  }));
  while (players.length < 3) players.push({ name: c.placeholderTitle(players.length, lang), role });
  return { players };
}

export const examples = [
  {
    prompt: "Find your garden role",
    players: [
      { name: "Anna", role: "Seed keeper", detail: "Save a seed for the final round.", swatch: "green" },
      { name: "Ben", role: "Rain maker" },
      { name: "Sam", role: "Trail finder" },
    ],
  },
  {
    style: "hold",
    players: [
      { name: "Jo", role: "Leash keeper" },
      { name: "Lee", role: "Route scout" },
      { name: "Kim", role: "Treat keeper" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("PassReveal");
export const probes = [
  choose(
    "Pass a single phone around so each player can uncover their own secret role before hiding it again.",
  ),
  choose(
    "Privately pick one of three options with short explanations; nobody else uses the phone.",
    "Choice",
  ),
  write(
    "Deal Anna the Seed keeper, Ben the Rain maker and Sam the Trail finder. Use tap-to-reveal on one phone.",
  ),
  read("Reveal the secret for the current player", { address: "p1/reveal", action: "flip" }),
] satisfies c.Probe[];
