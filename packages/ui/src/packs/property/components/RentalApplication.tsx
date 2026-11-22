import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { applicationCopy, applicationDecision, applicationDecisions, applicationGates, applicationReading, applicationNoteMax } from "../copy";
import { propertyWordsFor } from "../lang";
import { distinct, ref, seedDate, seedLabels } from "../seeds";
import { prompt } from "../../../entry/prompt-RentalApplication.generated";

const recordRef = ref.meta({ kind: "id" });
const decisionParts = ["waitlist", "approve", "decline", "note"] as const;

// Core first: KeyValue/rows lists fixed facts but cannot calculate affordability or confirm a screening decision.
// prettier-ignore
export const meta = {
  id: "RentalApplication", status: "ready", group: "input", tier: "phone",
  ...prompt,
  region: "body", weight: 2,
  realPath: "Decisions and entered screening records stay on the manager’s device; pulling reports or notifying an applicant requires a separate host.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["check_note", ...decisionParts] } },
  parts: ["root", "unit", "move_in", "decision", "ratio", "household_income", "monthly_rent", "message", ...decisionParts],
  items: { key: "checks", parts: ["root", "kind", "status", "check_note"] },
  actions: {
    parts: { waitlist: ["press"], approve: ["press"], decline: ["press"], note: ["type"] },
    items: { root: ["press"] },
    when: {
      root: { linked: true }, waitlist: { canWaitlist: true }, approve: { canDecide: true }, decline: { canDecide: true }, note: { canDecide: true },
    },
  },
  localState: applicationDecision,
  live: { derive: applicationGates },
  confirmParts: ["approve", "decline"],
  states: ["filled", "empty", "loading", "success", "error"],
  readSuccess: true, read: applicationReading,
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  applicationRef: recordRef, unitRef: recordRef, unit: c.text(32),
  monthlyRent: z.number().positive(),
  applicants: z.array(z.strictObject({ name: c.text(24), monthlyIncome: z.number().min(0), goto: c.screenId.optional() })).min(1).max(4),
  moveIn: c.isoDate,
  checks: z.array(z.strictObject({
    kind: z.enum(["credit", "background", "income", "refs"]),
    status: z.enum(["pending", "passed", "flagged", "missing"]),
    note: c.text(60).meta({ kind: undefined }).optional(), goto: c.screenId.optional(),
  })).min(1).max(4),
  decision: applicationDecisions.default("pending"),
  note: c.text(applicationNoteMax).meta({ kind: undefined }).optional(),
}).refine(({ checks }) => distinct(checks, ({ kind }) => kind), { path: ["checks"] })
  .refine(({ applicants, monthlyRent }) => {
    const total = applicants.reduce((sum, applicant) => sum + applicant.monthlyIncome, 0);
    return Number.isFinite(total / monthlyRent);
  }, { path: ["monthlyRent"] });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const [seed] = seedLabels(input);
  return {
    applicationRef: `${seed!.ref}_application`,
    unitRef: seed!.ref,
    unit: seed!.title,
    monthlyRent: 1,
    applicants: [{ name: seed!.short, monthlyIncome: 0 }],
    moveIn: seedDate,
    checks: [{ kind: "credit", status: "pending" }],
  };
}

// prettier-ignore
export const examples = [
  {
    applicationRef: "noor_cedar", unitRef: "flat_b", unit: "Cedar Flat", monthlyRent: 1400, moveIn: "2027-01-12",
    applicants: [{ name: "Noor Desai", monthlyIncome: 3200, goto: "noor_profile" }, { name: "Sam Ortiz", monthlyIncome: 1700 }],
    checks: [{ kind: "credit", status: "passed", goto: "credit_details" }, { kind: "income", status: "passed" },
      { kind: "refs", status: "pending", note: "Waiting for the previous landlord." }, { kind: "background", status: "passed" }],
    note: "Flexible on the move-in date.",
  },
  {
    applicationRef: "lee_willow", unitRef: "flat_a", unit: "Willow Flat", monthlyRent: 1200, moveIn: "2027-02-03",
    applicants: [{ name: "Lee Morgan", monthlyIncome: 3600 }],
    checks: [{ kind: "credit", status: "flagged" }, { kind: "refs", status: "missing" }],
    decision: "waitlisted", detail: "brief",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RentalApplication");
const brief =
  "Review Noor's rental application noor_cedar for Cedar Flat (flat_b), moving in 2027-01-12. Rent is 1400 monthly, Noor earns 3200 and Sam earns 1700 monthly. The credit check passed and references are pending.";
// prettier-ignore
export const probes = [
  choose("Review a prospective tenant and co-applicant for one specific rental unit: compare their household income with rent, show credit and reference check results, then let me approve or decline the application."),
  choose("Show a read-only list of labeled facts about one flat: floor, bedroom count and which direction the windows face. No application, checklist or actions.", "KeyValue"),
  write(brief),
  { ...write(`${brief} I only want the brief summary with the ratio and check status, without notes or decision buttons.`), variant: { axis: "detail", value: "brief" } },
  read("Which control waitlists the application without approving or declining it?", { address: "r1/waitlist", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta> & Omit<ReturnType<typeof applicationGates>, "checks">;
type Density = c.ThemeDensity;
type Copy = ReturnType<typeof applicationCopy>;

// prettier-ignore
function CheckRow({ row, full, density, copy, active }: { row: View["checks"][number]; full: boolean; density: Density; copy: Copy; active: boolean }) {
  const check = copy.check(row);
  const loading = kit.useComponentState() === "loading";
  const part = kit.usePartContext();
  return <kit.PartScope {...part} item={row.id}>
    <kit.KitRow label={check.label} goto={active && !loading ? row.goto : undefined} part={loading ? null : "root"}
      inline={!full || !row.note} inset="none" {...{ density }}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitMetaLine title={{ part: "kind", text: check.label, role: "meta", strong: true }}
          meta={{ part: "check_note", text: full ? row.note : undefined }} {...{ density }} />
        {loading ? <kit.KitLayoutText line={{ text: check.status, role: "meta" }} {...{ density }} />
          : <kit.KitTrail part="status" kind="badge" value={check.status} tone={check.tone} {...{ density }} />}
      </kit.KitGrid>
    </kit.KitRow>
  </kit.PartScope>;
}

// prettier-ignore
function Decisions({ live, density, active, copy }: { live: View; density: Density; active: boolean; copy: Copy }) {
  const { words } = copy;
  const editable = active && live.canDecide;
  if (!editable && !live.note) return null;
  return <kit.KitContent group="response" {...{ density }}>
    <kit.KitInput part="note" label={words.note} hint={words.note} value={live.note ?? ""} disabled={!editable} projected />
    {editable && <kit.KitActionFooter {...{ density }}>
      <kit.KitAction part="approve" label={words.approve} contentParts={{}} />
      {live.canWaitlist && <kit.KitAction part="waitlist" label={words.waitlist} kind="secondary" contentParts={{}} />}
      <kit.KitAction part="decline" label={words.decline} kind="danger" contentParts={{}} />
    </kit.KitActionFooter>}
  </kit.KitContent>;
}

// prettier-ignore
function Dossier({ live, density, full, copy }: { live: View; density: Density; full: boolean; copy: Copy }) {
  const state = kit.useComponentState(), active = state === "filled", loading = state === "loading";
  const { words } = copy, summary = copy.summary(live);
  return <>
    <kit.KitHeader density={density} title={{ part: "unit", text: live.unit, role: "body", strong: true }}
      meta={[{ text: summary.applicants }, { part: "move_in", text: summary.moveIn },
        { part: "decision", text: state === "success" && live.decision === "pending" ? undefined : words.decisions[live.decision] }]} />
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitFigure density={density} value={{ part: "ratio", text: summary.ratio }}
        unit={{ text: words.ratio, role: "meta" }} />
      <kit.KitLayoutText line={{ part: "household_income", text: summary.householdIncome, role: "meta", tone: "muted" }} {...{ density }} />
      <kit.KitLayoutText line={{ part: "monthly_rent", text: summary.monthlyRent, role: "meta", tone: "muted" }} {...{ density }} />
    </kit.KitContent>
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitLayoutText line={{ text: words.checks, role: "meta", strong: true }} {...{ density }} />
      <kit.KitRowGroup {...{ density }}>
        {live.checks.map((row) => <CheckRow key={row.id} {...{ row, full, density, copy, active: active || loading }} />)}
      </kit.KitRowGroup>
    </kit.KitContent>
    {full && <Decisions {...{ live, density, copy, active: active || loading }} />}
  </>;
}

// prettier-ignore
export function RentalApplication(input: c.Props<typeof props, typeof meta>) {
  const state = kit.useComponentState(), { lang } = kit.useWords();
  const thing = kit.useEmptyThing();
  const copy = applicationCopy(lang, kit.useAppCurrency());
  const live = kit.useLiveControls(meta, input) as View;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const layout = <Dossier {...{ live, density, full, copy }} />;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitState part="message" icon={state === "empty" ? "file_text" : undefined} retain
      message={(state === "empty" && !thing) || state === "error" || state === "success" ? copy.words[state] : undefined}
      loading={layout} {...{ density }}>{layout}</kit.KitState>
  </kit.KitCard>;
}
