import { z } from "zod";
import { probesFor, type CastLike, type Meta, type Probe, type Props } from "../../../catalog";
import { queueAhead, queueCount, queueExact, queueLabels } from "../copy";
import { KitAction, KitCard, KitContent, KitText } from "../../../kit";

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
  parts: ["root", "title", "position", "label", "ahead", "join", "leave"],
  confirmParts: ["leave"],
  states: ["filled", "success"],
  actions: {
    parts: { join: ["press"], leave: ["press"] },
    when: { join: { joined: false }, leave: { joined: true } },
  },
  read: (input, state) => {
    if (state !== "filled") return [];
    const { joined, position, ahead } = props.parse(input);
    return [
      joined ? queueLabels.joined : queueLabels.waiting,
      ...(joined && position !== undefined ? [queueCount(position), queueLabels.position] : []),
      queueAhead(ahead),
      ...(ahead > 999 || (joined && position !== undefined && position > 999)
        ? [queueExact(ahead, joined ? position : undefined)]
        : []),
      joined ? queueLabels.leave : queueLabels.join,
    ];
  },
} as const satisfies Meta;
export const props = z.strictObject({
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
  { position: 12, ahead: 11, joined: true },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Waitlist");
export const probes = [
  choose("The class is full; let me join a waiting queue and see how many people are ahead"),
  choose("Show eight of twelve class places filled as a compact capacity bar", "Progress"),
  write("I joined the full walk session's waiting queue, third in line with two people ahead"),
  read("Leave the waiting queue", { address: "w1/leave", action: "press" }),
  { ...read("Join the waiting queue", { address: "w1/join", action: "press" }), screen: 1 },
] satisfies Probe[];

export function Waitlist({ position, ahead, joined }: Props<typeof props, typeof meta>) {
  return (
    <KitCard style="inset" padded part="root" label={queueExact(ahead, joined ? position : undefined)}>
      <KitContent lineRole="heading">
        <KitText role="label" part="title">
          {joined ? queueLabels.joined : queueLabels.waiting}
        </KitText>
        {joined && position !== undefined && (
          <>
            <KitText role="number" tabular part="position">
              {queueCount(position)}
            </KitText>
            <KitText role="body" tone="muted" part="label">
              {queueLabels.position}
            </KitText>
          </>
        )}
        <KitText role="body" tone="muted" part="ahead">
          {queueAhead(ahead)}
        </KitText>
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
