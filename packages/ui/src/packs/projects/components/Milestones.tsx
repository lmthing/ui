import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { milestoneCopies, milestoneReading } from "../copy";
import { projectsWordsFor } from "../lang";
import { seedFriday, seedLabels, unique } from "../seeds";

// Core first: Timeline/history cannot tie a dated delivery gate to required deliverable acceptance.
export const meta = {
  id: "Milestones",
  status: "ready",
  group: "data",
  purpose: "See dated delivery gates and the accepted deliverables each gate requires.",
  pick: "Dated delivery gates reached only after required deliverables are accepted. Not dates alone (Timeline), screen steps (Steps), or measured targets (Progress).",
  writeHints: [
    'Each gate requires 1–6 distinct deliverable refs supplied by the brief. Leave out status, reached date and missing counts; the app computes them from acceptance records. Use style "cards" when the requirements should be listed beneath each date.',
    'For cards showing only outstanding requirements, use detail "brief"; keep all requires refs in the data. Leave density null unless explicitly requested.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Milestone requirements and deliverable acceptance records are stored on the device.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["requires"] } },
  parts: ["root", "empty"],
  items: { key: "gates", parts: ["root", "title", "due", "requires", "reached", "missing"] },
  states: ["filled", "empty", "loading", "success"],
  actions: { items: { root: ["press"] } },
  successActions: ["root.press"],
  deviceData: ["project_deliverables", "project_calendar"],
  previewDeviceData: ({ input, state }) => exampleAcceptance(input.projectRef, state),
  read: milestoneReading,
  readSuccess: true,
} as const satisfies c.Meta;

const ref = c.text(32).meta({ kind: undefined });
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    projectRef: ref,
    gates: z
      .array(
        z.strictObject({
          title: c.text(32),
          due: c.isoDate,
          requires: z.array(ref).min(1).max(6).refine(unique),
          goto: c.screenId.optional(),
        }),
      )
      .min(1)
      .max(6),
    style: z.enum(["rail", "cards"]).default("rail"),
  })
  .overwrite((value) => ({ ...value, gates: value.gates.map((gate) => ({ ...gate, root: gate.goto })) }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    projectRef: "project_1",
    gates: [{ title: seedLabels(input).title, due: seedFriday, requires: ["item_1"] }],
  };
}

// prettier-ignore
const garden = { projectRef: "garden", gates: [
  { title: "Plan ready", due: seedFriday, requires: ["light_plan"], goto: "garden_scope" },
  { title: "Balcony ready to plant", due: "2026-12-03", requires: ["pot_layout"] },
] } satisfies z.input<typeof props>;
// prettier-ignore
const route = { projectRef: "route_guide", style: "cards", gates: [
  { title: "Guide ready to print", due: "2026-11-27", requires: ["route_map", "crossing_photos"] },
  { title: "Map approved", due: "2026-11-23", requires: ["route_map"] },
] } satisfies z.input<typeof props>;
// prettier-ignore
const exampleDeliverables = [
  { projectRef: garden.projectRef, deliverableRef: "light_plan", title: "Balcony light map", acceptedAt: "2026-11-18" },
  { projectRef: garden.projectRef, deliverableRef: "pot_layout", title: "Pot layout" },
  { projectRef: route.projectRef, deliverableRef: "route_map", title: "Park route map", acceptedAt: "2026-11-18" },
  { projectRef: route.projectRef, deliverableRef: "crossing_photos", title: "Crossing photos" },
];
function exampleAcceptance(project: unknown, state: c.StateName): c.DeviceData {
  return {
    project_calendar: [{ projectRef: project, date: "2026-11-28" }],
    project_deliverables: exampleDeliverables
      .filter((row) => row.projectRef === project)
      .map((row) => (state === "success" ? { ...row, acceptedAt: row.acceptedAt ?? seedFriday } : row)),
  };
}

export const examples = [
  garden,
  route,
  { ...route, density: "compact" },
  { ...route, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Milestones");
export const probes = [
  choose("Show each dated delivery gate and the outputs I still have to accept before that gate is reached."),
  choose(
    "List the order of past events and their dates; none is a gate that depends on accepting work.",
    "Timeline",
  ),
  write(
    "In project garden, show a dated gate, Plan ready, due 2026-11-20, reached only after I accept light_plan. Link it to garden_scope.",
  ),
  read("Open the deliverables for Plan ready.", { address: "m1/r1", action: "press" }),
  {
    ...write(
      "For route_guide show the gate Guide ready to print, due 2026-11-27, as a card. It needs route_map and crossing_photos. Keep both requirements in the data but show only the outstanding ones, not a separate full requirements line.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type GateCopy = ReturnType<typeof milestoneCopies<View["gates"][number]>>[number];

// prettier-ignore
function GateLines({ copy, density }: { copy: GateCopy; density: View["density"] }) {
  return <>
    <kit.KitText part="title" role="body" density={density}>{copy.gate.title}</kit.KitText>
    <kit.KitContent density={density}>
      <kit.KitText part="due" role="caption" tone={copy.overdue ? "bad" : "muted"}>{copy.due}</kit.KitText>
      {copy.reached && <kit.KitText part="reached" role="caption" tone="good">{copy.reached}</kit.KitText>}
      {copy.requires && <kit.KitText part="requires" role="caption" tone="muted">{copy.requires}</kit.KitText>}
      {copy.missing && <kit.KitText part="missing" role="caption" tone={copy.overdue ? "warn" : "muted"}>{copy.missing}</kit.KitText>}
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function Milestones(input: View) {
  const { lang } = kit.useWords(projectsWordsFor), state = kit.useComponentState();
  const { loadingLabel } = kit.useWords().words;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const copies = milestoneCopies({ ...input, detail }, kit.useDeviceData(), lang);
  const cards = input.style === "cards" && state !== "empty";
  return <kit.KitCard part="root" style={cards ? "cards" : "inset"} density={density}
    {...(state === "loading" ? { label: loadingLabel } : {})}>
    {state === "empty" ? <kit.KitEmpty part="empty" decorativeIcon /> : copies.map((copy, index) => {
      const { gate } = copy;
      if (!cards) return <kit.KitRouteStop key={gate.id} item={gate.id} goto={gate.goto} label={gate.title}
        position={index === copies.length - 1 && index > 0 ? "end" : index === 0 ? "start" : "middle"}
        mark={copy.reached ? "check" : "dot"}>
        <kit.KitContent density={density} lineRole="body">{GateLines({ copy, density })}</kit.KitContent>
      </kit.KitRouteStop>;
      if (state === "loading") return <kit.KitRow key={gate.id} part={null} label={gate.title} density={density}>
        <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", gate.title]]} />
        <kit.KitContent density={density}>
          <kit.KitSkeleton shape="figure" inset="none" density={density}
            content={[["caption", copy.due], ["caption", copy.reached], ["caption", copy.requires], ["caption", copy.missing]]} />
        </kit.KitContent>
      </kit.KitRow>;
      return <kit.KitRow key={gate.id} item={gate.id} label={gate.title} goto={gate.goto} density={density}
        trailing={gate.goto && <kit.KitIcon name="chevron_right" tone="muted" scale="sm" decorative />}>
        {GateLines({ copy, density })}
      </kit.KitRow>;
    })}
  </kit.KitCard>;
}
