import {
  wordsFor,
  probesFor,
  detailOf,
  text,
  thingOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";
import { KitBubble, KitCard, KitContent, KitEmpty, KitText, useComponentState } from "../kit";

export const meta = {
  id: "Bubbles",
  group: "content",
  purpose: "A conversation between you and someone else, with each person's messages kept distinct.",
  pick: "Show an exchange between you and another person, keeping who said each message clear. Not things to browse and tap (List) or one supporting sentence without a reply (Note).",
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Messages exchanged with another person through a shared messaging service.",
  items: { key: "messages", parts: ["root", "text"] },
  parts: ["root"],
  states: ["filled", "empty"],
} as const satisfies Meta;

export const props = z.strictObject({
  messages: z
    .array(z.strictObject({ from: z.enum(["me", "them"]), text: text(120) }))
    .min(1)
    .max(6),
  with: text(24).optional(),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = cast.items[0];
  const detail = item ? detailOf(item, 120, thingOf(cast, item.type)) : undefined;
  return { messages: [{ from: "them", text: detail ?? placeholderDetail }] };
}

export const examples = [
  {
    with: "Maya",
    messages: [
      { from: "them", text: "Have you watered the fern today?" },
      { from: "them", text: "The soil felt dry this morning." },
      { from: "me", text: "Yes, I watered it after breakfast." },
      { from: "me", text: "I'll check the basil tomorrow." },
      { from: "them", text: "Perfect, thank you!" },
    ],
  },
  {
    with: "Anna",
    messages: [
      { from: "them", text: "Could Clover's walk start at 09:30 today?" },
      { from: "me", text: "09:30 works. I'll meet you at the park gate." },
      { from: "them", text: "Thanks! Clover will be ready." },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Bubbles");
export const probes = [
  choose(
    "Show what Anna said about Clover's walk time and my reply, with each person's words on their own side",
  ),
  choose("Add a little supporting line explaining that ferns prefer indirect light", "Note"),
  write(
    "Show an exchange with Anna: she asks if Clover's walk can start at 09:30, I say 09:30 works, and she thanks me",
  ),
] satisfies Probe[];

export function Bubbles({ messages, with: person }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root">
        <KitEmpty icon="message" />
      </KitCard>
    );
  }
  return (
    <KitCard style="plain" part="root">
      {person && (
        <KitContent inset="md">
          <KitText role="caption" tone="muted" part={null}>
            {person}
          </KitText>
        </KitContent>
      )}
      {messages.map((message, index) => (
        <KitBubble
          key={message.id}
          item={message.id}
          from={message.from}
          text={message.text}
          grouped={index > 0 && messages[index - 1]?.from === message.from}
        />
      ))}
    </KitCard>
  );
}
