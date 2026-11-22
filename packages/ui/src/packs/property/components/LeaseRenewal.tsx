import { z } from "zod";
import {
  clip,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { ref, seedLabels } from "../seeds";

// Core first: Choice/single picks a term but cannot compare lease rents or confirm a tenant response.
export const meta = {
  id: "LeaseRenewal",
  status: "draft",
  group: "input",
  tier: "people",
  pick: "Proposing, comparing, and responding to lease renewal terms for an occupied unit. Not a simple choice (Choice), generic policy expiry (Renewals), a monthly rent ledger (RentRoll), or existing lease terms (Lease).",
  purpose:
    "A landlord-to-tenant lease renewal proposal comparing current monthly rent against the proposed rent with a code-computed.",
  region: "body",
  weight: 2,
  realPath:
    "renewal proposal shared between landlord and resident in a shared app (people); counter-offers record the tenant's preference without silently altering legal lease contracts.",
  parts: ["root", "accept", "counter", "decline", "note"],
  items: { key: "options", parts: ["root"] },
  actions: {
    parts: { accept: ["press"], counter: ["press"], decline: ["press"], note: ["type"] },
    items: { root: ["select"] },
  },
  confirmParts: ["accept", "decline"],
  states: ["filled", "loading", "success", "error"],
} as const satisfies Meta;
export const props = z
  .strictObject({
    renewalRef: ref.meta({ kind: "id" }),
    unitRef: ref.meta({ kind: "id" }),
    unit: text(32),
    tenant: text(24),
    currentRent: z.number().gt(0),
    proposedRent: z.number().gt(0),
    options: z
      .array(
        z.strictObject({
          label: text(16),
          months: z.int().min(0).max(36),
          rent: z.number().gt(0).optional(),
        }),
      )
      .min(1)
      .max(4),
    selectedOption: z.int().min(0).max(3).default(0),
    deadline: isoDate,
    status: z.enum(["sent", "accepted", "countered", "declined"]).default("sent"),
    counterNote: text(120).optional(),
    style: z.enum(["offer", "summary"]).default("offer"),
  })
  .refine((input) => input.selectedOption === undefined || input.selectedOption < input.options.length, {
    path: ["selectedOption"],
  });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const [seed] = seedLabels({ cast, lang });
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    renewalRef: `${seed!.ref}_renewal`,
    unitRef: seed!.ref,
    unit: castTitle(32, 0),
    tenant: castTitle(24, 0),
    currentRent: 0.5,
    proposedRent: 0.5,
    options: Array.from({ length: 1 }, (_, index) => ({ label: castTitle(16, index), months: 0 })),
    deadline: "2000-01-01",
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("LeaseRenewal");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "Choice"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/accept", action: "press" }),
] satisfies Probe[];

export function LeaseRenewal(_input: Props<typeof props, typeof meta>) {
  return null;
}
