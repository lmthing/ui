import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  probesFor,
  searchLine,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Chips/filter narrows by a few labels, not by several fields with separately opened pickers.
export const meta = {
  id: "FilterBar",
  status: "draft",
  group: "input",
  purpose: "Search and narrow records by several fields, then clear the filters together.",
  pick: "Search many records and filter by named fields, each with its own option picker; show the sort order and clear all filters. Not a few standalone filter chips (Chips), switching views (Segmented) or search alone (Search).",
  writeHints: [
    "Write 1 to 4 separate filters, each with 2 to 8 distinct options. If a filter has a selected value, it must exactly match one of its options. sort is the current order's label, not an options list.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A query built on the device.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "field", "sort", "count", "clear"],
  items: { key: "filters", parts: ["root", "label", "value"] },
  states: ["filled"],
  actions: { parts: { field: ["type"], clear: ["press"] }, items: { root: ["select"] } },
  live: { text: { field: { prop: "query", max: 40 } } },
  read: (input, _state): string[] =>
    (input as z.output<typeof props>).filters.map(
      ({ label, options }, i) => `r${i + 1} ${label}: ${options.join(" · ")}`,
    ),
} as const satisfies Meta;

const filter = z
  .strictObject({
    label: text(14),
    options: z.array(text(16)).min(2).max(8),
    value: text(16).optional(),
  })
  .refine(({ options }) => new Set(options).size === options.length, {
    path: ["options"],
    message: "Use distinct options",
  })
  .refine(({ options, value }) => value === undefined || options.includes(value), {
    path: ["value"],
    message: "Use a label from this filter's options",
  });
export const props = z.strictObject({
  ...variantProps(meta.variants),
  hint: text(40),
  filters: z.array(filter).min(1).max(4),
  sort: text(20).optional(),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const titles = itemsOf(cast, 8, thing?.type).flatMap((item) => titleOf(item, 16, thing) ?? []);
  const options = [...new Set(titles)];
  for (let i = 0; options.length < 2; i++) {
    const title = placeholderTitle(i, lang);
    if (!options.includes(title)) options.push(title);
  }
  return {
    hint: searchLine(thing?.type, lang).slice(0, 40),
    filters: [{ label: placeholderTitle(0, lang), options }],
  };
}

export const examples = [
  {
    hint: "Find a plant",
    filters: [
      { label: "Room", options: ["Kitchen", "Study"], value: "Study" },
      { label: "Light", options: ["Bright", "Indirect"] },
    ],
    sort: "Recently watered",
  },
  {
    density: "compact",
    hint: "Find a walk",
    filters: [
      { label: "Walker", options: ["Sam", "Ana"], value: "Ana" },
      { label: "Route", options: ["Canal", "Park", "Hill"] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("FilterBar");
export const probes = [
  choose(
    "Above the records, put a search box, separate dropdowns for owner and status, the sort order and one button to clear the filters.",
  ),
  choose(
    "Give me one row of short filter pills for Sun, Shade and Indoor. No search, sort or separate dropdowns.",
    "Chips",
  ),
  write(
    "Use Find a plant as the search hint, a Room dropdown with Kitchen and Study as options and Study selected, a Light dropdown with Bright and Indirect, and sort by Recently watered.",
  ),
  read("Change the Room filter to Kitchen.", { address: "s1/r1", action: "select" }),
] satisfies Probe[];
