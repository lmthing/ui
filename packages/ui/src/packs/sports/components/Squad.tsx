import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { squadReading, squadSummary } from "../copy";
import { sportsWordsFor } from "../lang";

const replies = ["yes", "maybe", "no"] as const;
// Core first: People/stack lists people, not availability replies or the coach's selection for a match.
export const meta = {
  id: "Squad",
  status: "ready",
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
  parts: ["root", "available", "empty"],
  items: { key: "players", parts: ["root", "name", "photo", "answer", "reason", "picked"] },
  states: ["filled", "empty"],
  actions: {
    items: { answer: ["select"], picked: ["check"] },
    when: { answer: { $first: true }, picked: { coach: true } },
  },
  selections: { "r1/answer": { prop: "own_answer", choices: replies, runtime: true } },
  live: { checks: { picked: "picked" }, derive: applyOwnAnswer },
  read: (input, _state, lang): string[] => squadReading(input as z.output<typeof props>, lang),
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
          answer: z.enum([...replies, "none"]),
          reason: c.text(24).meta({ kind: undefined }).optional(),
          picked: z.boolean(),
        }),
      )
      .min(1)
      .max(20),
    coach: z.boolean().default(false),
  })
  .overwrite((input) => ({
    ...input,
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

type SquadProps = c.Props<typeof props, typeof meta>;
const answerTones = { yes: "good", maybe: "warn", no: "bad", none: "muted" } as const;

// prettier-ignore
export function Squad(input: SquadProps) {
  const { lang, words: { squad: words } } = kit.useWords(sportsWordsFor);
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const squad = kit.useLiveControls(meta, input) as SquadProps;
  const amount = squadSummary(squad, lang);
  return <kit.KitCard part="root" padded density={density}>
    {state === "empty" ? <kit.KitEmpty part="empty" decorativeIcon /> : <>
      <kit.KitGrid fitLast density={density}>
        <kit.KitText part={null} role="heading" density={density}>{words.available}</kit.KitText>
        <kit.KitText part="available" role="number" tabular density={density}>{amount}</kit.KitText>
      </kit.KitGrid>
      <kit.KitGrid list arrange="rows" listRowGap="cards" density={density}>
        {squad.players.map((row, index) => <kit.KitRow key={row.id} item={row.id} label={row.name} inline>
          <kit.KitRow part={null} label={row.name} density={density} inset="none" leadingAlign="row"
            leading={<kit.KitPhoto photo={row.photo} shape="round" part="photo" label={row.name} />}
            trailing={squad.coach || row.picked ? <kit.KitCheck part="picked" done={row.picked}
              label={squad.coach ? words.selection(row.name) : words.picked} readonly={!squad.coach} /> : undefined}>
            <kit.KitText part="name" lines={1} density={density}>{row.name}</kit.KitText>
            <kit.KitText part={index === 0 ? null : "answer"} role="label" density={density}
              tone={answerTones[row.answer]}>{words.answers[row.answer]}</kit.KitText>
            {detail === "full" && row.reason && <kit.KitText part="reason" role="label" tone="muted"
              lines={1} density={density}>{row.reason}</kit.KitText>}
          </kit.KitRow>
          {index === 0 && <kit.KitTrack part="answer" role="radiogroup" look="segments" label={words.reply}>
            {replies.map((value) => <kit.KitChip key={value} item={null} role="radio" look="segment"
              label={words.answers[value]} value={value} on={row.answer === value} />)}
          </kit.KitTrack>}
        </kit.KitRow>)}
      </kit.KitGrid>
    </>}
  </kit.KitCard>;
}
