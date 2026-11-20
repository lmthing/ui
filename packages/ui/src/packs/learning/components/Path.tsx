import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { pathUnitCopy, readPath } from "../copy";
import { learningWordsFor } from "../lang";

// Core first: Steps/numbered cannot open course units or distinguish locked nodes and milestones.
export const meta = {
  id: "Path",
  status: "ready",
  group: "data",
  purpose: "See which course units are finished, open now or still locked.",
  pick: "A winding course map with done, current and locked unit nodes, selectable unlocked units and occasional milestones. Not progress through a short flow (Steps) or a plain browsable list (List).",
  writeHints: [
    "Write 3–12 units in course order. Use at most one current unit. Milestones, if any, are unique zero-based indexes into units.",
    'Unless asked to change spacing or card appearance, write density and surface as null, not their defaults. To hide the unit-state text but keep the visual markers, set only detail to "brief".',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Progress per unit is stored on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["state"] } },
  parts: ["root"],
  items: { key: "units", parts: ["root", "title", "icon", "state", "milestone"] },
  states: ["filled", "loading"],
  emptyActions: [], // Opt into state-aware planning so loading nodes cannot navigate.
  actions: { items: { root: ["press"] }, when: { root: { unlocked: true } } },
  read: (input, state, lang) => {
    if (state !== "filled") return [];
    const { units, milestones, detail } = input as {
      units: z.output<typeof unit>[];
      milestones?: number[];
      detail?: string;
    };
    return readPath(units, milestones ?? [], detail === "brief", lang);
  },
} as const satisfies c.Meta;

const unit = z
  .strictObject({
    title: c.text(24),
    state: z.enum(["done", "current", "locked"]),
    icon: c.icon,
    goto: c.screenId,
  })
  .overwrite((value) => ({ ...value, unlocked: value.state !== "locked" }));

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    units: z.array(unit).min(3).max(12),
    milestones: z.array(z.int().min(0).max(11)).min(0).max(12).optional(),
  })
  .refine(({ units }) => units.filter(({ state }) => state === "current").length <= 1, { path: ["units"] })
  .refine(
    ({ units, milestones }) =>
      !milestones ||
      (new Set(milestones).size === milestones.length && milestones.every((i) => i < units.length)),
    { path: ["milestones"] },
  );

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 6);
  return {
    units: Array.from({ length: Math.max(3, items.length) }, (_, index) => {
      const item = items[index];
      return {
        title: (item && c.titleOf(item, 24, thing)) ?? c.placeholderTitle(index, lang),
        state: index === 0 ? "current" : "locked",
        icon: "book_open",
        goto: "back",
      };
    }),
  };
}

export const examples = [
  {
    units: [
      { title: "Light check", state: "done", icon: "sun", goto: "light" },
      { title: "Check the soil", state: "current", icon: "drop", goto: "soil" },
      { title: "Fern quiz", state: "locked", icon: "leaf", goto: "review" },
    ],
    milestones: [2],
  },
  {
    units: [
      { title: "Pack the kit", state: "done", icon: "clipboard", goto: "kit" },
      { title: "Loose lead", state: "current", icon: "dog", goto: "lead" },
      { title: "Plan the route", state: "locked", icon: "map", goto: "park" },
    ],
    milestones: [0],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Path");
export const probes = [
  choose(
    "Show my course as a winding map. Completed and current units can open, future units are locked, and milestones have trophies.",
  ),
  choose("Show only that I am on step two of four in a short setup flow. No unit links or locks.", "Steps"),
  write(
    "Map three units: Basic strokes completed, Water radical current and Nature review locked with a trophy milestone. Link to strokes, water and review respectively; use pencil, drop and leaf icons.",
  ),
  {
    ...write(
      "Show a winding course map: Basic strokes completed, Water radical current and Nature review locked. Link them to strokes, water and review and use pencil, drop and leaf icons. Keep the progress symbols, but hide the text labels for the unit states. Don't specify spacing or a card treatment.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Start the current unit, Check the soil.", { address: "p1/r2", action: "press" }),
] satisfies c.Probe[];

type PathProps = c.Props<typeof props, typeof meta>;

function PathUnit({
  unit,
  milestone,
  density,
  brief,
}: {
  unit: PathProps["units"][number];
  milestone: boolean;
  density: c.ThemeDensity;
  brief: boolean;
}) {
  const { lang, words } = kit.useWords(learningWordsFor);
  const copy = pathUnitCopy(unit, milestone, lang);
  const tone = unit.state === "current" ? "accent" : "muted";
  const statusRole = unit.state === "current" ? "label" : "caption";
  return (
    <kit.KitContent density={density}>
      <kit.KitGrid fitLast density="compact">
        <kit.KitText part="title" density={density} tone={unit.state === "locked" ? "muted" : "text"}>
          {unit.title}
        </kit.KitText>
        <kit.KitIcon name={unit.icon} scale="sm" />
      </kit.KitGrid>
      {(!brief || copy.milestone) && (
        <kit.KitContent density={density} group={density === "compact" ? "content" : "response"}>
          <kit.KitText part={brief ? null : "state"} role={statusRole} tone={tone} density={density}>
            {!brief && copy.status}
            {!brief && copy.milestone && words.path.separator}
            {copy.milestone && (
              <kit.KitText part="milestone" role={statusRole} tone="muted" density={density}>
                {copy.milestone}
              </kit.KitText>
            )}
          </kit.KitText>
        </kit.KitContent>
      )}
    </kit.KitContent>
  );
}

function LoadingUnits({ units, density }: { units: PathProps["units"]; density: c.ThemeDensity }) {
  return units.map(({ id }, index) => (
    <kit.KitContent key={id} density={density} group={index === 0 ? "content" : "response"}>
      <kit.KitSkeleton lead="dot" inset="none" density={density} />
    </kit.KitContent>
  ));
}

export function Path({ units, milestones = [], detail, density: requested, surface }: PathProps) {
  const density = kit.useVariant("density", meta.variants.density, requested);
  const loading = kit.useComponentState() === "loading";
  const { lang } = kit.useWords();
  const nodes = units.map((unit, index) => {
    const milestone = milestones.includes(index);
    return {
      id: unit.id,
      label: pathUnitCopy(unit, milestone, lang).label,
      state: unit.state,
      milestone,
      target: { part: "root" },
      content: <PathUnit {...{ unit, milestone, density }} brief={detail === "brief"} />,
    };
  });
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {loading ? <LoadingUnits {...{ units, density }} /> : <kit.KitPath part={null} nodes={nodes} />}
    </kit.KitCard>
  );
}
