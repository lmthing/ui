import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { scopeCanRemove, scopeCopy, scopeLocalDate, scopeReading } from "../copy";
import { projectsWordsFor } from "../lang";
import { seedFriday, seedLabels, unique } from "../seeds";
import { prompt } from "../../../entry/prompt-Scope.generated";

// Core first: KeyValue/default cannot record acceptance per deliverable or distinguish baseline exclusions.
// prettier-ignore
export const meta = {
  id: "Scope",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 2, tier: "phone",
  realPath: "Versioned scope and acceptance dates live on the device; client acceptance requires a shared host.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["due", "accepted_at"] } },
  parts: ["root", "revision", "accepted", "excluded", "empty", "complete"],
  items: {
    key: "deliverables",
    parts: ["root", "title", "acceptance", "due", "accepted_at", "accept", "remove", "remove_icon"],
    records: {
      keys: ["deliverableRef"], scope: ["projectRef"], revision: "revision",
      parts: { accept: { action: "check", date: "acceptedAt" }, remove: { action: "press", remove: true } },
      canRemove: scopeCanRemove, localDate: scopeLocalDate,
      snapshot: {
        kind: "project_deliverables", keys: ["projectRef", "deliverableRef"],
        record: ({ deliverableRef, title, acceptedAt }, { projectRef }) => ({ projectRef, deliverableRef, title, acceptedAt }),
        include: ({ acceptedAt }) => acceptedAt !== undefined,
      },
    },
  },
  confirmParts: ["accept", "remove"],
  states: ["filled", "empty", "loading", "success"],
  actions: {
    items: { root: ["press"], accept: ["check"], remove: ["press"] },
    noGoto: { items: ["remove"] },
    when: { accept: { editable: true } },
  },
  successActions: ["root.press", "accept.check", "remove.press"],
  readSuccess: true,
  read: scopeReading,
  deviceData: ["project_deliverables", "project_milestones", "project_calendar"],
  previewDeviceData: ({ input }) => ({ project_calendar: [{ projectRef: input.projectRef, date: "2026-11-19" }] }),
} as const satisfies c.Meta;

const ref = c.text(32).meta({ kind: undefined });
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    projectRef: ref,
    revision: z.int().min(1).max(99),
    deliverables: z
      .array(
        z.strictObject({
          deliverableRef: ref,
          title: c.text(32),
          acceptance: c.text(100),
          due: c.isoDate.optional(),
          acceptedAt: c.isoDate.optional(),
          goto: c.screenId.optional(),
        }),
      )
      .min(1)
      .max(6),
    excluded: z.array(c.text(60)).min(0).max(6),
    style: z.enum(["deliverables", "baseline"]).default("deliverables"),
  })
  .refine(({ deliverables }) => unique(deliverables.map(({ deliverableRef }) => deliverableRef)), {
    path: ["deliverables"],
    message: "Deliverable refs must be distinct",
  })
  .overwrite((value) => ({
    ...value,
    editable: value.revision < 99,
    deliverables: value.deliverables.map((row) => ({ ...row, accept: !!row.acceptedAt, root: row.goto })),
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { title, detail } = seedLabels(input);
  return {
    projectRef: "project_1",
    revision: 1,
    excluded: [],
    deliverables: [{ deliverableRef: "item_1", title, acceptance: detail }],
  };
}

// prettier-ignore
const garden = { projectRef: "garden", revision: 1, excluded: [],
  deliverables: [{ deliverableRef: "light_plan", title: "Balcony light map", acceptance: "Marks the hours of direct sun for each pot.", due: seedFriday, goto: "light_map" },
    { deliverableRef: "pot_layout", title: "Container layout", acceptance: "Leaves enough space to open the balcony door.", acceptedAt: "2026-11-18" }] };
// prettier-ignore
export const examples = [
  { ...garden, deliverables: garden.deliverables.map((row) => ({ ...row, acceptedAt: row.acceptedAt ?? seedFriday })) },
  { projectRef: "route_guide", revision: 2, style: "baseline", excluded: ["Printing and binding"],
    deliverables: [{ deliverableRef: "route_map", title: "Park route map", acceptance: "Maps crossings and pickup points.", acceptedAt: "2026-11-18" }] },
  garden,
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Scope");
// prettier-ignore
export const probes = [
  choose("List what this project includes and excludes, and let me mark each output accepted against its own test."),
  choose("Show plain label-and-value facts such as project owner and reference number, with no deliverables to accept.", "KeyValue"),
  write("For project route_guide baseline revision 2, list deliverable route_map, Park route map, accepted 2026-11-18. Test: Labels every road crossing and pickup point. Show Printing and binding in a separate exclusions section."),
  {
    ...write("In project garden revision 1, show light_plan, Balcony light map. Acceptance test: Marks direct sun for each pot. Keep the due date of 2026-11-20 in the data but hide the dates on this screen. Keep the test and acceptance checkbox, with no spacing override."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark the Balcony light map accepted.", { address: "s1/r1/accept", action: "check" }, 2),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Row = ReturnType<typeof scopeCopy<View["deliverables"][number]>>["rows"][number];
type Words = ReturnType<typeof projectsWordsFor>["scope"];

// prettier-ignore
function Deliverable({ copy, density, w, loading, editable, removable }: {
  copy: Row; density: View["density"]; w: Words; loading: boolean; editable: boolean; removable: boolean;
}) {
  const { row, due, acceptedAt, overdue } = copy, scope = kit.usePartContext();
  const check = loading ? <kit.KitSkeleton shape="control" kind="quiet" /> :
    <kit.PartScope {...scope} item={row.id}>
      <kit.KitCheck part="accept" label={row.acceptedAt ? w.clear(row.title) : w.accept(row.title)}
        done={!!row.acceptedAt} disabled={!editable} />
    </kit.PartScope>;
  const remove = removable && <kit.PartScope {...scope} item={row.id}>
    <kit.KitAction part="remove" kind="quiet" icon="close" a11y={w.remove(row.title)} />
  </kit.PartScope>;
  return <kit.KitRow label={row.title} part={null} density={density} inline leading={check} trailing={remove}>
    <kit.KitRow {...(loading ? { part: null } : { item: row.id, goto: row.goto })} label={row.title} inline density={density}
      trailing={row.goto && (loading ? <kit.KitText part={null} role="body" emphasis="strong">{w.openMark}</kit.KitText> :
        <kit.KitIcon name="chevron_right" scale="sm" decorative />)}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["body", row.title], ["body", row.acceptance], ["label", due], ["label", acceptedAt]]} /> :
        <kit.KitContent density={density}>
          <kit.KitText part="title" role="body" density={density} emphasis="strong">{row.title}</kit.KitText>
          <kit.KitText part="acceptance" role="body" density={density} tone="muted">{row.acceptance}</kit.KitText>
          {due && <kit.KitText part="due" role="label" density={density} tone={overdue ? "bad" : "muted"}>{due}</kit.KitText>}
          {acceptedAt && <kit.KitText part="accepted_at" role="label" density={density} tone="good">{acceptedAt}</kit.KitText>}
        </kit.KitContent>}
    </kit.KitRow>
  </kit.KitRow>;
}

// prettier-ignore
export function Scope(seed: View) {
  const input = kit.useLiveControls(meta, seed) as View;
  const state = kit.useComponentState(), { lang, words: { scope: w } } = kit.useWords(projectsWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail), data = kit.useDeviceData();
  const copy = scopeCopy({ ...input, detail }, lang, data), loading = state === "loading";
  return <kit.KitCard part="root" style="inset" padded density={density}>
    {state === "empty" ? <kit.KitEmpty part="empty" decorativeIcon /> : <>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["label", copy.revision], ["number", copy.count], ["label", copy.complete ? w.complete : w.acceptedLabel]]} /> :
        <kit.KitContent density={density}>
          <kit.KitText part="revision" role="label" tone="muted">{copy.revision}</kit.KitText>
          <kit.KitText part="accepted" role="number" tabular tone={state === "success" && copy.complete ? "good" : "text"}>{copy.count}</kit.KitText>
          <kit.KitText part={copy.complete ? "complete" : null} role="label" tone={copy.complete ? "good" : "muted"}>
            {copy.complete ? w.complete : w.acceptedLabel}
          </kit.KitText>
        </kit.KitContent>}
      <kit.KitContent group="response" density={density}>
        <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
          {copy.rows.map((row) => <Deliverable key={row.row.id} copy={row} {...{ density, w, loading }}
            editable={input.revision < 99} removable={scopeCanRemove(row.row, input, data)} />)}
        </kit.KitGrid>
      </kit.KitContent>
      {!!copy.excluded.length && <kit.KitContent group="response" density={density}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
          content={[["label", w.excluded], ...copy.excluded.map((line): ["body", string] => ["body", line])]} /> : <>
          <kit.KitText part="excluded" role="label" emphasis="strong">{w.excluded}</kit.KitText>
          {copy.excluded.map((line, index) => <kit.KitText part={null} role="body" tone="muted" key={index}>{line}</kit.KitText>)}
        </>}
      </kit.KitContent>}
    </>}
  </kit.KitCard>;
}
