import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { pollDate, pollReading, pollResults } from "../copy";
import { socialWordsFor } from "../lang";

// Core first: Choice/cards stores a personal choice, not a group vote with results.
export const meta = {
  id: "Poll",
  status: "ready",
  group: "input",
  purpose: "Ask a group to vote and see how everyone voted.",
  pick: "A shared question with voting options and group results. Not a choice for oneself (Choice), a quiz with right answers (Quiz), or coordinating a date via availability (FindDate).",
  writeHints: [
    "voted is a zero-based index, omitted until the person votes. Write each option's vote count; total and shares are derived. closes uses YYYY-MM-DD.",
    'Hide only the closing date with "detail":"brief","emphasis":null. Keep closes in the data and keep the results. For unrequested variants output null, never a named default.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Votes counted in a shared app.",
  variants: {
    emphasis: ["normal", "quiet"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["closes"] } },
  parts: ["root", "question", "total", "closes"],
  items: { key: "options", parts: ["root", "label", "share", "selected"] },
  states: ["filled", "success"],
  readSuccess: true,
  actions: { items: { root: ["select"] }, when: { root: { can_vote: true } } },
  select: { prop: "live_vote", value: "index" },
  live: { derive: pollResult },
  read: pollReading,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    question: c.text(80),
    options: z
      .array(z.strictObject({ label: c.text(32), votes: z.int().min(0).max(999999) }))
      .min(2)
      .max(5),
    voted: z.int().min(0).max(4).optional(),
    closes: c.isoDate.optional(),
  })
  .refine(({ voted, options }) => voted === undefined || voted < options.length, { path: ["voted"] });

function pollResult(input: c.Values): c.Values {
  const { voted, options } = input as z.output<typeof props>;
  // Keep the local vote separate from wire data so a seeded result never adds the vote twice.
  const selection = input.live_vote;
  if (voted !== undefined) return { can_vote: false };
  if (typeof selection !== "number") return { can_vote: true };
  return {
    can_vote: false,
    voted: selection,
    options: options.map((option, index) =>
      index === selection ? { ...option, votes: option.votes + 1 } : option,
    ),
  };
}

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  const options = items.flatMap((item) => {
    const label = c.titleOf(item, 32, thing);
    return label ? [{ label, votes: 0 }] : [];
  });
  while (options.length < 2) options.push({ label: c.placeholderTitle(options.length, lang), votes: 0 });
  const first = items[0];
  return { question: (first && c.detailOf(first, 80, thing)) || c.wordsFor(lang).placeholderLabel, options };
}

// prettier-ignore
export const examples = [
  { question: "Next cutting?", options: [{ label: "Fern", votes: 4 }, { label: "Basil", votes: 3 }], closes: "2026-11-28" },
  { question: "Where do we meet?", options: [{ label: "River gate", votes: 6 }, { label: "Park entrance", votes: 2 }], voted: 0 },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Poll");
export const probes = [
  choose(
    "Ask members to vote for a favourite cutting and show the percentage each option receives after voting.",
  ),
  choose(
    "Let me pick the one watering plan I personally want, from two options with an explanation for each. The choice is private and there are no results.",
    "Choice",
  ),
  write(
    "Ask the group whether they prefer a fern or basil swap. Fern has four votes and basil has three; I haven’t voted yet.",
  ),
  {
    ...write(
      "Ask the group to vote for Fern or Basil. Fern has four votes, Basil has three, and I already voted for Basil. Store the closing date, 2026-11-28, but hide it on screen. Keep the vote total and results visible. No other display preferences.",
    ),
    variant: { axis: "detail", value: "brief", itemTitles: ["Fern", "Basil"] },
  },
  read("Vote for Basil.", { address: "p1/r2", action: "select" }),
] satisfies c.Probe[];

type PollProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function PollResults({ input, density }: { input: PollProps; density: c.ThemeDensity }) {
  const { lang, words: { poll } } = kit.useWords(socialWordsFor);
  const { rows, total } = pollResults(input, lang);
  const closes = pollDate(input, lang);
  return <>
    {rows.map(({ label, share, ratio, selected }, index) => (
      <kit.KitRow key={input.options[index]!.id} item={input.options[index]!.id}
        label={selected ? poll.chosen(label) : label} inline density={density}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitText part="label" density={density}>{label}</kit.KitText>
          <kit.KitContent leadingAlign="row" density={density}
            lead={selected && <kit.KitIcon name="check" part="selected" tone="accent" scale="sm" />}>
            <kit.KitText part="share" role="number" numberScale="compact" tabular density={density}>{share}</kit.KitText>
          </kit.KitContent>
        </kit.KitGrid>
        <kit.KitMeter label="" amount="" ratio={ratio} slim={density === "compact"} addressed={false} />
      </kit.KitRow>
    ))}
    <kit.KitContent group="response" density={density}>
      <kit.KitText part="total" role="caption" tone="muted" density={density}>{total}</kit.KitText>
      {closes && <kit.KitText part="closes" role="caption" tone="muted" density={density}>{closes}</kit.KitText>}
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function Poll(input: PollProps) {
  const state = kit.useComponentState();
  const live = kit.useLiveControls(meta, input) as PollProps;
  const { lang, words: { poll } } = kit.useWords(socialWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const closes = pollDate({ ...input, detail }, lang);
  const results = live.voted !== undefined || state === "success";
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitText part="question" role="title" {...{ density, emphasis }}>{input.question}</kit.KitText>
    {results ? <PollResults input={{ ...live, detail }} density={density} /> : <>
      <kit.KitContent group="response" density={density}>
        <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
          {input.options.map(({ id, label }) => (
            <kit.KitRow item={id} key={id} role="button" surface="outlined" label={poll.voteFor(label)} inline density={density}>
              <kit.KitContent inset="md" density={density}>
                <kit.KitText part="label" density={density}>{label}</kit.KitText>
              </kit.KitContent>
            </kit.KitRow>
          ))}
        </kit.KitGrid>
      </kit.KitContent>
      {closes && <kit.KitContent group="response" density={density}>
        <kit.KitText part="closes" role="caption" tone="muted" density={density}>{closes}</kit.KitText>
      </kit.KitContent>}
    </>}
  </kit.KitCard>;
}
