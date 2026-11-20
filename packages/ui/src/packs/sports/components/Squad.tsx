import { z } from "zod";
import * as c from "../../../catalog";

// Core first: People/stack lists people, not availability replies or the coach's selection for a match.
export const meta = {
  id: "Squad",
  status: "draft",
  group: "input",
  purpose: "See who can play and let the coach pick the side.",
  pick: "Players' availability for one upcoming match: yes, maybe or no, an optional reason, and coach selection. Not an ordinary player directory (People), who plays where (Lineup), guest RSVPs (GuestList), or staff shifts (Roster).",
  writeHints: [
    "Put the current player's own row first; only that row offers a reply. Picked is the coach's selection, separate from the answer. Do not write totals.",
    'To show replies without reasons, write detail "brief" and still supply any known reasons. Write density: null unless the person asks to change spacing.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "Players send their availability and the coach picks the side in a shared app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["reason"] } },
  parts: ["root", "available"],
  items: { key: "players", parts: ["root", "name", "photo", "answer", "reason", "picked"] },
  states: ["filled", "empty"],
  actions: {
    items: { answer: ["select"], picked: ["check"] },
    when: { answer: { $first: true }, picked: { coach: true } },
  },
  selections: { "r1/answer": { prop: "own_answer", choices: ["yes", "maybe", "no"], runtime: true } },
  live: { checks: { picked: "picked" }, derive: applyOwnAnswer },
  read: (input, _state, lang): string[] => {
    const { players, needed } = input as z.output<typeof props>;
    const count = players.filter(({ answer }) => answer === "yes").length;
    return [
      `${c.numberLine(count, lang)} ${c.goalLine(needed, lang)}`,
      ...players.map(({ name, answer }) => `${name}: ${answer}`),
    ];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    needed: z.int().min(1).max(20),
    players: z
      .array(
        z.strictObject({
          name: c.text(20),
          photo: c.photo,
          answer: z.enum(["yes", "maybe", "no", "none"]),
          reason: c.text(24).optional(),
          picked: z.boolean(),
        }),
      )
      .min(1)
      .max(20),
    coach: z.boolean().default(false),
  })
  .overwrite((input) => ({
    ...input,
    ...(input.detail === "brief"
      ? { players: input.players.map((row) => ({ ...row, reason: undefined })) }
      : {}),
    own_answer: input.players[0]?.answer,
  }));

function applyOwnAnswer(input: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const { players, own_answer } = input as z.output<typeof props> & {
    own_answer: "yes" | "maybe" | "no" | "none";
  };
  const [first, ...others] = players;
  if (first && first.answer !== own_answer) return { players: [{ ...first, answer: own_answer }, ...others] };
  return {};
}

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item, index) => c.titleOf(item, 20, thing) || c.placeholderTitle(index, lang));
  return {
    needed: 1,
    players: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      photo: "local:1",
      answer: "none",
      picked: false,
    })),
  };
}

export const examples = [
  {
    needed: 5,
    coach: true,
    players: [
      { name: "Ella", photo: "local:1", answer: "none", picked: false },
      { name: "Reed", photo: "local:2", answer: "yes", picked: false },
      { name: "Moss", photo: "local:3", answer: "maybe", reason: "Waiting on a lift", picked: false },
    ],
  },
  {
    needed: 3,
    detail: "brief",
    density: "compact",
    players: [
      { name: "Jo", photo: "local:1", answer: "yes", picked: true },
      { name: "Lee", photo: "local:2", answer: "no", reason: "Away that weekend", picked: false },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Squad");
export const probes = [
  choose(
    "Collect yes, maybe or no from our players for Sunday's match, show how many of the five we need can play, and let the coach tick the team.",
  ),
  choose(
    "Show a strip of overlapping portraits of our club members. It's just faces and names, not match replies or team selection.",
    "People",
  ),
  write(
    "For Sunday we need five. I'm Ella with no reply yet (local:1). Reed (local:2) says yes, Moss (local:3) says maybe while waiting for a lift. Nobody picked yet; show the coach's controls.",
  ),
  {
    ...write(
      "We need three players. I'm Jo (local:1), yes and picked; Lee (local:2) can't make it because they're away that weekend. Keep their reason in the data but only show the replies, not the reasons.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Reply to the match for myself, Ella", { address: "s1/r1/answer", action: "select" }),
  read("Tick Reed as picked to play", { address: "s1/r2/picked", action: "check" }),
] satisfies c.Probe[];
