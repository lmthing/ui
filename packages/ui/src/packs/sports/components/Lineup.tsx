import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { formationLabel, lineupReading, pitchLines } from "../copy";
import { sportsWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Lineup.generated";

// Core first: People/stack shows who is there, not the formation, shirt numbers and substitutes.
export const meta = {
  id: "Lineup",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The coach sets the lineup on one phone and teammates see the selection in a shared app.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["shape"] } },
  parts: ["root", "title", "shape", "formation", "bench", "bench_list"],
  items: { key: "players", parts: ["root", "number", "name"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  emptyActions: [],
  read: (input, _state, lang): string[] => lineupReading(input as LineupProps, lang),
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
    "Show who is attending: Ellis, Ali and Sam. Use a compact attendee roster with overlapping avatars and their names, not a photo gallery or a match formation.",
    "People",
  ),
  write(
    "Draw the starting formation: keeper 1 Gardner, next line 4 Green and 8 Field, front line 10 Reed and 11 Woods; 14 Moss on the bench.",
  ),
  {
    ...write(
      "Draw keeper 1 Gardner, then 4 Green and 8 Field, then 10 Reed and 11 Woods. Put 14 Moss on the bench. Keep the names, shirts, lines and bench, but don't print the formation count beside the title.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open Green, the defender in shirt 4", { address: "l1/r2", action: "press" }),
] satisfies c.Probe[];

type LineupProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function Bench({ players, density, style }: {
  players: LineupProps["players"]; density: c.ThemeDensity; style: LineupProps["style"];
}) {
  const { lang, words: { lineup } } = kit.useWords(sportsWordsFor);
  if (!players.length) return null;
  const label = <kit.KitText part="bench" role="label" tone="muted" density={density}>{lineup.bench}</kit.KitText>;
  if (style === "list") return <kit.KitContent density={density}>
    {label}
    <kit.KitPitch part="bench_list" style="list" lines={pitchLines(players.map((player) => ({ ...player, line: 0 })), lang)} />
  </kit.KitContent>;
  const rows = players.map(({ id, name, number }) => {
    const shirt = c.numberLine(number, lang);
    return <kit.KitRow key={id} item={id} role="button" label={lineup.player(name, shirt)}
      density={density} leading={<kit.KitText part="number" role="number" numberScale="compact"
        tabular tone="muted" density={density}>{shirt}</kit.KitText>}>
      <kit.KitText part="name" lines={2} density={density}>{name}</kit.KitText>
    </kit.KitRow>;
  });
  return <kit.KitContent density={density}>
    {label}
    {players.length === 1 ? rows : <kit.KitStrip list density={density}>{rows}</kit.KitStrip>}
  </kit.KitContent>;
}

// prettier-ignore
export function Lineup(input: LineupProps) {
  const { lang, words: { lineup } } = kit.useWords(sportsWordsFor);
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const title = <kit.KitText part="title" role="heading" density="comfortable">{lineup.title}</kit.KitText>;
  const titleRow = detail === "brief" || state === "empty" ? title : <kit.KitGrid fitLast density={density}>
    {title}
    <kit.KitText part="shape" role="label" tone="muted" tabular density={density}>
      {formationLabel(input.lines, lang)}
    </kit.KitText>
  </kit.KitGrid>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {titleRow}
    {state === "empty" ? <kit.KitEmpty part="formation" icon="users" decorativeIcon /> :
      <kit.KitPitch part="formation" style={input.style} lines={pitchLines(input.players, lang)}
        substitutes={<Bench players={input.players.filter(({ line }) => line === undefined)} {...{ density }} style={input.style} />} />}
  </kit.KitCard>;
}
