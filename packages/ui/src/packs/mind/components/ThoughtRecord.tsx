import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  canSaveReflection,
  emptyReflection,
  moodChange,
  moodChoices,
  readReflection,
  reflectionRecord,
  reflectionView,
} from "../copy";
import { mindWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-ThoughtRecord.generated";

// Core first: Composer/entry gives one free-form box, not a guided reframe with thinking traps and before/after mood.
// prettier-ignore
const reflectionFields = {
  situation: { prop: "situation", max: 200 }, thought: { prop: "thought", max: 200 },
  reframe: { prop: "reframe", max: 240 },
} as const;
export const meta = {
  id: "ThoughtRecord",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Reflection prompts and responses are stored privately on the device.",
  // prettier-ignore
  variants: { detail: ["full", "brief"] },
  // prettier-ignore
  variantParts: { "detail.brief": { hides: [
    "prompt", "situation", "situation_label", "mood_before", "mood_after", "before_label", "after_label", "mood_guide", "delta",
  ] } },
  // prettier-ignore
  parts: [
    "root", "title", "prompt", "empty", "situation", "situation_label", "thought", "thought_label",
    "traps", "traps_label", "reframe", "reframe_label", "mood_before", "mood_after", "before_label",
    "after_label", "mood_guide", "delta", "save", "save_label", "success", "sub",
  ],
  items: { key: "distortions", parts: ["root", "label"] },
  states: ["filled", "empty", "loading", "success"],
  // prettier-ignore
  actions: {
    parts: { situation: ["type"], thought: ["type"], reframe: ["type"],
      mood_before: ["select"], mood_after: ["select"], save: ["press"] },
    items: { root: ["toggle"] },
    when: { situation: { detail: "full" }, mood_before: { detail: "full" }, mood_after: { detail: "full" } },
  },
  // prettier-ignore
  emptyActions: ["situation.type", "thought.type", "reframe.type", "mood_before.select", "mood_after.select", "root.toggle", "save.press"],
  select: { prop: "on", value: "index", mode: "flags", runtime: true },
  // prettier-ignore
  selections: { mood_before: { prop: "moodBefore", choices: moodChoices, runtime: true },
    mood_after: { prop: "moodAfter", choices: moodChoices, runtime: true } },
  live: { text: reflectionFields, derive: reflectionView },
  recordRuntime: reflectionRecord(),
  read: (input, state, lang): string[] => readReflection(input as z.output<typeof props>, state, lang),
  writeHints: prompt.writeHints,
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  prompt: c.text(80).optional(),
  situation: c.text(reflectionFields.situation.max).optional(),
  thought: c.text(reflectionFields.thought.max).optional(),
  distortions: z.array(z.strictObject({ label: c.text(20), on: z.boolean() })).min(3).max(8),
  reframe: c.text(reflectionFields.reframe.max).optional(),
  moodBefore: z.int().min(1).max(5).optional(),
  moodAfter: z.int().min(1).max(5).optional(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  const prompt = items[0] && c.detailOf(items[0], 80, thing);
  const distortions = [0, 1, 2].map((index) => {
    const item = items[index];
    return { label: (item && c.titleOf(item, 20, thing)) ?? c.placeholderTitle(index, lang), on: false };
  });
  return { prompt, distortions };
}

const walk = {
  prompt: "What else might explain what happened?",
  situation: "I had to cancel a walk when a storm rolled in.",
  thought: "A canceled walk means I let everyone down.",
  distortions: [
    { label: "All-or-nothing", on: false },
    { label: "Mind reading", on: true },
    { label: "Personalizing", on: false },
  ],
  reframe: "The forecast changed. Rescheduling was the safer call.",
  moodBefore: 2,
  moodAfter: 4,
} satisfies z.input<typeof props>;
export const examples = [
  {
    prompt: "Could there be another explanation for the brown leaf?",
    situation: "I found a brown leaf on my fern.",
    thought: "I always get plant care wrong.",
    distortions: [
      { label: "All-or-nothing", on: true },
      { label: "Self-blame", on: false },
      { label: "Catastrophizing", on: false },
    ],
    reframe: "One brown leaf doesn't tell me how the whole plant is doing.",
    moodBefore: 2,
    moodAfter: 3,
  },
  walk,
  { ...walk, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ThoughtRecord");
export const probes = [
  choose(
    "Guide me through a CBT reflection: write what happened and my first thought, spot thinking traps, write a balanced alternative, and compare how I feel before and after.",
  ),
  choose(
    "Give me one big box to write several paragraphs in today's private journal. No separate questions, ratings or choices.",
    "Composer",
  ),
  write(
    "Build a guided CBT thought record with the prompt What else might explain what happened?, traps All-or-nothing, Mind reading and Personalizing, and mood ratings of 2 before and 4 after.",
  ),
  {
    ...write(
      "Make a short CBT reframing exercise with just my automatic thought, the traps All-or-nothing, Mind reading and Personalizing, and a balanced reframe. Skip the situation and both mood ratings.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Save this completed reflection.", { address: "t1/save", action: "press" }, 1),
] satisfies c.Probe[];
type Reflection = c.Props<typeof props, typeof meta>;
type Field = keyof typeof reflectionFields;
type Words = ReturnType<typeof mindWordsFor>["thoughtRecord"];

function ReflectionField({ part, input, words }: { part: Field; input: Reflection; words: Words }) {
  return (
    <kit.KitContent group="response">
      <kit.KitText part={`${part}_label`} role="label">
        {words[part]}
      </kit.KitText>
      <kit.KitTextArea
        part={part}
        label={words[part]}
        hint={words[`${part}Hint`]}
        value={input[part]}
        lines={2}
        maxLength={reflectionFields[part].max}
      />
    </kit.KitContent>
  );
}

function Mood({
  part,
  label,
  labelPart,
  value,
  lang,
  guide,
}: {
  part: "mood_before" | "mood_after";
  label: string;
  labelPart: string;
  value: number | undefined;
  lang: string;
  guide?: string;
}) {
  return (
    <kit.KitContent group="response">
      <kit.KitText part={labelPart} role="label">
        {label}
      </kit.KitText>
      {guide && (
        <kit.KitText part="mood_guide" role="label" tone="muted">
          {guide}
        </kit.KitText>
      )}
      <kit.KitTrack part={part} look="segments" role="radiogroup" label={label}>
        {moodChoices.map(({ value: level, label: wire }) => (
          <kit.KitChip
            key={level}
            item={null}
            role="radio"
            look="segment"
            label={c.numberLine(level, lang)}
            value={wire}
            on={value === level}
          />
        ))}
      </kit.KitTrack>
    </kit.KitContent>
  );
}

type ReflectionSectionProps = {
  live: Reflection;
  density: c.ThemeDensity;
  full: boolean;
  prompt: string | undefined;
  guide: string;
  words: Words;
};

function ReflectionLoading({ live, density, full, prompt, guide, words }: ReflectionSectionProps) {
  const groups = full
    ? (["situation", "thought", "before", "traps", "reframe", "after"] as const)
    : (["thought", "traps", "reframe"] as const);
  return (
    <>
      <kit.KitSkeleton shape="figure" inset="none" content={[["title", words.title]]} density={density} />
      {full && prompt && <kit.KitSkeleton shape="figure" inset="none" content={[["body", prompt]]} />}
      {groups.map((name) => (
        <kit.KitContent key={name} group="response">
          <kit.KitSkeleton
            shape="figure"
            inset="none"
            content={[
              ["label", words[name]],
              ["label", name === "before" ? guide : undefined],
            ]}
          />
          {name === "traps" ? (
            <kit.KitTrack part="traps">
              {live.distortions.map(({ id, label }) => (
                <kit.KitChip key={id} item={null} role="checkbox" look="box" label={label} on={false} />
              ))}
            </kit.KitTrack>
          ) : name === "before" || name === "after" ? (
            <kit.KitSkeleton shape="control" label={words[name]} full />
          ) : (
            <kit.KitRow part={null} label={words[name]} tone="muted" density="compact">
              <kit.KitSkeleton
                shape="figure"
                inset="none"
                content={[
                  ["body", words[`${name}Hint`]],
                  ["body", words[name]],
                ]}
              />
            </kit.KitRow>
          )}
        </kit.KitContent>
      ))}
      <kit.KitContent group="response">
        <kit.KitSkeleton shape="control" label={words.save} full />
      </kit.KitContent>
    </>
  );
}

function ReflectionTraps({
  distortions,
  heading,
}: {
  distortions: Reflection["distortions"];
  heading: string;
}) {
  return (
    <kit.KitContent group="response">
      <kit.KitText part="traps_label" role="label">
        {heading}
      </kit.KitText>
      <kit.KitTrack part="traps" label={heading}>
        {distortions.map(({ id, label, on }) => (
          <kit.KitChip key={id} item={id} role="checkbox" look="box" {...{ label, on }} />
        ))}
      </kit.KitTrack>
    </kit.KitContent>
  );
}

type ReflectionFormProps = ReflectionSectionProps & { empty: boolean; lang: string };

function ReflectionForm({ live, density, full, prompt, guide, words, empty, lang }: ReflectionFormProps) {
  const delta = full ? moodChange(live.moodBefore, live.moodAfter, lang) : undefined;
  return (
    <>
      <kit.KitText part="title" role="title" density={density}>
        {words.title}
      </kit.KitText>
      {(full || empty) && prompt && (
        <kit.KitText part={empty ? "empty" : "prompt"} role="body" tone="muted">
          {prompt}
        </kit.KitText>
      )}
      {full && <ReflectionField part="situation" input={live} words={words} />}
      <ReflectionField part="thought" input={live} words={words} />
      {full && (
        <Mood
          part="mood_before"
          labelPart="before_label"
          label={words.before}
          value={live.moodBefore}
          lang={lang}
          guide={guide}
        />
      )}
      <ReflectionTraps distortions={live.distortions} heading={words.traps} />
      <ReflectionField part="reframe" input={live} words={words} />
      {full && (
        <Mood
          part="mood_after"
          labelPart="after_label"
          label={words.after}
          value={live.moodAfter}
          lang={lang}
        />
      )}
      {delta !== undefined && (
        <kit.KitText part="delta" role="label" tone="muted">
          {words.rating(words.change, "")}
          <kit.KitText part={null} role="number" numberScale="compact" tone="text">
            {delta}
          </kit.KitText>
        </kit.KitText>
      )}
      <kit.KitContent group="response">
        <kit.KitAction part="save" label={words.save} disabled={!canSaveReflection(live)} full />
      </kit.KitContent>
    </>
  );
}

export function ThoughtRecord(input: Reflection) {
  const state = kit.useComponentState();
  const thing = kit.useEmptyThing();
  const seed = state === "empty" ? { ...input, ...emptyReflection(input.distortions) } : input;
  const live = kit.useLiveControls(meta, seed) as Reflection & { state?: c.StateName };
  const {
    words: { thoughtRecord: words },
    lang,
  } = kit.useWords(mindWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const prompt = state === "empty" ? c.emptyLine(thing, lang) : live.prompt;
  const guide = words.guide(c.numberLine(1, lang), c.numberLine(5, lang));
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {state === "success" || live.state === "success" ? (
        <kit.KitEmpty
          part="success"
          icon="check"
          decorativeIcon
          title={words.saved}
          sub={words.savedDetail}
        />
      ) : state === "loading" ? (
        <ReflectionLoading {...{ live, density, full, prompt, guide, words }} />
      ) : (
        <ReflectionForm {...{ live, density, full, prompt, guide, words, lang }} empty={state === "empty"} />
      )}
    </kit.KitCard>
  );
}
