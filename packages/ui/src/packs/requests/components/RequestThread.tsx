import { z } from "zod";
import * as c from "../../../catalog";
import { requestStatus } from "./RequestQueue";

const audiences = ["requester", "internal"] as const;

// Core first: Bubbles/default cannot interleave typed work events or distinguish staff-only notes.
export const meta = {
  id: "RequestThread",
  status: "draft",
  group: "content",
  purpose: "Follow one request through staff updates, work events and replies.",
  pick: "One service ticket's replies interleaved with typed status, assignment and work-order events, with staff-only or requester-visible audiences. Not an ordinary chat (Bubbles), read-only history (Timeline), general audit (ActivityLog), or post replies (Comments).",
  writeHints: [
    "Each entry has by, date, time and audience. Set only fields for its kind: message = text and optional photo; status = from/to; assignment = who; work = order/goto. Other fields must be null.",
    'For shorter event details but the same reply text, use detail "brief". The host filters internal entries for requesters and authors new operational events.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  partTiers: { send: "people" },
  realPath: "Messages and operational events are linked to one request in a shared app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["event_detail"] } },
  parts: ["root", "number", "field", "audience", "send"],
  items: {
    key: "entries",
    parts: ["root", "by", "date", "time", "audience", "text", "photo", "event_detail"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { field: ["type"], audience: ["select"], send: ["send"] },
    items: { root: ["press"] },
    when: { root: { kind: "work" }, send: { sendable: true } },
  },
  emptyActions: ["field.type", "audience.select", "send.send"],
  selections: { audience: { prop: "audience", choices: audiences } },
  read: (input): string[] => {
    const { entries, detail } = input as z.output<typeof props>;
    return entries.map(({ by, date, time, audience, kind, from, to, who, order }) => {
      const fact = kind === "status" ? `${from} → ${to}` : kind === "assignment" ? who : order;
      return `${by} ${date} ${time} (${audience}, ${kind})${fact && detail === "full" ? ` ${fact}` : ""}`;
    });
  },
} as const satisfies c.Meta;

const entry = z
  .strictObject({
    by: c.text(24),
    date: c.isoDate,
    time: c.clock,
    audience: z.enum(audiences),
    kind: z.enum(["message", "status", "assignment", "work"]),
    text: c.text(240).optional(),
    photo: c.photo.optional(),
    from: requestStatus.optional(),
    to: requestStatus.optional(),
    who: c.text(24).optional(),
    order: c.text(12).optional(),
    goto: c.screenId.optional(),
  })
  .refine(
    ({ kind, text, photo, from, to, who, order, goto }) =>
      (kind === "message") === Boolean(text) &&
      (kind === "message" || !photo) &&
      (kind === "status") === Boolean(from) &&
      (kind === "status") === Boolean(to) &&
      (kind === "assignment") === Boolean(who) &&
      (kind === "work") === Boolean(order) &&
      (kind === "work") === Boolean(goto),
    "Only fields for the entry kind are allowed",
  );

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    number: c.text(12),
    entries: z.array(entry).min(0).max(6),
    draft: c.text(240).optional(),
    audience: z.enum(audiences).default("requester"),
  })
  .overwrite((value) => ({ ...value, sendable: Boolean(value.draft) }));

export function fallback({ cast }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  const draft = item && c.detailOf(item, 240, c.thingOf(cast));
  return { number: c.placeholderValue, entries: [], draft: draft || undefined };
}

// prettier-ignore
export const examples = [
  { number: "LG-41", draft: "The replacement grow light is due tomorrow.", entries: [
    { by: "Noor", date: "2026-11-19", time: "09:00", audience: "internal", kind: "assignment", who: "Ella" },
    { by: "Ella", date: "2026-11-19", time: "09:30", audience: "internal", kind: "work", order: "WO-14", goto: "work" },
    { by: "Ella", date: "2026-11-19", time: "10:00", audience: "requester", kind: "status", from: "working", to: "waiting" },
    { by: "Ella", date: "2026-11-19", time: "10:15", audience: "internal", kind: "message", text: "The grow light cable is loose.", photo: "local:1" },
  ] },
  { number: "TR-06", detail: "brief", density: "compact", audience: "internal", entries: [
    { by: "Kai", date: "2026-11-20", time: "09:00", audience: "requester", kind: "message", text: "The kennel gate now closes properly." },
    { by: "Kai", date: "2026-11-20", time: "09:15", audience: "requester", kind: "status", from: "working", to: "resolved" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RequestThread");
export const probes = [
  choose(
    "For this repair ticket, mix messages with assignment, status and linked work-order events, and let staff choose who can see each reply",
  ),
  choose(
    "Show a plain two-person chat with alternating message bubbles and no event log or private staff notes",
    "Bubbles",
  ),
  {
    ...write(
      "On ticket TR-06 log Kai moving working to resolved on 2026-11-20 at 09:15 for the requester. Use the shorter event treatment without shortening messages.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open work order WO-14 from the repair updates", { address: "r1/r2", action: "press" }),
  read("Send the drafted reply about the replacement grow light", { address: "r1/send", action: "send" }),
] satisfies c.Probe[];
