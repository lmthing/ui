import { z } from "zod";
import * as c from "../../../catalog";

const statuses = ["new", "booked", "fixed"] as const;

// Core first: Timeline/history cannot summarize a rental fault and change its current repair status.
export const meta = {
  id: "Request",
  status: "draft",
  group: "input",
  purpose: "Review one rental repair and share its status and brief updates.",
  pick: "One rental-repair summary with location, priority, status, assignee and short updates. Not a history-only view (Timeline), any queue, triage, conversation, work order or request workflow (requests pack), staff leave (Approval), or a general board (Board).",
  writeHints: [
    "Use new, booked or fixed. Include up to four short updates, each with a time label. Never write a second request, thread, workflow or separate work order.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A shared repair record connects the tenant and landlord; the landlord changes status.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "title", "where", "photo", "priority", "status", "who", "updates", "update"],
  items: { key: "updates", parts: ["root", "time", "text"] },
  states: ["filled", "success"],
  actions: { parts: { status: ["select"], update: ["type"] } },
  selections: { status: { prop: "status", choices: statuses } },
  live: { text: { update: { prop: "update", max: 36 } } },
  readSuccess: true,
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(32),
  where: c.text(24),
  photo: c.photo.optional(),
  priority: z.enum(["low", "normal", "urgent"]),
  status: z.enum(statuses),
  who: c.text(20).optional(),
  updates: z
    .array(z.strictObject({ time: c.text(12), text: c.text(36) }))
    .min(0)
    .max(4),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const row = c.itemsOf(cast, 1)[0];
  return {
    title: (row && c.titleOf(row, 32, thing)) ?? c.placeholderTitle(0, lang),
    where: (row && c.detailOf(row, 24, thing)) ?? c.clip(c.wordsFor(lang).placeholderLabel, 24),
    priority: "normal",
    status: "new",
    updates: [],
  };
}

export const examples = [
  {
    title: "Patio tap is leaking",
    where: "Patio flat",
    photo: "local:1",
    priority: "urgent",
    status: "new",
    who: "Ana",
    updates: [{ time: "09:15", text: "Tenant turned off the tap." }],
  },
  {
    title: "Loose yard gate latch",
    where: "Trail house",
    priority: "normal",
    status: "fixed",
    updates: [{ time: "Tuesday", text: "Fitted a new latch." }],
    density: "compact",
    surface: "plain",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Request");
export const probes = [
  choose(
    "Summarize one rental's leaking tap with a photo, urgency, who is on it and a new/booked/fixed control. No queue or thread.",
  ),
  choose(
    "Show a read-only chronology of past repair events, each with one date and title. No current fault card or status editor.",
    "Timeline",
  ),
  write(
    "One shared repair summary: Patio tap is leaking at Patio flat, photo local:1, urgent and new; Ana is on it. 09:15: Tenant turned off the tap.",
  ),
  read("As landlord, change the patio tap repair status to booked", {
    address: "r1/status",
    action: "select",
  }),
] satisfies c.Probe[];
