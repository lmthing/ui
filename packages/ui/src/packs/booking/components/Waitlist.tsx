import {
  useComponentState,
  useWords,
  useKit,
  KitAction,
  KitCard,
  KitContent,
  KitGrid,
  KitLayoutText,
  KitMetaLine,
} from "../../../kit";
import { bookingWordsFor } from "../lang";
import { z } from "zod";
import {
  numberLine,
  probesFor,
  screenId,
  text,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../../../catalog";
import { queueAhead, queueCount, queueExact, queueSize } from "../copy";
import { prompt } from "../../../entry/prompt-Waitlist.generated";

// Core first: Progress/compact shows capacity, not membership or position in a waiting queue.
export const meta = {
  id: "Waitlist",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A queue in a shared app; notifications tell the next person when a place opens.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["ahead"] } },
  writeHints: prompt.writeHints,
  parts: ["root", "title", "position", "label", "ahead", "join", "leave", "deadline", "review"],
  partTiers: { review: "phone" },
  confirmParts: ["leave"],
  states: ["filled", "success"],
  readSuccess: true,
  actions: {
    parts: { join: ["press"], leave: ["press"], review: ["press"] },
    when: {
      join: { joined: false },
      leave: { joined: true, offered: false },
      review: { offered: true },
    },
    noGoto: { parts: ["join", "leave"] },
  },
  read: (input, state, lang?: string): string[] => {
    const { queueLabels, queueRespondBy } = bookingWordsFor(lang);
    const { joined, position, ahead, detail, respondBy } = input as z.output<typeof props>;
    if (respondBy)
      return [
        queueLabels.available,
        queueRespondBy(respondBy),
        ...(state === "filled" ? [queueLabels.review] : []),
      ];
    const brief = detail === "brief" && joined && position !== undefined;
    const exact = joined ? queueExact(ahead, position, lang) : queueSize(ahead, lang, true);
    return [
      joined ? queueLabels.joined : queueLabels.waiting,
      ...(joined && position !== undefined ? [queueCount(position, lang), queueLabels.position] : []),
      ...(brief ? [] : [joined ? queueAhead(ahead, lang) : queueSize(ahead, lang)]),
      ...(brief
        ? position > 999
          ? [queueLabelsForPosition(position, lang)]
          : []
        : ahead > 999 || (joined && position !== undefined && position > 999)
          ? [exact]
          : []),
      ...(state === "filled" ? [joined ? queueLabels.leave : queueLabels.join] : []),
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    position: z.int().min(1).optional(),
    ahead: z.int().min(0),
    joined: z.boolean(),
    respondBy: text(36).meta({ read: false }).optional(),
    goto: screenId.optional(),
  })
  .refine(({ joined, respondBy, goto }) => (!respondBy && !goto) || (joined && !!respondBy && !!goto), {
    path: ["respondBy"],
    message: "A spot offer needs a joined waitlist, a response deadline, and a review destination.",
  })
  .overwrite((value) => ({ ...value, offered: value.respondBy !== undefined }));
export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { ahead: 0, joined: false };
}
export const examples = [
  { position: 3, ahead: 2, joined: true },
  { ahead: 4, joined: false },
  { ahead: 0, joined: true },
  { ahead: 0, joined: false },
  { position: 3, ahead: 2, joined: true, detail: "brief" },
  { ahead: 0, joined: true, respondBy: "Thu at 5:00 PM", goto: "review_spot" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Waitlist");
export const probes = [
  choose("The class is full; let me join a waiting queue and see how many people are ahead"),
  choose("Show eight of twelve class places filled as a compact capacity bar", "Progress"),
  write("I joined the full walk session's waiting queue, third in line with two people ahead"),
  {
    ...write(
      "I joined the waiting queue for the full dog walk. I'm third with two people ahead. Show my position but hide the people-ahead count.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Leave the waiting queue", { address: "w1/leave", action: "press" }),
  { ...read("Join the waiting queue", { address: "w1/join", action: "press" }), screen: 1 },
  {
    ...write(
      "I already joined the waiting queue for a full garden class. A spot opened, not yet reserved. Show that I must respond by Thu at 5:00 PM and open review_spot for review.",
    ),
    expectProps: { joined: true, respondBy: "Thu at 5:00 PM", goto: "review_spot" },
  },
  { ...read("Open the review for the offered spot", { address: "w1/review", action: "press" }), screen: 5 },
] satisfies Probe[];

function queueLabelsForPosition(position: number, lang?: string) {
  const words = bookingWordsFor(lang);
  return words.queuePosition(words.queueLabels.position, numberLine(position, lang));
}

type WaitlistProps = Props<typeof props, typeof meta>;

function WaitlistOffer({ respondBy, goto }: { respondBy: string; goto: WaitlistProps["goto"] }) {
  const active = useComponentState() === "filled";
  const density = useKit().density;
  const { words } = useWords(bookingWordsFor);
  const { queueLabels } = words;
  return (
    <KitCard style="inset" padded part="root" density={density}>
      <KitGrid fitLast density={density}>
        <KitMetaLine
          title={{ text: queueLabels.available, part: "title", strong: true }}
          meta={{ text: words.queueRespondBy(respondBy), part: "deadline" }}
          density={density}
        />
        {active && <KitAction label={queueLabels.review} part="review" goto={goto} />}
      </KitGrid>
    </KitCard>
  );
}

function WaitlistPosition({ position, label }: { position: string; label: string }) {
  const density = useKit().density;
  return (
    <KitContent rhythm="flush" density={density}>
      <KitLayoutText
        line={{
          text: position,
          part: "position",
          role: "figure",
          tabular: true,
          compact: density === "compact",
        }}
        density={density}
      />
      <KitLayoutText line={{ text: label, part: "label", role: "meta", tone: "muted" }} density={density} />
    </KitContent>
  );
}

export function Waitlist(input: WaitlistProps) {
  const { position, ahead, joined, detail, respondBy, goto } = input;
  const active = useComponentState() === "filled";
  const density = useKit().density;
  const { lang, words } = useWords(bookingWordsFor);
  const { queueLabels } = words;
  if (respondBy) return <WaitlistOffer respondBy={respondBy} goto={goto} />;
  const hasPosition = joined && position !== undefined;
  const brief = detail === "brief" && hasPosition;
  const label = !joined
    ? queueSize(ahead, lang, true)
    : brief
      ? queueLabelsForPosition(position, lang)
      : queueExact(ahead, position, lang);
  const title = { text: joined ? queueLabels.joined : queueLabels.waiting, part: "title", strong: true };
  const count = {
    text: brief ? undefined : joined ? queueAhead(ahead, lang) : queueSize(ahead, lang),
    part: "ahead",
    role: "meta" as const,
  };
  return (
    <KitCard style="inset" padded part="root" label={label} density={density}>
      <KitGrid fitLast density={density}>
        <KitContent density={density}>
          <KitLayoutText line={title} density={density} />
          {hasPosition && (
            <WaitlistPosition position={queueCount(position, lang)} label={queueLabels.position} />
          )}
          {count.text && (
            <KitContent group={hasPosition ? "response" : "content"} density={density}>
              <KitLayoutText line={{ ...count, tone: "muted" }} density={density} />
            </KitContent>
          )}
        </KitContent>
        {active && (
          <KitAction
            label={joined ? queueLabels.leave : queueLabels.join}
            kind={joined ? "secondary" : "primary"}
            tone={joined ? "neutral" : "accent"}
            part={joined ? "leave" : "join"}
          />
        )}
      </KitGrid>
    </KitCard>
  );
}
