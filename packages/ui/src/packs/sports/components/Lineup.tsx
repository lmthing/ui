import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  formationLabel,
  hasPlayerBadges,
  lineupReading,
  pitchLines,
  playerBadges,
  playerGroups,
} from "../copy";
import { sportsWordsFor } from "../lang";

// Core first: People/stack shows who is there, not the formation, shirt numbers and substitutes.
export const meta = {
  id: "Lineup",
  status: "ready",
  group: "data",
  purpose: "See where the starters play and who is on the bench.",
  pick: "Starters arranged in their playing lines on a pitch or grouped by position, with a separate substitutes bench. Not an ordinary list of people (People), player availability (Squad) or a staff rota (Roster).",
  writeHints: [
    "Write lines from the back of the pitch to the front. Put only starters in lines; put substitutes in subs.",
    'For the formation without the count beside the title, write "detail":"brief" and keep the lines and subs. Otherwise write "detail":null. The ordinary layout, including a request to keep it unchanged, is "density":null and "surface":null, never "surface":"card".',
    'If any starter or substitute has rating, cards, or goals, you must explicitly write "style":"list". Never write "pitch" or null for those entries. Ratings are 0–10, cards is a list of "yellow" or "red", and goals is an optional nonnegative integer.',
  ],
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
  items: { key: "players", parts: ["root", "number", "name", "rating", "cards", "goals"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  emptyActions: [],
  read: (input, _state, lang): string[] => lineupReading(input as LineupProps, lang),
} as const satisfies c.Meta;

const player = z.strictObject({
  number: z.int().min(0).max(99),
  name: c.text(16),
  rating: z.number().min(0).max(10).optional(),
  cards: z
    .array(z.enum(["yellow", "red"]))
    .min(1)
    .max(3)
    .optional(),
  goals: z.int().min(0).max(99).optional(),
});
const schema = z
  .strictObject({
    ...c.variantProps(meta.variants),
    lines: z
      .array(z.strictObject({ players: z.array(player).min(1).max(6) }))
      .min(1)
      .max(5),
    subs: z.array(player).min(0).max(7).default([]),
    style: z.enum(["pitch", "list"]).default("pitch"),
  })
  .refine(
    ({ style, lines, subs }) =>
      style === "list" ||
      (!subs.some(hasPlayerBadges) && lines.every(({ players }) => !players.some(hasPlayerBadges))),
    { path: ["style"], message: "Player badges require the list layout." },
  );

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
  {
    style: "list",
    lines: [
      { players: [{ number: 1, name: "Porter", rating: 8.5 }] },
      { players: [{ number: 5, name: "Banks", cards: ["yellow"], goals: 2 }] },
    ],
    subs: [{ number: 17, name: "Rivers", goals: 0 }],
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
  {
    ...write(
      "Show a plain list, not a pitch drawing, with keeper 1 Porter and defender 5 Banks on separate lines. Put Porter's match rating of 8.5 out of 10 by his name.",
    ),
    expectProps: { style: "list", lines: [{ players: [{ rating: 8.5 }] }, { players: [{}] }] },
  },
  {
    ...write(
      "Show a plain vertical list with exactly two playing lines: only goalkeeper 1 Porter in the first, and only defender 5 Banks in the second. Banks was booked; show his yellow card beside his name.",
    ),
    expectProps: { style: "list", lines: [{ players: [{}] }, { players: [{ cards: ["yellow"] }] }] },
  },
  {
    ...write(
      "Use a plain vertical list, not a pitch drawing. Put keeper 1 Porter and forward 5 Banks on separate lines, and show Banks's two goals beside his name.",
    ),
    expectProps: { style: "list", lines: [{ players: [{}] }, { players: [{ goals: 2 }] }] },
  },
  read("Open Green, the defender in shirt 4", { address: "l1/r2", action: "press" }),
] satisfies c.Probe[];

type LineupProps = c.Props<typeof props, typeof meta>;
type Player = LineupProps["players"][number];

// prettier-ignore
function PlayerList({ players, density }: { players: Player[]; density: c.ThemeDensity }) {
  const { lang, words: { lineup } } = kit.useWords(sportsWordsFor);
  return <kit.KitRowGroup density={density}>{players.map((player) => {
    const shirt = c.numberLine(player.number, lang);
    return <kit.KitRow key={player.id} item={player.id} role="button" density={density} inline inset="none"
      label={lineup.player(player.name, shirt)} leading={
        <kit.KitTrail kind="value" part="number" value={shirt} density={density} />
      }>
      <kit.KitMetaLine title={{ text: player.name, part: "name" }} density={density} />
      {hasPlayerBadges(player) && <kit.KitText part={null} role="label" tone="muted" density={density}>
        {playerBadges(player, lang).map(({ part, text, tone }, index) =>
          <PlayerBadge key={part} {...{ part, text, tone, density }} separator={index ? lineup.badgeSeparator : ""} />)}
      </kit.KitText>}
    </kit.KitRow>;
  })}</kit.KitRowGroup>;
}

function PlayerBadge({
  part,
  text,
  tone,
  density,
  separator,
}: ReturnType<typeof playerBadges>[number] & { density: c.ThemeDensity; separator: string }) {
  return (
    <>
      {separator}
      <kit.KitText part={part} role="label" tone={tone === "text" ? "muted" : tone} density={density}>
        {text}
      </kit.KitText>
    </>
  );
}

// prettier-ignore
function BadgedLineup({ players, density }: { players: Player[]; density: c.ThemeDensity }) {
  const { words: { lineup } } = kit.useWords(sportsWordsFor);
  return <kit.KitCard part="formation" style="plain" density={density}>
    <kit.KitRowGroup density={density} spacing="groups" separators={false}>
    {playerGroups(players).map(([line, players]) => line === undefined ? (
      <kit.KitCard key="bench" part="bench_list" style="plain" density={density}>
        <kit.KitContent density={density}>
          <kit.KitHeader title={{ text: lineup.bench, part: "bench", role: "meta", tone: "muted" }} density={density} />
          <PlayerList {...{ players, density }} />
        </kit.KitContent>
      </kit.KitCard>
    ) : <PlayerList key={line} {...{ players, density }} />)}
    </kit.KitRowGroup>
  </kit.KitCard>;
}

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
    <kit.KitState part="formation" icon="users" density={density}>
      {input.style === "list" && input.players.some(hasPlayerBadges) ?
        <BadgedLineup players={input.players} density={density} /> :
        <kit.KitPitch part="formation" style={input.style} lines={pitchLines(input.players, lang)}
          substitutes={<Bench players={input.players.filter(({ line }) => line === undefined)} {...{ density }} style={input.style} />} />}
    </kit.KitState>
  </kit.KitCard>;
}
