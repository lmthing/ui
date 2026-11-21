import {
  wordsFor,
  probesFor,
  detailOf,
  photo,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";
import {
  KitBubble,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitPhoto,
  KitText,
  PartScope,
  useComponentState,
  usePartContext,
  useWords,
} from "../kit";

// prettier-ignore
export const meta = {
  id: "Bubbles",
  group: "content",
  purpose: "A conversation between you and someone else, with each person's messages kept distinct.",
  pick: "Show an exchange between you and another person, keeping who said each message clear. Not things to browse and tap (List) or one supporting sentence without a reply (Note).",
  writeHints: [
    'Leave detail null unless asked to retain a supplied conversation partner in "with" without showing their name above the messages. Then use detail "brief". Keep all messages.',
    'Use style "group" for multiple named participants, "broadcast" for a channel announcement, or "direct" for a specified private exchange. Sender and time are short display labels; replyTo is the quoted text.',
    'Attachments have kind "photo", "voice" or "file". Set photo to a library or local reference for a photo attachment. Reactions are short emoji or labels.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Messages exchanged with another person through a shared messaging service.",
  items: { key: "messages", parts: ["root", "text", "sender", "avatar", "time", "status", "reply", "attachment", "attachment_photo", "reactions"] },
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["with"] } },
  parts: ["root", "with", "broadcast"],
  states: ["filled", "empty"],
  read: (input, state, lang): string[] => state === "filled" ? messageDetails(input as BubblesProps, lang) : [],
} as const satisfies Meta;

// prettier-ignore
export const props = z.strictObject({
  ...variantProps(meta.variants),
  style: z.enum(["direct", "group", "broadcast"]).optional(),
  messages: z.array(z.strictObject({
    from: z.enum(["me", "them"]), text: text(120),
    sender: text(24).optional(), avatar: photo.optional(), time: text(16).optional(),
    status: z.enum(["sent", "delivered", "read"]).optional(), replyTo: text(80).optional(),
    attachment: z.strictObject({ kind: z.enum(["photo", "voice", "file"]), label: text(32).optional(), photo: photo.optional() })
      .refine(({ kind, photo }) => (kind === "photo") === Boolean(photo), { path: ["photo"], message: "Only photo attachments use a photo reference" }).optional(),
    reactions: z.array(text(12)).min(1).max(4).optional(),
  })).min(1).max(6),
  with: text(24).optional(),
}).overwrite((value) => (value.detail === "brief" ? { ...value, with: undefined } : value));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const item = cast.items[0];
  const detail = item ? detailOf(item, 120, thingOf(cast, item.type)) : undefined;
  return { messages: [{ from: "them", text: detail ?? placeholderDetail }] };
}

const walkThread = {
  with: "Anna",
  messages: [
    { from: "them", text: "Could Clover's walk start at 09:30 today?" },
    { from: "me", text: "09:30 works. Meet at the gate." },
    { from: "them", text: "Thanks! Clover will be ready." },
  ],
} satisfies z.input<typeof props>;

// prettier-ignore
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
  walkThread,
  { ...walkThread, detail: "brief" },
  {
    style: "group",
    with: "Clover’s walkers",
    messages: [
      { from: "them", text: "Meet at the park gate?", sender: "Anna", avatar: "lib:anna", time: "09:12" },
      { from: "me", text: "Yes, I’ll be there.", replyTo: "Meet at the park gate?", status: "read", reactions: ["👍"] },
      { from: "them", text: "Here’s the gate.", sender: "Maya", attachment: { kind: "photo", photo: "lib:park_walk" } },
    ],
  },
  { style: "broadcast", with: "Park walkers", messages: [{ from: "them", text: "Tomorrow’s route has changed.", attachment: { kind: "file", label: "Route notes" } }] },
  { style: "direct", with: "Anna", messages: [{ from: "me", text: "Here’s a short update.", attachment: { kind: "voice" }, status: "sent" }] },
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
  write(
    "Show a group chat for Clover’s walkers. Anna posts ‘Meet at the gate?’ at 09:12, with avatar lib:anna. I reply ‘Yes’ quoting her question, it’s marked read, and gets a thumbs-up reaction. Maya shares a photo of the gate from lib:park_walk.",
  ),
  {
    ...write(
      "Save Anna as the other person in the conversation, but hide her name above the messages. She asks if Clover can be walked at nine. I reply that nine works.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];

type BubblesProps = Props<typeof props, typeof meta>;
type Message = BubblesProps["messages"][number];

// prettier-ignore
function messageDetails({ messages, style }: BubblesProps, lang?: string): string[] {
  const w = wordsFor(lang).bubbleLabels;
  const lines = messages.flatMap(({ id, status, attachment, reactions, replyTo }, index) => {
    const shown = [status && w.status[status], attachment && (attachment.label ?? w.attachment[attachment.kind]),
      reactions?.join(" · "), replyTo && w.reply(replyTo)].filter(Boolean);
    return shown.length ? [`${id ?? `r${index + 1}`} ${shown.join(" · ")}`] : [];
  });
  return style === "broadcast" ? [w.broadcast, ...lines] : lines;
}

// prettier-ignore
function MessageDetails({ message, after }: { message: Message; after?: boolean }) {
  const { bubbleLabels: w, placeholderLabel } = useWords().words, context = usePartContext();
  const { id, from, sender, avatar, time, status, attachment, replyTo, reactions } = message;
  const align = from === "me" ? "end" : "start";
  if (after ? !(time || status || reactions || attachment) : !(sender || avatar || replyTo)) return null;
  const image = attachment?.photo && <KitPhoto photo={attachment.photo} shape="wide" part="attachment_photo" label={attachment.label ?? w.attachment.photo} />;
  const file = attachment && <KitContent lead={<KitIcon name={attachment.kind === "voice" ? "mic" : "file_text"} scale="sm" decorative />} lineRole="body">
    <KitText role="label" tone="muted" part="attachment" align={align}>{attachment.label ?? w.attachment[attachment.kind]}</KitText>
  </KitContent>;
  const name = sender && <KitText role="label" part="sender" align={align}>{sender}</KitText>;
  return <PartScope {...context} item={id}><KitContent inset="md">
      {!after && avatar && <KitContent group="response"><KitPhoto photo={avatar} shape="round" part="avatar" label={sender ?? placeholderLabel} /></KitContent>}
      {!after && name}
      {!after && replyTo && <KitText role="caption" tone="muted" part="reply" align={align}>{w.reply(replyTo)}</KitText>}
      {after && image && <KitGrid>{align === "end" ? <></> : image}{align === "end" ? image : <></>}</KitGrid>}
      {after && file && (align === "end" ? <KitGrid fitLast><></>{file}</KitGrid> : file)}
      {after && reactions && <KitText role="caption" part="reactions" align={align}>{reactions.join(" · ")}</KitText>}
      {after && time && <KitText role="caption" tone="muted" part="time" align={align}>{time}</KitText>}
      {after && status && <KitText role="caption" tone="muted" part="status" align={align}>{w.status[status]}</KitText>}
  </KitContent></PartScope>;
}

// prettier-ignore
export function Bubbles({ messages, with: person, style }: BubblesProps) {
  const state = useComponentState();
  const { bubbleLabels } = useWords().words;
  if (state === "empty") return <KitCard style="inset" part="root"><KitEmpty icon="message" /></KitCard>;
  const rich = Boolean(style) || messages.some(({ sender, avatar, time, status, replyTo, attachment, reactions }) =>
    sender || avatar || time || status || replyTo || attachment || reactions);
  const thread = messages.map((message, index) =>
    <MessageBubble key={message.id} message={message} previous={messages[index - 1]} group={style === "group"} />);
  return (
    <KitCard style="plain" part="root">
      {(person || style === "broadcast") && (
        <KitContent inset="md">
          {person && <KitText role={style === "broadcast" ? "heading" : "caption"} tone={style === "broadcast" ? "text" : "muted"} part="with">{person}</KitText>}
          {style === "broadcast" && <KitText role="caption" tone="muted" part="broadcast">{bubbleLabels.broadcast}</KitText>}
        </KitContent>
      )}
      {rich ? <KitGrid list arrange="rows" listRowGap="group">{thread}</KitGrid> : thread}
    </KitCard>
  );
}

// prettier-ignore
function MessageBubble({ message, previous, group }: { message: Message; previous?: Message | undefined; group: boolean }) {
  const grouped = Boolean(message.sender || message.replyTo || message.avatar) ||
    (previous?.from === message.from && (!group || previous?.sender === message.sender));
  return <>
      <MessageDetails message={message} />
      <KitBubble item={message.id} from={message.from} text={message.text} grouped={grouped} />
      <MessageDetails message={message} after />
  </>;
}
