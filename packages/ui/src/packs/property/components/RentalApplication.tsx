import { z } from "zod";
import {
  clip,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { ref, seedLabels } from "../seeds";

// Core first: KeyValue/card lists fixed facts but cannot compare household income with rent, link screening checks or confirm a decision.
export const meta = {
  id: "RentalApplication",
  status: "draft",
  group: "input",
  tier: "phone",
  pick: "Screening and deciding on prospective tenants before lease start. Not a static facts card (KeyValue), job recruiting (Candidate), viewing appointments (Viewings), or active tenancies (Units).",
  purpose:
    "A prospective tenant screening dossier displaying the applicant and any co-applicants, target unit, requested move-in date.",
  region: "body",
  weight: 2,
  realPath:
    "screening records and decisions stored on the manager's device; pulling external screening reports or notifying applicants uses service / people host adapters.",
  parts: ["root", "waitlist", "approve", "decline", "note"],
  items: { key: "checks", parts: ["root"] },
  actions: {
    parts: { waitlist: ["press"], approve: ["press"], decline: ["press"], note: ["type"] },
    items: { root: ["press"] },
  },
  confirmParts: ["approve", "decline"],
  states: ["filled", "empty", "loading", "success", "error"],
} as const satisfies Meta;
export const props = z.strictObject({
  applicationRef: ref.meta({ kind: "id" }),
  unitRef: ref.meta({ kind: "id" }),
  unit: text(32),
  monthlyRent: z.number().gt(0),
  applicants: z
    .array(z.strictObject({ name: text(24), monthlyIncome: z.number().min(0), goto: screenId.optional() }))
    .min(1)
    .max(4),
  moveIn: isoDate,
  checks: z
    .array(
      z.strictObject({
        kind: z.enum(["credit", "background", "income", "refs"]),
        status: z.enum(["pending", "passed", "flagged", "missing"]),
        note: text(60).optional(),
        goto: screenId.optional(),
      }),
    )
    .min(1)
    .max(4),
  decision: z.enum(["pending", "waitlisted", "approved", "declined"]).default("pending"),
  note: text(120).optional(),
  style: z.enum(["dossier", "compact"]).default("dossier"),
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
    applicationRef: `${seed!.ref}_application`,
    unitRef: seed!.ref,
    unit: castTitle(32, 0),
    monthlyRent: 0.5,
    applicants: Array.from({ length: 1 }, (_, index) => ({ name: castTitle(24, index), monthlyIncome: 0 })),
    moveIn: "2000-01-01",
    checks: Array.from({ length: 1 }, () => ({ kind: "credit", status: "pending" })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("RentalApplication");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "KeyValue"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/waitlist", action: "press" }),
] satisfies Probe[];

export function RentalApplication(_input: Props<typeof props, typeof meta>) {
  return null;
}
