import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Steps/numbered cannot open course units or distinguish locked nodes and milestones.
export const meta = {
  id: "Path",
  status: "draft",
  group: "data",
  purpose: "See which course units are finished, open now or still locked.",
  pick: "A winding course map with done, current and locked unit nodes, selectable unlocked units and occasional milestones. Not progress through a short flow (Steps) or a plain browsable list (List).",
  writeHints: [
    "Write 3–12 units in course order. Use at most one current unit. Milestones, if any, are unique zero-based indexes into units.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Progress per unit is stored on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root"],
  items: { key: "units", parts: ["root", "title", "icon", "state", "milestone"] },
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] }, when: { root: { unlocked: true } } },
} as const satisfies c.Meta;

const unit = z
  .strictObject({
    title: c.text(24),
    state: z.enum(["done", "current", "locked"]).meta({ kind: "text" }),
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
      { title: "Pick the right light", state: "done", icon: "sun", goto: "light" },
      { title: "Check the soil", state: "current", icon: "drop", goto: "soil" },
      { title: "Fern care review", state: "locked", icon: "leaf", goto: "review" },
    ],
    milestones: [2],
  },
  {
    density: "compact",
    surface: "outlined",
    units: [
      { title: "Pack a walking kit", state: "done", icon: "clipboard", goto: "kit" },
      { title: "Practise on a lead", state: "current", icon: "dog", goto: "lead" },
      { title: "Plan a park route", state: "locked", icon: "map", goto: "park" },
    ],
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
  read("Start the current unit, Check the soil.", { address: "p1/r2", action: "press" }),
] satisfies c.Probe[];
