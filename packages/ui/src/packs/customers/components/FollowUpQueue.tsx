import { z } from "zod";
import * as c from "../../../catalog";
import { paymentToday } from "../copy";

// Core first: Checklist/default cannot order client outreach by due date or offer snooze and service reminders.
export const meta = {
  id: "FollowUpQueue",
  status: "draft",
  group: "data",
  purpose: "Prioritize client outreach by due date and act on each follow-up.",
  pick: "A prioritized queue of client follow-ups across quotes, invoices, renewals and check-ins. Not plain jobs to tick off (Checklist), a client header (ClientCard), or repair tickets (RequestQueue).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Follow-ups are stored on the business phone; sending a nudge uses SMS or email.",
  parts: ["root", "section", "status"],
  items: {
    key: "items",
    parts: ["root", "clientName", "kind", "due", "note", "amount", "done", "snooze", "remind"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  partTiers: { remind: "service" },
  actions: {
    items: { root: ["press"], done: ["check"], snooze: ["press"], remind: ["press"] },
    when: { done: { done: false }, snooze: { done: false }, remind: { done: false } },
  },
} as const satisfies c.Meta;

const itemProps = z.strictObject({
  id: c.text(24),
  clientName: c.text(24),
  kind: z.enum(["quote", "invoice", "checkin", "renewal"]),
  due: c.isoDate,
  note: c.text(48).optional(),
  amount: z.number().optional(),
  done: z.boolean(),
  goto: c.screenId.optional(),
});
export const props = z.strictObject({
  items: z.array(itemProps).min(1).max(6),
  style: z.enum(["queue", "compact"]).default("queue"),
});
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  const thing = c.thingOf(cast);
  const clientName = (item && c.titleOf(item, 24, thing)) || c.placeholderTitle(0, lang);
  return { items: [{ id: "followup_1", clientName, kind: "checkin", due: paymentToday(), done: false }] };
}

// prettier-ignore
export const examples = [
  { items: [
    { id: "lighting", clientName: "Anna Patel", kind: "quote", due: "2025-11-18", note: "Grow light installation", amount: 85, done: false, goto: "client" },
    { id: "winter", clientName: "Luis Reyes", kind: "checkin", due: "2027-12-02", note: "Winter watering plan", done: false },
  ] },
  { style: "compact", items: [
    { id: "october", clientName: "Ben Carter", kind: "invoice", due: "2025-11-18", amount: 120, done: false },
    { id: "walks", clientName: "Mia Jones", kind: "renewal", due: "2027-12-03", done: true },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("FollowUpQueue");
export const probes = [
  choose(
    "Prioritize who I should contact about unpaid invoices, outstanding quotes and upcoming client check-ins; let me snooze or send a nudge for each",
  ),
  choose("Tick off my three chores before leaving home", "Checklist"),
  write("I need to follow up with Anna Patel on a quote for 85 due 2025-11-18. It isn't done."),
  read("Send Anna Patel a reminder about the grow light quote", { address: "f1/r1/remind", action: "press" }),
] satisfies c.Probe[];
