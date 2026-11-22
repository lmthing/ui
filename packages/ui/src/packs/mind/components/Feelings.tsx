import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { feelingCountLine, feelingPlaceholder, readFeelings } from "../copy";
import { mindWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Feelings.generated";

const wordParts = ["word_1", "word_2", "word_3", "word_4", "word_5", "word_6", "word_7", "word_8"] as const;
const maxChosen = 3;

// Core first: Scale/mood captures a level, not several precise words chosen by feeling family.
export const meta = {
  id: "Feelings",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The selected words are saved with the day's entry on the device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["hint"] } },
  parts: ["root", "title", "hint", "families", "words", "count"],
  items: {
    key: "families",
    parts: ["root", "label", ...wordParts],
    nested: {
      key: "word_controls",
      activeParent: true,
      maxActive: maxChosen,
      parts: { word: { action: "toggle", prop: "on" } },
    },
  },
  states: ["filled"],
  // prettier-ignore
  actions: { items: {
    root: ["select"], word_1: ["toggle"], word_2: ["toggle"], word_3: ["toggle"], word_4: ["toggle"],
    word_5: ["toggle"], word_6: ["toggle"], word_7: ["toggle"], word_8: ["toggle"],
  } },
  select: { prop: "family", value: "index" },
  writeHints: prompt.writeHints,
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { families, detail, family = 0 } = input as z.output<typeof props> & { family?: number };
    return readFeelings(families, family, detail === "full", lang);
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    families: z
      .array(z.strictObject({ label: c.text(14), words: z.array(c.text(16)).min(3).max(8) }))
      .min(3)
      .max(6),
    chosen: z.array(c.text(16)).min(0).max(maxChosen),
  })
  .refine(
    ({ families, chosen }) =>
      new Set(chosen).size === chosen.length &&
      chosen.every((word) => families.some(({ words }) => words.includes(word))),
    { path: ["chosen"], message: "Choose distinct words from the supplied families" },
  )
  .overwrite((value) => {
    const seen = new Set<string>();
    return {
      ...value,
      families: value.families.map((family) => ({
        ...family,
        // The first occurrence owns the live control, so a repeated word only uses one slot.
        word_controls: family.words.flatMap((label) => {
          if (seen.has(label)) return [];
          seen.add(label);
          return [{ label, on: value.chosen.includes(label) }];
        }),
      })),
    };
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    families: Array.from({ length: 3 }, (_, index) => {
      const item = items[index];
      const words = item ? c.textsOf(item, thing).slice(1) : [];
      return {
        label: (item && c.titleOf(item, 14, thing)) ?? c.placeholderTitle(index, lang),
        words: Array.from({ length: 3 }, (_, at) =>
          words[at] ? c.clip(words[at], 16) : feelingPlaceholder(index, at, lang),
        ),
      };
    }),
    chosen: [],
  };
}

// prettier-ignore
export const examples = [
  {
    families: [
      { label: "Calm", words: ["Settled", "Hopeful", "At ease"] },
      { label: "Anxious", words: ["Restless", "Worried", "On edge"] },
      { label: "Tired", words: ["Drained", "Sleepy", "Heavy"] },
    ],
    chosen: ["Settled", "Hopeful"],
  },
  {
    families: [
      { label: "Happy", words: ["Proud", "Amused", "Grateful", "Delighted", "Playful", "Joyful"] },
      { label: "Sad", words: ["Lonely", "Tender", "Disappointed"] },
      { label: "Angry", words: ["Irritated", "Frustrated", "Resentful"] },
    ],
    chosen: [],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Feelings");
export const probes = [
  choose(
    "Let me choose a family like anxious first, then mark up to three precise words like restless or worried.",
  ),
  choose(
    "Let me rate how I feel with one of five faces, from very low to very good, no feeling words to select.",
    "Scale",
  ),
  write(
    "Name how I feel: Calm has Settled, Hopeful and At ease; Anxious has Restless, Worried and On edge; Tired has Drained, Sleepy and Heavy. Settled is chosen.",
  ),
  {
    ...write(
      "Let me name my feelings. Calm has Settled, Hopeful and At ease; Anxious has Restless, Worried and On edge; Tired has Drained, Sleepy and Heavy. Keep all choices and the selection count, but leave out the instruction line. Nothing is chosen yet.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Choose the Anxious family.", { address: "f1/r2", action: "select" }),
  read("Within Calm, toggle the already chosen word Hopeful off.", {
    address: "f1/r1/word_2",
    action: "toggle",
  }),
] satisfies c.Probe[];

type FeelingsProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function FeelingWords({ parent, controls, label }: ReturnType<typeof kit.useNestedControls> & { label: string }) {
  const { words } = kit.useWords(mindWordsFor);
  return (
    <kit.KitTrack part="words" label={label}>
      {controls.map(({ target, part, item, spec, disabled }) => (
        <kit.KitChip key={target} item={parent ?? null} part={part} labelPart={null}
          label={String(item.label)} role="checkbox" on={item[spec.prop] === true} disabled={disabled} />
      ))}
      {!controls.length && <kit.KitText part={null} role="caption" tone="muted">{words.feelings.noWords}</kit.KitText>}
    </kit.KitTrack>
  );
}

// prettier-ignore
export function Feelings(input: FeelingsProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const { words, lang } = kit.useWords(mindWordsFor);
  const nested = kit.useNestedControls(meta, input);
  const { parent, remaining = maxChosen } = nested;
  const family = input.families.find(({ id }) => id === parent);
  const columns = input.families.length % 3 === 0 && input.families.every(({ label }) => label.length <= 8) ? 3 : 2;
  return (
    <kit.KitCard part="root" padded density={density} surface={surface}>
      <kit.KitContent density={density}>
        <kit.KitText part="title" role="heading" density={density}>{words.feelings.title}</kit.KitText>
        {full && <kit.KitText part="hint" role="caption" tone="muted" density={density}>{words.feelings.hint}</kit.KitText>}
      </kit.KitContent>
      <kit.KitContent group="response" density={density}>
        <kit.KitTrack part="families" look="segments" role="radiogroup" label={words.feelings.families}>
          <kit.KitGrid density={density} columns={columns}>
            {input.families.map(({ id, label }) => (
              <kit.KitChip key={id} item={id} label={label} role="radio" look="segment" on={id === parent} />
            ))}
          </kit.KitGrid>
        </kit.KitTrack>
      </kit.KitContent>
      <kit.KitContent group="response" density={density}>
        <FeelingWords {...nested} label={family?.label ?? words.feelings.title} />
        <kit.KitText part="count" role="caption" tone="muted" density={density}>
          {feelingCountLine(remaining, lang)}
        </kit.KitText>
      </kit.KitContent>
    </kit.KitCard>
  );
}
