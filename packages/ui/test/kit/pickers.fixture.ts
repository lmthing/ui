import { z } from "zod";
import { text, type Definition, type Meta } from "@lmthing/ui/catalog";

export const meta = {
  id: "PickerFixture",
  group: "data",
  purpose: "Narrow a set of records.",
  pick: "",
  realPath: "",
  region: "top",
  weight: 1,
  tier: "phone",
  parts: ["root", "field", "clear", "clear_label", "sort", "sort_label"],
  items: {
    key: "filters",
    parts: ["root"],
    pickers: { root: { prop: "selected", choices: { prop: "choices" } } },
  },
  live: { text: { field: { prop: "query", max: 24 } } },
  selections: {
    sort: {
      prop: "order",
      runtime: true,
      choices: [
        { value: "new", label: "Newest first" },
        { value: "old", label: "Oldest first" },
      ],
    },
  },
  actions: {
    parts: { field: ["type"], clear: ["press"], sort: ["select"] },
    items: { root: ["press", "select"] },
  },
  clear: { clear: { text: ["field"], pickers: ["root"] } },
} as const satisfies Meta;

const props = z.strictObject({
  query: text(24).optional(),
  order: z.enum(["new", "old"]).default("new"),
  filters: z
    .array(
      z.strictObject({
        title: text(30),
        choices: z.array(z.union([text(30), z.strictObject({ value: text(30), label: text(30) })])).max(5),
        selected: text(30).optional(),
      }),
    )
    .max(5),
});
export type PickerFixtureProps = z.output<typeof props>;

const example = {
  query: "Fern",
  filters: [
    { title: "Room", choices: ["Study", "Living room"], selected: "Study" },
    { title: "Light", choices: [{ label: "Low light", value: "shade" }, "Bright"] },
  ],
};

export const definition = {
  meta,
  props,
  fallback: () => example,
  examples: [example],
  probes: [],
} satisfies Definition;
export const defs = { PickerFixture: definition };
export const screen = { id: "home", components: [{ id: "filters", c: "PickerFixture", ...example }] };
export const part = (target: string) => `home/filters/${target}`;
