import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { renewalCopy, renewalExpiry, renewalExpired, renewalGates, renewalNoteMax, renewalReading, renewalResponse, renewalStatuses } from "../copy";
import { propertyWordsFor } from "../lang";
import { ref, seedDate, seedLabels } from "../seeds";

const recordRef = ref.meta({ kind: "id" });

// Core first: Choice/single picks a term but cannot compare lease rents or confirm a tenant response.
// prettier-ignore
export const meta = {
  id: "LeaseRenewal", status: "ready", group: "input", tier: "people",
  purpose: "Compare rent and term choices for an occupied unit and respond to the renewal offer.",
  pick: "An occupied unit’s lease renewal proposal: compare current and offered rent, choose a renewal term and accept, counter or decline by a deadline. Not a standalone choice (Choice), a policy expiry reminder (Renewals), a monthly rent ledger (RentRoll), or existing lease terms (Lease).",
  writeHints: [
    "Use snake_case renewal and unit refs, a real YYYY-MM-DD deadline, and unformatted positive rents. Term months are whole numbers, with 0 for month-to-month. An option without rent uses proposedRent; do not write a delta.",
    'Set selectedOption to the zero-based position of the chosen option when specified. Use style "summary" for a read-only outcome after a response.',
    "Hide per-option term explanations with \"detail\":\"brief\". Leave detail null for the default explanations.",
  ],
  region: "body", weight: 2,
  realPath: "A shared app delivers the proposal and response between tenant and landlord; a counter does not amend the lease.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  parts: ["root", "unit", "tenant", "deadline", "status", "current_rent", "proposed_rent", "change",
    "selected_term", "message", "note", "accept", "counter", "decline"],
  items: { key: "options", parts: ["root", "title", "sub", "value"], addressedWhen: { style: "offer" } },
  select: { prop: "selectedOption", value: "index" },
  actions: {
    parts: { accept: ["press"], counter: ["press"], decline: ["press"], note: ["type"] },
    items: { root: ["select"] },
    when: {
      "root.select": { canRespond: true, expired: false }, accept: { canRespond: true, expired: false },
      decline: { canRespond: true, expired: false }, note: { canRespond: true, expired: false },
      counter: { canCounter: true, expired: false },
    },
  },
  partTiers: { root: "phone", note: "phone", accept: "people", counter: "people", decline: "people" },
  confirmParts: ["accept", "decline"],
  localState: renewalResponse,
  live: { derive: renewalGates },
  deviceDataFlags: { expired: (_data, input, now) => renewalExpired(input, now) },
  deviceDataWake: (_data, input, now) => renewalExpiry(input, now),
  states: ["filled", "loading", "success", "error"],
  readSuccess: true, read: renewalReading,
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  renewalRef: recordRef, unitRef: recordRef, unit: c.text(32), tenant: c.text(24),
  currentRent: z.number().positive(), proposedRent: z.number().positive(),
  options: z.array(z.strictObject({
    label: c.text(16).meta({ read: false }), months: z.int().min(0).max(36), rent: z.number().positive().optional(),
  })).min(1).max(4),
  selectedOption: z.int().min(0).max(3).default(0), deadline: c.isoDate,
  status: renewalStatuses.default("sent"),
  counterNote: c.text(renewalNoteMax).meta({ read: false }).optional(),
  style: z.enum(["offer", "summary"]).default("offer"),
}).refine(({ selectedOption, options }) => selectedOption < options.length, { path: ["selectedOption"] })
  .refine(({ currentRent, proposedRent, options }) =>
    [proposedRent, ...options.map(({ rent }) => rent ?? proposedRent)].every((rent) => Number.isFinite(rent / currentRent)),
    { path: ["currentRent"] });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const [seed] = seedLabels(input);
  return {
    renewalRef: `${seed!.ref}_renewal`,
    unitRef: seed!.ref,
    unit: seed!.title,
    tenant: seed!.short,
    currentRent: 1,
    proposedRent: 1,
    options: [{ label: c.clip(seed!.short, 16), months: 0 }],
    deadline: seedDate,
  };
}

// prettier-ignore
export const examples = [
  {
    renewalRef: "asha_willow", unitRef: "flat_a", unit: "Willow Flat", tenant: "Asha Patel",
    currentRent: 1400, proposedRent: 1450, deadline: "2028-12-15",
    options: [{ label: "12 months", months: 12 }, { label: "6 months", months: 6, rent: 1500 },
      { label: "Month to month", months: 0, rent: 1550 }],
    counterNote: "Could we keep the current rent?",
  },
  {
    renewalRef: "lee_cedar", unitRef: "flat_b", unit: "Cedar Flat", tenant: "Lee Morgan",
    currentRent: 1250, proposedRent: 1280, deadline: "2027-03-01",
    options: [{ label: "6 months", months: 6 }, { label: "12 months", months: 12, rent: 1250 }],
    selectedOption: 1, status: "accepted", style: "summary",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("LeaseRenewal");
const brief =
  "Make a tenant renewal offer asha_willow for Asha Patel at Willow Flat (flat_a) due 2028-12-15. Current monthly rent 1400, proposed monthly rent 1450. Offer 12 months at the proposed rent and 6 months at 1500.";
// prettier-ignore
export const probes = [
  choose("My current tenant needs to decide whether to renew her apartment lease. Compare her old and new monthly rent, offer six or twelve months, and let her accept, counter or decline before the deadline."),
  choose("Let me pick one of three picnic menus. Each has a title and a sentence describing what’s included. No deadline, contract, price or separate reply.", "Choice"),
  write(brief),
  { ...write(`${brief} Keep both term options but hide their explanatory lines. Show only each option's title and rent.`), variant: { axis: "detail", value: "brief" } },
  read("Which control accepts the currently selected renewal term?", { address: "l1/accept", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta> & ReturnType<typeof renewalGates> & { expired?: boolean };
type Copy = ReturnType<typeof renewalCopy>;
type Density = c.ThemeDensity;

// prettier-ignore
function Terms({ live, density, full, active, copy }: { live: View; density: Density; full: boolean; active: boolean; copy: Copy }) {
  const state = kit.useComponentState(), loading = state === "loading";
  const scope = kit.usePartContext();
  const selected = live.options[live.selectedOption]!;
  if (live.style === "summary" || state === "success") return <kit.KitLayoutText density={density}
    line={{ part: "selected_term", text: copy.words.selectedTerm(selected.label), role: "meta" }} />;
  return <kit.KitContent group="response" rhythm="flush" {...{ density }}>
    <kit.KitLayoutText density={density} line={{ text: copy.words.options, role: "meta", strong: true }} />
    <kit.KitRowGroup separators={!loading} {...{ density }}>
      {live.options.map((row, index) => {
        const selected = index === live.selectedOption;
        const { title, sub, value } = copy.option(row, live.proposedRent, full, selected);
        return <kit.PartScope key={row.id} {...scope} item={row.id}>
          <kit.KitRow part={loading ? null : "root"} inset="none" label={title} density={density}
            lineRole="label" surface="plain" role={active ? "button" : "text"}>
            <kit.KitGrid fitLast density={density}>
              <kit.KitMetaLine density={density}
                title={{ part: "title", text: title, role: "meta", strong: true, ...(selected ? { tone: "accent" } : {}) }}
                meta={{ part: "sub", text: sub }} />
              <kit.KitLayoutText density={density} align="end" line={{ part: "value", text: value, compact: true, role: "figure", tabular: true }} />
            </kit.KitGrid>
          </kit.KitRow>
        </kit.PartScope>;
      })}
    </kit.KitRowGroup>
  </kit.KitContent>;
}

// prettier-ignore
function Response({ live, density, active, copy }: { live: View; density: Density; active: boolean; copy: Copy }) {
  const { words } = copy;
  if (!active && !live.counterNote) return null;
  return <kit.KitContent group="response" {...{ density }}>
    <kit.KitInput part="note" label={words.note} hint={words.note} value={live.counterNote ?? ""} disabled={!active} projected />
    {active && <kit.KitActionFooter {...{ density }}>
      <kit.KitAction part="accept" label={words.accept} contentParts={{}} />
      {live.canCounter && <kit.KitAction part="counter" label={words.counter} kind="secondary" contentParts={{}} />}
      <kit.KitAction part="decline" label={words.decline} kind="danger" contentParts={{}} />
    </kit.KitActionFooter>}
  </kit.KitContent>;
}

// prettier-ignore
function Offer({ live, density, full, copy, state }: { live: View; density: Density; full: boolean; copy: Copy; state: c.StateName }) {
  const { words } = copy, summary = copy.summary(live);
  const active = state === "filled" && live.canRespond && !live.expired;
  return <>
    <kit.KitHeader density={density} title={{ part: "unit", text: live.unit, role: "body", strong: true }}
      meta={[{ part: "tenant", text: live.tenant }, { part: "deadline", text: summary.deadline },
        { part: "status", text: state === "success" && live.status === "sent" ? undefined : words.statuses[live.status] }]} />
    <kit.KitContent group="response" rhythm="flush" {...{ density }}>
      <kit.KitLayoutText density={density} line={{ text: words.proposed, role: "meta", strong: true }} />
      <kit.KitFigure density={density} value={{ part: "proposed_rent", text: summary.proposed }} unit={{ text: words.monthly, role: "meta" }} />
    </kit.KitContent>
    <kit.KitMetaLine title={{ part: "current_rent", text: summary.current, role: "meta", tone: "muted" }}
      meta={{ part: "change", text: summary.change }} {...{ density }} />
    <Terms {...{ live, density, full, copy, active }} />
    {live.style === "offer" && <Response {...{ live, density, copy, active: active || state === "loading" && live.canRespond }} />}
  </>;
}

// prettier-ignore
export function LeaseRenewal(input: c.Props<typeof props, typeof meta>) {
  const state = kit.useComponentState(), { lang, words } = kit.useWords(propertyWordsFor);
  const copy = renewalCopy(lang, kit.useAppCurrency(), words.renewals);
  const live = kit.useLiveControls(meta, input) as View;
  const density = kit.useKit().density;
  const surface = "card";
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const layout = <Offer {...{ live, density, full, copy, state }} />;
  const expired = live.expired && live.status === "sent";
  const message = expired ? copy.words.expired : state === "success" || state === "error" ? copy.words[state] : undefined;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitState part="message" {...{ message, density }} retain loading={layout}>
      {state === "filled" && expired && <kit.KitLayoutText density={density}
        line={{ part: "message", text: copy.words.expired, role: "meta", tone: "bad" }} />}
      {layout}
    </kit.KitState>
  </kit.KitCard>;
}
