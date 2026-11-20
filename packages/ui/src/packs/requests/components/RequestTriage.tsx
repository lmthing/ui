import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { triageReading } from "../copy";
import { requestsWordsFor } from "../lang";
import { urgency } from "./RequestQueue";

// prettier-ignore
const maxChoices = 6, maxReason = 120;

// Core first: Field/choice cannot compare reported urgency with priority or link a duplicate.
// prettier-ignore
export const meta = {
  id: "RequestTriage", status: "ready", group: "input",
  purpose: "Prioritise and route a report, or link it to an existing request.",
  pick: "Triage one incoming service report: compare reported urgency with impact, set effective priority and route it or link a duplicate. Not a simple form dropdown (Field) or manager permission (Approval).",
  writeHints: [
    "at and duplicateAt are zero-based indices. A chosen duplicate needs a reason and must not have the report's own number.",
    'For the decision only, set detail "brief" and density null. Keep the report number and title in the data. Only set density when spacing is requested.',
  ],
  region: "body", weight: 2, tier: "phone",
  realPath: "A routing decision saved with the request on the operator's device.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["number", "title", "reported_urgency", "impact"] } },
  parts: ["root", "number", "title", "reported_urgency", "impact", "priority", "queues", "reason", "apply", "apply_label"],
  items: { key: "choices", parts: ["root", "label", "number", "title", "link", "link_label"] },
  states: ["filled", "loading", "success", "error"],
  confirmParts: ["apply"],
  actions: {
    parts: { priority: ["select"], reason: ["type"], apply: ["press"] },
    items: { root: ["select", "press"], link: ["select"] },
    when: {
      "root.select": { kind: "queue", canTriage: true },
      "root.press": { kind: "duplicate" },
      reason: { canTriage: true }, priority: { canTriage: true },
      link: { kind: "duplicate", canLink: true }, apply: { canApply: true },
    },
  },
  select: { prop: "apply", value: "index" },
  selections: { priority: { prop: "priority", choices: urgency.options } },
  live: { text: { reason: { prop: "reason", max: maxReason } }, derive: triageGates },
  readSuccess: true, read: triageReading,
} as const satisfies c.Meta;

const duplicate = z.strictObject({ number: c.text(12), title: c.text(32), goto: c.screenId });
// prettier-ignore
const choiceIndex = z.int().min(0).max(maxChoices - 1).optional();
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  number: c.text(12).meta({ kind: undefined }), title: c.text(32).meta({ kind: undefined }),
  reportedUrgency: urgency, impact: z.enum(["one", "several", "site"]), priority: urgency.default("normal"),
  queues: z.array(z.strictObject({ label: c.text(20) })).min(1).max(maxChoices), at: choiceIndex,
  duplicates: z.array(duplicate).min(0).max(maxChoices), duplicateAt: choiceIndex,
  reason: c.text(maxReason).meta({ kind: undefined }).optional(),
})
  .refine(({ at, queues }) => at === undefined || at < queues.length, { path: ["at"] })
  .refine(({ duplicateAt, duplicates, number, reason }) => duplicateAt === undefined ||
    Boolean(duplicates[duplicateAt] && duplicates[duplicateAt].number !== number && reason),
    { path: ["duplicateAt"], message: "Choose a different existing request and give a reason" })
  .overwrite((value) => ({
    ...value, reason: value.reason ?? "",
    apply: value.duplicateAt === undefined ? value.at : value.queues.length + value.duplicateAt,
    choices: [...value.queues.map((queue) => ({ ...queue, kind: "queue" })),
      ...value.duplicates.map(({ goto, ...entry }) => ({ ...entry, root: { goto }, kind: "duplicate" }))],
  }));

// prettier-ignore
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast),
    item = c.itemsOf(cast, 1)[0];
  return {
    number: c.placeholderValue,
    title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(0, lang),
    reportedUrgency: "normal", impact: "one", at: 0,
    queues: [{ label: (item && c.detailOf(item, 20, thing)) || c.placeholderTitle(1, lang) }], duplicates: [],
  };
}

// prettier-ignore
const duplicateExample = { number: "TR-08", title: "Loose gate by the dog run", reportedUrgency: "normal", impact: "site", priority: "urgent",
  queues: [{ label: "Facilities" }], duplicates: [{ number: "TR-07", title: "Dog run latch", goto: "dog_run" }],
  duplicateAt: 0, reason: "Same gate latch in both reports." } satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  { number: "LG-41", title: "Grow light keeps flickering", reportedUrgency: "urgent", impact: "one", priority: "normal", queues: [{ label: "Equipment" }, { label: "Plant care" }], at: 0, duplicates: [] },
  { ...duplicateExample, detail: "brief" }, { ...duplicateExample, density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RequestTriage");
// prettier-ignore
export const probes = [
  choose("Review a newly reported fault, set priority by its impact, send it to the right team, or link it to the ticket we already have"),
  choose("On the report form add one category dropdown with Plant care, Gears and Other", "Field"),
  { ...write("For LG-41 Grow light keeps flickering, reported urgent but affects one shelf, set normal priority and select Equipment from Equipment and Plant care. No duplicates. Show only the decision, not the original report."),
    variant: { axis: "detail", value: "brief" } },
  read("The queue is already selected. Press Apply triage to save the decision without changing the selection.",
    { address: "r1/apply", action: "press" }),
] satisfies c.Probe[];

type Duplicate = z.output<typeof duplicate>;
// prettier-ignore
type Choice = { id: string } & (
  | { kind: "queue"; label: string }
  | { kind: "duplicate"; number: string; title: string; root: { goto: string }; canLink: boolean });
// prettier-ignore
type View = z.output<typeof props> & { choices: Choice[]; apply?: number; canTriage: boolean; canApply: boolean };
type HostFacts = { canTriage: boolean; canLink: (target: Duplicate) => boolean };

/** Bind to the host's authority and canonical, cycle-free target lookup before committing real records. */
export function requestTriageGates(facts: (instance: string) => HostFacts | undefined) {
  return (input: c.Values, instance: string) => deriveTriage(input, facts(instance));
}

// prettier-ignore
function deriveTriage(input: c.Values, facts: HostFacts | undefined) {
  const { choices, apply, number, reason } = input as View;
  const canTriage = facts?.canTriage === true;
  const rows = choices.map((row) => row.kind === "queue" ? row : {
    ...row, canLink: canTriage && Boolean(reason?.trim()) && row.number !== number &&
      facts.canLink({ number: row.number, title: row.title, goto: row.root.goto }),
  });
  const selected = apply === undefined ? undefined : rows[apply];
  return { choices: rows, canTriage, canApply: canTriage && (selected?.kind === "queue" || selected?.canLink === true) };
}

// The unbound catalog is a local preview. Only a host-bound definition is used to commit real records.
function triageGates(input: c.Values): c.Values {
  return deriveTriage(input, { canTriage: true, canLink: () => true });
}

type Density = c.AxisValue<"density">;
type Words = ReturnType<typeof requestsWordsFor>["triage"];

// prettier-ignore
function Report({ p, w }: { p: View; w: Words }) {
  return <kit.KitContent>
    <kit.KitText part="number" role="number" numberScale="compact" tone="muted" tabular>{p.number}</kit.KitText>
    <kit.KitText part="title" role="heading">{p.title}</kit.KitText>
    <kit.KitText part="reported_urgency" role="label" tone="muted">{w.reported(p.reportedUrgency)}</kit.KitText>
    <kit.KitText part="impact" role="label" tone="muted">{w.impact(p.impact)}</kit.KitText>
  </kit.KitContent>;
}

// prettier-ignore
function Duplicates({ p, w, density }: { p: View; w: Words; density: Density }) {
  if (!p.duplicates.length) return null;
  return <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
    <kit.KitText role="label" tone="muted" part={null}>{w.duplicates}</kit.KitText>
    {p.choices.map((row, index) => row.kind === "duplicate" &&
      <kit.KitRow key={row.id} item={row.id} part={null} inline label={row.title}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitRow part="root" inline goto={row.root.goto} label={row.title}>
            <kit.KitText part="number" role="number" numberScale="compact" tone="muted" tabular>{row.number}</kit.KitText>
            <kit.KitText part="title" role="body">{row.title}</kit.KitText>
          </kit.KitRow>
          <kit.KitAction part="link" action="select" value={index} disabled={!row.canLink}
            label={p.apply === index ? w.chosen : w.link} kind={p.apply === index ? "secondary" : "quiet"} />
        </kit.KitGrid>
      </kit.KitRow>)}
  </kit.KitContent>;
}

// prettier-ignore
export function RequestTriage(input: c.Props<typeof props, typeof meta>) {
  const { words: { triage: w } } = kit.useWords(requestsWordsFor), state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density), loading = state === "loading";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail), p = kit.useLiveControls(meta, input) as View;
  const group = density === "compact" ? "content" : "response", priority = detail === "brief" ? w.decision : w.priority;
  const label = (text: string) => loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", text]]} />
    : <kit.KitText role="label" tone="muted" part={null}>{text}</kit.KitText>;
  return <kit.KitCard padded density={density} part="root">
    {state === "success" || state === "error" ? <kit.KitContent>
        <kit.KitText part={null} role="heading" tone={state === "success" ? "good" : "bad"}>{state === "success" ? w.saved : w.error}</kit.KitText>
        {state === "error" && <kit.KitText part={null} role="body" tone="muted">{w.stale}</kit.KitText>}
      </kit.KitContent> : <>
      {detail === "full" && (loading ? <kit.KitSkeleton shape="figure" inset="none"
        content={[["number", p.number, "start", "compact"], ["heading", p.title], ["label", w.reported(p.reportedUrgency)], ["label", w.impact(p.impact)]]} />
        : <Report {...{ p, w }} />)}
      <kit.KitContent density={density} group={detail === "full" ? group : "content"}>{label(priority)}
        <kit.KitTrack part="priority" look="segments" role="radiogroup" label={priority}>
          {urgency.options.map((value) => <kit.KitChip key={value} item={null} label={w.urgency[value]}
            {...{ value }} role="radio" look="segment" on={p.priority === value} disabled={!p.canTriage} />)}
        </kit.KitTrack></kit.KitContent>
      <kit.KitContent density={density} group={group}>{label(w.queue)}
        <kit.KitTrack part="queues" role="radiogroup" label={w.queue}>
          {p.choices.map((row, index) => row.kind === "queue" && <kit.KitChip key={row.id}
            item={row.id} label={row.label} role="radio" on={p.apply === index} disabled={!p.canTriage} />)}
        </kit.KitTrack></kit.KitContent>
      {loading ? p.duplicates.length > 0 && <kit.KitSkeleton rows={p.duplicates.length} lead="none" inset="none" />
        : <Duplicates {...{ p, w, density }} />}
      <kit.KitContent density={density} group={group}>{label(w.reason)}
        {loading ? <kit.KitRow label={w.reason} tone="muted"><kit.KitSkeleton shape="figure" inset="none"
          content={[["body", w.reasonHint], ["body", w.reason]]} /></kit.KitRow> : p.canTriage ?
          <kit.KitTextArea part="reason" label={w.reason} hint={p.duplicates.length ? w.linkHint : w.reasonHint}
          value={p.reason} lines={2} maxLength={maxReason} />
          : <kit.KitText part="reason" role="body" tone="muted">{p.reason || w.reasonHint}</kit.KitText>}</kit.KitContent>
      <kit.KitContent group="response"><kit.KitAction part="apply" full disabled={!p.canApply} label={w.apply} /></kit.KitContent></>}
  </kit.KitCard>;
}
