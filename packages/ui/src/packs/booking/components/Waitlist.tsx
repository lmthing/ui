import { useWords, KitAction, KitCard, KitContent, KitRow, KitText, useKit } from "../../../kit";
import { bookingWordsFor } from "../lang";
import { z } from "zod";
import {
  numberLine,
  probesFor,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../../../catalog";
import { queueAhead, queueCount, queueExact } from "../copy";

// Core first: Progress/compact shows capacity, not membership or position in a waiting queue.
export const meta = {
  id: "Waitlist",
  status: "ready",
  group: "action",
  purpose: "Join or leave the queue for a full session and see your place.",
  pick: "A full session's waiting queue: join, leave, place in line and people ahead. Not capacity or progress toward a target (Progress).",
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A queue in a shared app; notifications tell the next person when a place opens.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["ahead"] } },
  writeHints: [
    'Leave detail null unless requested. For a joined queue with a known position, detail "brief" shows the position without the number ahead; retain ahead in the data.',
  ],
  parts: ["root", "title", "position", "label", "ahead", "join", "leave"],
  confirmParts: ["leave"],
  states: ["filled", "success"],
  actions: {
    parts: { join: ["press"], leave: ["press"] },
    when: { join: { joined: false }, leave: { joined: true } },
  },
  read: (input, state, lang?: string): string[] => {
    const { queueLabels } = bookingWordsFor(lang);

    if (state !== "filled") return [];
    const { joined, position, ahead, detail } = props.parse(input);
    const brief = detail === "brief" && joined && position !== undefined;
    return [
      joined ? queueLabels.joined : queueLabels.waiting,
      ...(joined && position !== undefined ? [queueCount(position, lang), queueLabels.position] : []),
      ...(brief ? [] : [queueAhead(ahead, lang)]),
      ...(brief
        ? position > 999
          ? [queueLabelsForPosition(position, lang)]
          : []
        : ahead > 999 || (joined && position !== undefined && position > 999)
          ? [queueExact(ahead, joined ? position : undefined, lang)]
          : []),
      joined ? queueLabels.leave : queueLabels.join,
    ];
  },
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  position: z.int().min(1).optional(),
  ahead: z.int().min(0),
  joined: z.boolean(),
});
export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { ahead: 0, joined: false };
}
export const examples = [
  { position: 3, ahead: 2, joined: true },
  { ahead: 4, joined: false },
  { ahead: 0, joined: true },
  { ahead: 0, joined: false },
  { position: 3, ahead: 2, joined: true, detail: "brief" },
  { position: 3, ahead: 2, joined: true },
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
] satisfies Probe[];

function queueLabelsForPosition(position: number, lang?: string) {
  const words = bookingWordsFor(lang);
  return words.queuePosition(words.queueLabels.position, numberLine(position, lang));
}

export function Waitlist(input: Props<typeof props, typeof meta>) {
  const { position, ahead, joined, detail } = input;
  const density = useKit().density;
  const { lang, words } = useWords(bookingWordsFor);
  const { queueLabels } = words;
  const hasPosition = joined && position !== undefined;
  const brief = detail === "brief" && hasPosition;
  const label = brief
    ? queueLabelsForPosition(position, lang)
    : queueExact(ahead, joined ? position : undefined, lang);
  const number = hasPosition && (
    <KitText role="number" tabular part="position">
      {queueCount(position, lang)}
    </KitText>
  );
  const caption = (
    <KitText role="body" tone="muted" part="label">
      {queueLabels.position}
    </KitText>
  );
  return (
    <KitCard style="inset" padded part="root" label={label} density={density}>
      <KitContent lineRole="heading">
        <KitText role={hasPosition ? "label" : "heading"} part="title">
          {joined ? queueLabels.joined : queueLabels.waiting}
        </KitText>
        {hasPosition &&
          (density === "compact" ? (
            <KitContent lead={number} density={density} leadingAlign="row">
              <KitRow inline part={null} label={queueLabels.position} lineRole="number" leading={caption}>
                {null}
              </KitRow>
            </KitContent>
          ) : (
            <>
              {number}
              {caption}
            </>
          ))}
        {!brief && (
          <KitText role={hasPosition ? "body" : "caption"} tone="muted" part="ahead" density={density}>
            {queueAhead(ahead, lang)}
          </KitText>
        )}
      </KitContent>
      <KitAction
        label={joined ? queueLabels.leave : queueLabels.join}
        kind={joined ? "secondary" : "primary"}
        part={joined ? "leave" : "join"}
        full
      />
    </KitCard>
  );
}
