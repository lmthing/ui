// prettier-ignore
import {
  useComponentState, useWords, KitAction, KitActionFooter, KitCard, KitContent, KitHeader, KitMicCapture,
  KitRow, KitState, KitText, KitTextArea, KitTrail,
} from "../kit";
// prettier-ignore
import {
  wordsFor, probesFor, charLine, clip, text, thingOf, variantProps, type FallbackInput, type Meta,
  type Probe, type Props,
} from "../catalog";
import { z } from "zod";

export const meta = {
  id: "Composer",
  status: "ready",
  group: "input",
  purpose: "Write several lines of text: an entry, a note, a review or a reply.",
  pick: "Writing more than one line, such as a journal entry, a note, a review or a reply under a conversation. Not one short value on a form (Field), or finding something by name (Search).",
  region: "body",
  weight: 2,
  tier: "phone",
  // A reply is only worth sending when someone else reads it.
  partTiers: { send: "people", attach: "ok", voice: "ok" },
  partTiersBy: { send: { prop: "style", tiers: { prompt: "service" } } },
  realPath:
    "The text is saved to one record on the device. A reply goes through the shared app the conversation lives in.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["count"] } },
  writeHints: [
    '“No character counter below the entry box” means detail "brief". Keep the limit in max; do not show the count or move the limit into label or hint. Otherwise use null, including for replies.',
    'Use style "prompt" for a multiline prompt with a run button. Use attach and voice to enable the picker and microphone, attachments for prelisted chips with label, and replyingTo for reply context.',
  ],
  items: { key: "attachments", parts: ["root", "label"] },
  parts: ["root", "label", "field", "count", "send", "attach", "voice", "replying_to", "sent"],
  states: ["filled", "empty", "success"],
  emptyActions: ["field.type", "attach.press", "voice.start", "voice.stop", "send.send"],
  readSuccess: true,
  media: { attachments: { attach: { intent: "pick" } } },
  actions: {
    parts: { field: ["type"], send: ["send"], attach: ["press"], voice: ["start", "stop"] },
    when: { send: { sendable: true }, attach: { attach: true }, voice: { voice: true } },
  },
  read: (input, state, lang, _data, _currency, get): string[] => {
    const { sendLabel, composer, mediaUnavailable } = wordsFor(lang);
    if (state === "success") return [composer.sent];
    const { style, detail, value, max, hint, replyingTo, voice, attach } = input as z.output<typeof props>;
    return [
      ...(state === "empty" ? [hint] : []),
      ...(replyingTo ? [composer.replying(replyingTo)] : []),
      ...(attach ? [composer.attach] : []),
      ...(voice ? [composer.voice, ...(!get?.("$runtime") ? [mediaUnavailable] : [])] : []),
      ...(style !== "entry"
        ? [style === "prompt" ? composer.prompt : sendLabel]
        : detail === "brief"
          ? []
          : [charLine(value?.length ?? 0, max, lang)]),
    ];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["entry", "reply", "prompt"]).default("entry"),
    label: text(24).optional(),
    hint: text(60),
    max: z.int().min(80).max(2000).default(600),
    value: z.string().min(1).max(2000).meta({ kind: "text", max: 2000 }).optional(),
    attach: z.boolean().optional(),
    voice: z.boolean().optional(),
    attachments: z
      .array(z.strictObject({ label: text(24) }))
      .min(1)
      .max(3)
      .optional(),
    replyingTo: text(32).optional(),
  })
  .refine(({ value, max }) => value === undefined || value.length <= max, {
    path: ["value"],
    message: "Text must fit the limit",
  })
  .overwrite((value) => ({
    ...value,
    attachments: value.attachments ?? [],
    sendable: value.style !== "entry" && Boolean(value.value?.trim()),
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  return { style: "entry", hint: clip(thingOf(cast)?.fields[0]?.trim() || placeholderDetail, 60) };
}

export const examples = [
  { style: "entry", label: "Today's note", hint: "How did the plants look today?", max: 400 },
  { style: "reply", hint: "Reply to Anna", value: "Thanks, see you at nine" },
  { label: "Walk notes", hint: "How did Clover's walk go?", max: 400, detail: "brief" },
  {
    style: "prompt",
    hint: "Ask about your plants",
    attach: true,
    voice: true,
    attachments: [{ label: "Fern notes" }],
    value: "How often should I water my fern?",
  },
  { style: "reply", hint: "Write a reply", replyingTo: "Anna", attachments: [{ label: "Walk summary" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Composer");
// prettier-ignore
export const probes = [
  choose("Let me write a few paragraphs about how my plants did this week, in a big box"),
  choose("Let me type the name of a new plant on its form, just a short word or two", "Field"),
  write("A reply box under the chat saying Reply to Anna, already holding Thanks, see you at nine"),
  { ...write( "Give me a multiline box for Walk notes. Keep the 400-character limit, but don't show a character counter like 0 / 400 below the box or mention the limit in the placeholder."), variant: { axis: "detail", value: "brief" },
  },
  read("Send the reply", { address: "c1/send", action: "send" }, 1),
  { ...write("Give me a multiline notes box with an Add attachment button that opens the file picker."), expectProps: { attach: true },
  },
  { ...write("Give me a multiline reply box with a microphone button to record a voice note."), expectProps: { voice: true },
  },
  { ...write("Give me a multiline reply box with a single existing attachment chip labelled Walk summary."), expectProps: { attachments: [{ label: "Walk summary" }] },
  },
  { ...write("Show a multiline reply box indicating that I am replying to Anna."), expectProps: { replyingTo: "Anna" },
  },
  { ...write( "Give me a multiline AI prompt box with a Run prompt button and the hint Ask about your plants."), expectProps: { style: "prompt" },
  },
] satisfies Probe[];

type ViewProps = Props<typeof props, typeof meta>;
// prettier-ignore
function ComposerTools({ attach, voice, attachments }: ViewProps) {
  const { composer } = useWords().words;
  return <>
    {(attachments || attach) && <KitActionFooter>{attachments?.map((item) => (
      <KitRow key={item.id} item={item.id} label={item.label} inline fitContent>
        <KitTrail part="label" kind="badge" value={item.label} />
      </KitRow>
    ))}{attach && <KitAction label={composer.attach} icon="paperclip" kind="secondary" part="attach" contentParts={{}} />}</KitActionFooter>}
    {voice && <KitContent group="response">
      <KitMicCapture part="voice" target={{ part: "voice" }} label={composer.voice} level={0} recording={false} />
    </KitContent>}
  </>;
}

// prettier-ignore
export function Composer(input: ViewProps) {
  const { style, detail, label, hint, max, value, replyingTo } = input;
  const { lang, words: { sendLabel, composer } } = useWords();
  const state = useComponentState();
  const reply = style === "reply";
  const prompt = style === "prompt";
  return <KitCard style="plain" part="root" padded>
    {state === "success" ? <KitState message={composer.sent} part="sent" /> : <>
      {replyingTo ? <KitHeader title={{ text: label ?? composer.replying(replyingTo), part: label ? "label" : "replying_to" }}
        {...(label && { meta: { text: composer.replying(replyingTo), part: "replying_to" } })} />
        : label && <KitText role="label" part="label">{label}</KitText>}
      {state === "empty" && <KitState />}
      <KitTextArea hint={hint} value={value} maxLength={max} lines={reply || prompt || state === "empty" ? 2 : 6} />
      <ComposerTools {...input} />
      {reply || prompt ? <KitAction label={prompt ? composer.prompt : sendLabel} icon={prompt ? "sparkles" : "send"}
        kind="primary" part="send" action="send" full disabled={!value?.trim()} />
        : detail === "full" && <KitText role="caption" tone="muted" align="end" tabular part="count">
          {charLine(value?.length ?? 0, max, lang)}
        </KitText>}
    </>}
  </KitCard>;
}
