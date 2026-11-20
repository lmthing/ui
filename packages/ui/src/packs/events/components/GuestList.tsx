import { z } from "zod";
import * as c from "../../../catalog";
import { seedTitles } from "../seeds";

// Core first: People/rows cannot group invitations by party or track replies, plus-ones and diets.
const statuses = ["yes", "no", "maybe", "waiting"] as const;
export const meta = {
  id: "GuestList",
  status: "draft",
  group: "data",
  purpose: "Track who is invited, who is coming and what each party needs.",
  pick: "An event's invitation roster with party groups, RSVP statuses, plus-ones and dietary needs. Not a plain roster of people (People), a guest sending their own reply (RSVP), clients (ClientCard) or a squad's availability (Squad).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath: "The organiser keeps the list on the device; reminders are sent by message or email.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "counts", "remind"],
  items: { key: "guests", parts: ["root", "name", "party", "status", "plus", "diet"] },
  partTiers: { remind: "service" },
  states: ["filled", "empty", "loading"],
  actions: {
    parts: { remind: ["press"] },
    items: { root: ["press"] },
    when: { remind: { hasWaiting: true } },
  },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { guests } = input as z.output<typeof props>;
    const parties = new Map<string | number, { label: string; lines: string[] }>();
    for (const [index, guest] of guests.entries()) {
      const key = guest.party ?? index;
      const plus = guest.plus ? ` +${c.numberLine(guest.plus, lang)}` : "";
      const line = [guest.name + plus, guest.status, guest.diet].filter(Boolean).join(" · ");
      const party = parties.get(key);
      if (party) party.lines.push(line);
      else parties.set(key, { label: guest.party ?? guest.name, lines: [line] });
    }
    return [
      statuses
        .map(
          (status) =>
            `${status}: ${c.numberLine(guests.filter((guest) => guest.status === status).length, lang)}`,
        )
        .join(" · "),
      ...Array.from(parties.values(), ({ label, lines }) => `${label}: ${lines.join("; ")}`),
    ];
  },
} as const satisfies c.Meta;

const guest = z.strictObject({
  name: c.text(24),
  party: c.text(16).optional(),
  status: z.enum(statuses),
  plus: z.int().min(0).max(4),
  diet: c.text(16).optional(),
  goto: c.screenId,
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    guests: z.array(guest).min(1).max(30),
  })
  .overwrite((input) => ({ ...input, hasWaiting: input.guests.some(({ status }) => status === "waiting") }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    guests: seedTitles(input, 24, 3).map((name) => ({ name, status: "waiting", plus: 0, goto: "details" })),
  };
}

export const examples = [
  {
    guests: [
      { name: "Ruth Shah", party: "Shah family", status: "yes", plus: 1, diet: "Vegetarian", goto: "ruth" },
      { name: "Deepa Shah", party: "Shah family", status: "waiting", plus: 0, goto: "deepa" },
    ],
  },
  {
    density: "compact",
    surface: "outlined",
    guests: [
      { name: "Imani Cole", status: "maybe", plus: 1, goto: "imani" },
      { name: "Hugo Wells", status: "no", plus: 0, goto: "hugo" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("GuestList");
export const probes = [
  choose(
    "As the party organiser, show everyone invited in household groups, their reply status, extra guests and dietary needs. Let me remind those still waiting.",
  ),
  choose(
    "Show the hosts as a simple roster with names, portraits and roles, with no invitations or replies.",
    "People",
  ),
  write(
    "Track gala invites for the Shah household: Ruth Shah said yes with one extra guest and needs vegetarian food, open ruth; Deepa Shah is waiting, no extra guests, open deepa.",
  ),
  read("Send a reminder to everyone who hasn't replied yet.", { address: "g1/remind", action: "press" }),
] satisfies c.Probe[];
