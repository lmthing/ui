import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { lessonReading } from "../copy";
import { learningWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Lesson.generated";

// Core first: Note/body cannot teach with a title, explanation, illustrated example and continue action.
export const meta = {
  id: "Lesson",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Lesson content is stored with the app.",
  variants: {
    emphasis: ["normal", "hero"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["example", "example_label"] } },
  parts: ["root", "title", "text", "example", "photo", "next", "example_label", "next_label"],
  states: ["filled"],
  actions: { parts: { next: ["press"] } },
  read: (input, _state, lang) => lessonReading(Boolean((input as { example?: string }).example), lang),
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(40),
    text: c.text(400),
    example: c.text(160).optional(),
    photo: c.photoOrImage(["step_illustration", "cover"]).optional(),
  })
  .overwrite((value) => (value.detail === "brief" ? { ...value, example: undefined } : value));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return {
    title: (item && c.titleOf(item, 40, thing)) ?? c.placeholderTitle(0, lang),
    text: (item && c.detailOf(item, 400, thing)) ?? c.wordsFor(lang).placeholderDetail,
  };
}

export const examples = [
  {
    title: "Check the soil first",
    text: "Touch the soil before watering. If it feels damp, wait\u00a0a\u00a0day.",
    example: "The bathroom fern is still damp under its top layer, so skip watering today.",
    photo: "lib:plants",
  },
  {
    title: "Wait for slack",
    text: "When the leash goes tight, pause. Continue once the dog turns back and the leash relaxes.",
    example: "At the park gate, wait for Clover to turn back before walking on.",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Lesson");
export const probes = [
  choose(
    "Teach me one concept with a heading, an explanation, a separate worked example and a button to carry on.",
  ),
  choose(
    "Add a single quiet supporting sentence below the main content, without a heading or button.",
    "Note",
  ),
  write(
    "Teach one step titled The water radical: 水 means water. Show 海 means sea in a separate worked example.",
  ),
  {
    ...write(
      'Teach one step titled "Check the soil". Explain that damp soil can wait. Save the worked example "The fern is still damp", but hide that example from the screen. Keep Continue visible and leave the usual spacing, card and heading treatment alone.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Continue from the explanation to the next step.", { address: "l1/next", action: "press" }),
] satisfies c.Probe[];

export function Lesson(input: c.Props<typeof props, typeof meta>) {
  const { title, text, example, photo, emphasis } = input;
  const surface = "card";
  const density = kit.useKit().density;
  const { words } = kit.useWords(learningWordsFor);
  return (
    <kit.KitCard part="root" padded density="comfortable" surface={surface}>
      <kit.KitContent density={density}>
        <kit.KitText role="title" part="title" density="comfortable" emphasis={emphasis}>
          {title}
        </kit.KitText>
        <kit.KitContent
          density={density}
          leadingAlign="row"
          lead={photo && <kit.KitPhoto photo={photo} part="photo" shape="thumb" />}
        >
          <kit.KitText role="body" part="text" density={density}>
            {text}
          </kit.KitText>
        </kit.KitContent>
      </kit.KitContent>
      {example && (
        <kit.KitRow part="example" label={words.lesson.example} tone="muted" density={density}>
          <kit.KitContent density={density}>
            <kit.KitText role="label" part="example_label" tone="muted">
              {words.lesson.example}
            </kit.KitText>
            <kit.KitText role="body" part={null} tone="muted" density={density}>
              {example}
            </kit.KitText>
          </kit.KitContent>
        </kit.KitRow>
      )}
      <kit.KitContent group="response" density={density}>
        <kit.KitAction part="next" label={words.lesson.next} action="press" kind="secondary" full />
      </kit.KitContent>
    </kit.KitCard>
  );
}
