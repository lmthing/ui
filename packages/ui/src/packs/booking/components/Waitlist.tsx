import { z } from "zod";
import { probesFor, type CastLike, type Meta, type Probe } from "../../../catalog";

// Core first: Progress/compact shows capacity, not membership or position in a waiting queue.
export const meta = {
  id: "Waitlist",
  status: "draft",
  group: "action",
  purpose: "Join or leave the queue for a full session and see your place.",
  pick: "A full session's waiting queue: join, leave, place in line and people ahead. Not capacity or progress toward a target (Progress).",
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A queue in a shared app; notifications tell the next person when a place opens.",
  parts: ["root", "position", "ahead", "join", "leave"],
  confirmParts: ["leave"],
  states: ["filled", "success"],
  actions: {
    parts: { join: ["press"], leave: ["press"] },
    when: { join: { joined: false }, leave: { joined: true } },
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
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Waitlist");
export const probes = [
  choose("The class is full; let me join a waiting queue and see how many people are ahead"),
  choose("Show eight of twelve class places filled as a compact capacity bar", "Progress"),
  write("I joined the full walk session's waiting queue, third in line with two people ahead"),
  read("Leave the waiting queue", { address: "w1/leave", action: "press" }),
  { ...read("Join the waiting queue", { address: "w1/join", action: "press" }), screen: 1 },
] satisfies Probe[];
