import { z } from "zod";
import * as c from "../../../catalog";

// Core first: People/stack shows who is there, not the formation, shirt numbers and substitutes.
export const meta = {
  id: "Lineup",
  status: "draft",
  group: "data",
  purpose: "See where the starters play and who is on the bench.",
  pick: "Starters arranged in their playing lines on a pitch or grouped by position, with a separate substitutes bench. Not an ordinary list of people (People), player availability (Squad) or a staff rota (Roster).",
  writeHints: [
    "Write lines from the back of the pitch to the front. Put only starters in lines; put substitutes in subs.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The coach sets the lineup on one phone and teammates see the selection in a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "formation", "bench"],
  items: { key: "players", parts: ["root", "number", "name"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang): string[] =>
    (input as c.Props<typeof props, typeof meta>).players.map(
      ({ id, name, number }) => `${id}: ${name} #${c.numberLine(number, lang)}`,
    ),
} as const satisfies c.Meta;

const player = z.strictObject({ number: z.int().min(0).max(99), name: c.text(16) });
const schema = z.strictObject({
  ...c.variantProps(meta.variants),
  lines: z
    .array(z.strictObject({ players: z.array(player).min(1).max(6) }))
    .min(1)
    .max(5),
  subs: z.array(player).min(0).max(7).default([]),
  style: z.enum(["pitch", "list"]).default("pitch"),
});

// The nested wire formation stays intact; repeated player parts have one flat address space.
function withPlayers(input: z.output<typeof schema>) {
  return {
    ...input,
    players: [
      ...input.lines.flatMap(({ players }, line) => players.map((row) => ({ ...row, line }))),
      ...input.subs.map((row) => ({ ...row, line: undefined })),
    ],
  };
}
export const props = schema.overwrite(withPlayers) as typeof schema &
  z.ZodType<ReturnType<typeof withPlayers>, z.input<typeof schema>>;

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const players = c.itemsOf(cast, 3).map((item, index) => ({
    number: index + 1,
    name: c.titleOf(item, 16, thing) || c.placeholderTitle(index, lang),
  }));
  return {
    lines: [{ players: players.length ? players : [{ number: 1, name: c.placeholderTitle(0, lang) }] }],
  };
}

export const examples = [
  {
    lines: [
      { players: [{ number: 1, name: "Gardner" }] },
      {
        players: [
          { number: 4, name: "Green" },
          { number: 8, name: "Field" },
        ],
      },
      {
        players: [
          { number: 10, name: "Reed" },
          { number: 11, name: "Woods" },
        ],
      },
    ],
    subs: [{ number: 14, name: "Moss" }],
  },
  {
    style: "list",
    density: "compact",
    surface: "outlined",
    lines: [
      { players: [{ number: 1, name: "Porter" }] },
      {
        players: [
          { number: 5, name: "Banks" },
          { number: 6, name: "Lee" },
        ],
      },
    ],
    subs: [{ number: 17, name: "Rivers" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Lineup");
export const probes = [
  choose(
    "Draw our five-a-side formation on the pitch, with names and shirt numbers grouped from keeper to attack and a bench below.",
  ),
  choose(
    "Show three people attending as overlapping headshots, without shirt numbers, positions, a pitch or a bench.",
    "People",
  ),
  write(
    "Draw the starting formation: keeper 1 Gardner, next line 4 Green and 8 Field, front line 10 Reed and 11 Woods; 14 Moss on the bench.",
  ),
  read("Open Green, the defender in shirt 4", { address: "l1/r2", action: "press" }),
] satisfies c.Probe[];
