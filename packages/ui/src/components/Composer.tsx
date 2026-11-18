import { z } from "zod";
import {
  charLine,
  clip,
  placeholderDetail,
  sendLabel,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, KitCard, KitText, KitTextArea } from "../kit";

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
  parts: ["root", "label", "field", "count", "send"],
  states: ["filled"],
  actions: {
    parts: { field: ["type"], send: ["send"] },
    when: { send: { style: "reply" } },
  },
  aliases: ["textarea", "editor", "notes", "messagebox", "multiline"],
  read: (input, state) => {
    if (state !== "filled") return [];
    const { style, value, max } = input as z.output<typeof props>;
    return [style === "reply" ? sendLabel : charLine(value?.length ?? 0, max)];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["entry", "reply"]).default("entry"),
    label: text(24).optional(),
    hint: text(60),
    max: z.int().min(80).max(2000).default(600),
    value: text(2000).optional(),
  })
  .refine(({ value, max }) => value === undefined || value.length <= max, {
    path: ["value"],
    message: "Text must fit the limit",
  });

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return { style: "entry", hint: clip(thingOf(cast)?.fields[0]?.trim() || placeholderDetail, 60) };
}

export const examples = [
  { style: "entry", label: "Today's note", hint: "How did the plants look today?", max: 400 },
  { style: "reply", hint: "Reply to Anna", value: "Thanks, see you at nine" },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Let me write a few paragraphs about how my plants did this week, in a big box",
    expect: "Composer",
  },
  {
    kind: "choose",
    need: "Let me type the name of a new plant on its form, just a short word or two",
    expect: "Field",
  },
  {
    kind: "write",
    brief: "A reply box under the chat saying Reply to Anna, already holding Thanks, see you at nine",
    expect: "Composer",
  },
  {
    kind: "read",
    screen: 1,
    task: "Send the reply",
    expect: { address: "c1/send", action: "send" },
  },
] satisfies Probe[];

export function Composer({ style, label, hint, max, value }: Props<typeof props, typeof meta>) {
  const reply = style === "reply";
  return (
    <KitCard style="plain" part="root" padded>
      {label && (
        <KitText role="label" part="label">
          {label}
        </KitText>
      )}
      <KitTextArea hint={hint} value={value} lines={reply ? 2 : 6} />
      {reply ? (
        <KitAction label={sendLabel} icon="send" kind="primary" part="send" full />
      ) : (
        <KitText role="caption" tone="muted" align="end" tabular part="count">
          {charLine(value?.length ?? 0, max)}
        </KitText>
      )}
    </KitCard>
  );
}
