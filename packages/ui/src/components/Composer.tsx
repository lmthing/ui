import { useWords, KitAction, KitCard, KitText, KitTextArea } from "../kit";
import {
  wordsFor,
  probesFor,
  charLine,
  clip,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";

export const meta = {
  id: "Composer",
  group: "input",
  purpose: "Write several lines of text: an entry, a note, a review or a reply.",
  pick: "Writing more than one line, such as a journal entry, a note, a review or a reply under a conversation. Not one short value on a form (Field), or finding something by name (Search).",
  region: "body",
  weight: 2,
  tier: "phone",
  // A reply is only worth sending when someone else reads it.
  partTiers: { send: "people" },
  realPath:
    "The text is saved to one record on the device. A reply goes through the shared app the conversation lives in.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["count"] } },
  writeHints: [
    '“No character counter below the entry box” means detail "brief". Keep the limit in max; do not show the count or move the limit into label or hint. Otherwise use null, including for replies.',
  ],
  parts: ["root", "label", "field", "count", "send"],
  states: ["filled"],
  actions: {
    parts: { field: ["type"], send: ["send"] },
    when: { send: { style: "reply", sendable: true } },
  },
  read: (input, state, lang?: string): string[] => {
    const { sendLabel } = wordsFor(lang);

    if (state !== "filled") return [];
    const { style, detail, value, max } = input as z.output<typeof props>;
    if (style === "reply") return [sendLabel];
    return detail === "brief" ? [] : [charLine(value?.length ?? 0, max, lang)];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["entry", "reply"]).default("entry"),
    label: text(24).optional(),
    hint: text(60),
    max: z.int().min(80).max(2000).default(600),
    value: z.string().min(1).max(2000).meta({ kind: "text", max: 2000 }).optional(),
  })
  .refine(({ value, max }) => value === undefined || value.length <= max, {
    path: ["value"],
    message: "Text must fit the limit",
  })
  .overwrite((value) => ({ ...value, sendable: value.style === "reply" && Boolean(value.value?.trim()) }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  return { style: "entry", hint: clip(thingOf(cast)?.fields[0]?.trim() || placeholderDetail, 60) };
}

export const examples = [
  { style: "entry", label: "Today's note", hint: "How did the plants look today?", max: 400 },
  { style: "reply", hint: "Reply to Anna", value: "Thanks, see you at nine" },
  { label: "Walk notes", hint: "How did Clover's walk go?", max: 400, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Composer");
export const probes = [
  choose("Let me write a few paragraphs about how my plants did this week, in a big box"),
  choose("Let me type the name of a new plant on its form, just a short word or two", "Field"),
  write("A reply box under the chat saying Reply to Anna, already holding Thanks, see you at nine"),
  {
    ...write(
      "Give me a multiline box for Walk notes. Keep the 400-character limit, but don't show a character counter like 0 / 400 below the box or mention the limit in the placeholder.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Send the reply", { address: "c1/send", action: "send" }, 1),
] satisfies Probe[];

export function Composer({ style, detail, label, hint, max, value }: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords();
  const { sendLabel } = words;
  const reply = style === "reply";
  return (
    <KitCard style="plain" part="root" padded>
      {label && (
        <KitText role="label" part="label">
          {label}
        </KitText>
      )}
      <KitTextArea hint={hint} value={value} maxLength={max} lines={reply ? 2 : 6} />
      {reply ? (
        <KitAction label={sendLabel} icon="send" kind="primary" part="send" full disabled={!value?.trim()} />
      ) : detail === "full" ? (
        <KitText role="caption" tone="muted" align="end" tabular part="count">
          {charLine(value?.length ?? 0, max, lang)}
        </KitText>
      ) : null}
    </KitCard>
  );
}
