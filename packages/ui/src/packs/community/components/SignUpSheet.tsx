import { z } from "zod";
import * as c from "../../../catalog";
import { distinct, ref, seedTitle } from "../seeds";

// Core first: Checklist/default ticks jobs, not limited places with claim ownership and release.
export const meta = {
  id: "SignUpSheet",
  status: "draft",
  group: "input",
  purpose: "Let group members claim or release a limited contribution place.",
  pick: "A shared contribution sheet with counted places, claimants and claim/release for an ongoing group. Not a private task list (Checklist), bookable times (Slots), gifts (Registry) or staff cover (OpenShift).",
  writeHints: [
    "Use unique snake_case slot ids. Claims must name an existing slot and be unique per member per slot; never exceed capacity. Do not write claimed or remaining counts.",
    'Use style "compact" only for rows that expand to reveal claimants, not simply for tighter spacing (density).',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  realPath:
    "A shared app atomically reserves the remaining places and lets each member release only their own claim.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "title"],
  items: {
    key: "slots",
    parts: ["root", "title", "meta", "capacity", "remaining", "claimants", "claim", "release"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["toggle"], claim: ["press"], release: ["press"] },
    when: { root: { style: "compact" }, claim: { can_claim: true }, release: { own_claim: true } },
  },
  confirmParts: ["release"],
} as const satisfies c.Meta;

const slot = z.strictObject({
  id: ref,
  title: c.text(32),
  meta: c.text(36).optional(),
  capacity: z.int().min(1).max(12),
});
const claim = z.strictObject({ slotId: ref, memberId: ref });
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(40),
    slots: z.array(slot).min(1).max(12),
    claims: z.array(claim).min(0).max(48),
    style: z.enum(["slots", "compact"]).default("slots"),
  })
  .refine(({ slots }) => distinct(slots, (row) => row.id), { path: ["slots"] })
  .refine(
    ({ slots, claims }) =>
      distinct(claims, ({ slotId, memberId }) => `${slotId}/${memberId}`) &&
      claims.every((row) => slots.some(({ id }) => row.slotId === id)) &&
      slots.every(({ id, capacity }) => claims.filter(({ slotId }) => slotId === id).length <= capacity),
    { path: ["claims"] },
  )
  .overwrite((input) => ({
    ...input,
    slots: input.slots.map((row) => ({
      ...row,
      slotId: row.id,
    })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    title: seedTitle(input, 40),
    slots: [{ id: "slot_1", title: seedTitle(input, 32), capacity: 1 }],
    claims: [],
  };
}

export const examples: z.input<typeof props>[] = [
  {
    title: "Seed swap contributions",
    slots: [
      { id: "tables", title: "Bring a folding table", meta: "Drop off by 9 am", capacity: 2 },
      { id: "sign", title: "Bring the welcome sign", capacity: 1 },
    ],
    claims: [
      { slotId: "tables", memberId: "ana" },
      { slotId: "sign", memberId: "lee" },
    ],
  },
  {
    title: "Choir open evening",
    style: "compact",
    density: "compact",
    surface: "outlined",
    slots: [{ id: "tea", title: "Bring refreshments", capacity: 3 }],
    claims: [],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SignUpSheet");
export const probes = [
  choose(
    "Our association members can reserve one of two places to bring a table, see who has claimed them, and release their own place.",
  ),
  choose(
    "Give me a private list of jobs to tick when done, like bringing tables and making signs. No reservations.",
    "Checklist",
  ),
  write(
    "Make the Seed swap contributions sign-up sheet: tables means Bring a folding table, capacity 2, with one place already claimed by ana.",
  ),
  read("Expand the refreshments slot to see who has signed up.", { address: "s1/r1", action: "toggle" }, 1),
] satisfies c.Probe[];
