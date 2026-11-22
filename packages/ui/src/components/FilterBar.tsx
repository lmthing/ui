import { z } from "zod";
import { filterCount, filterReading, wordsFor } from "../catalog";
import {
  itemsOf,
  clip,
  pickerKey,
  placeholderTitle,
  probesFor,
  searchLine,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../catalog";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-FilterBar.generated";

// Core first: Chips/filter narrows by a few labels, not by several fields with separately opened pickers.
export const meta = {
  id: "FilterBar",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A query built on the device.",
  variants: {
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["count"] } },
  parts: ["root", "field", "filters", "sort", "count", "clear", "clear_label"],
  items: {
    key: "filters",
    parts: ["root"],
    pickers: { root: { prop: "value", choices: { prop: "options" } } },
  },
  states: ["filled"],
  actions: { parts: { field: ["type"], clear: ["press"] }, items: { root: ["press", "select"] } },
  live: { text: { field: { prop: "query", max: 40 } } },
  clear: { clear: { text: ["field"], pickers: ["root"] } },
  read: (input, state, lang): string[] => (state === "filled" ? filterReading(input as ViewProps, lang) : []),
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
  for (const locale of [lang, undefined]) {
    for (const index of [0, 1]) {
      if (options.length >= 2) break;
      const title = clip(placeholderTitle(index, locale), 16);
      if (title && !options.includes(title)) options.push(title);
    }
  }
  return {
    hint: clip(searchLine(thing?.type, lang), 40) ?? searchLine(undefined, lang),
    filters: [{ label: clip(wordsFor(lang).filterLabel, 14) ?? wordsFor().filterLabel, options }],
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
  {
    ...write(
      "Find a walk, with a Route filter offering Canal and Park and Canal selected. Show Newest first as the sort, keep the clear button, but hide the number of active filters.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Select Kitchen as the Room filter value in one action.", { address: "s1/r1", action: "select" }),
] satisfies Probe[];

type ViewProps = Props<typeof props, typeof meta> & { query?: string };

function FilterPickers({ filters }: Pick<ViewProps, "filters">) {
  const { screen, component } = kit.usePartContext();
  const open = kit.useControlValue<string | undefined>(`${screen}/${component}/${pickerKey}`, undefined);
  const { words } = kit.useWords();
  return (
    <kit.KitScroll part="filters" label={words.filterList} bounded={open !== undefined}>
      {filters.map(({ id, label, options, value }) => (
        <kit.KitOption key={id} item={id} title={label} choices={options} selected={value} />
      ))}
    </kit.KitScroll>
  );
}

export function FilterBar(input: ViewProps) {
  const { detail } = input;
  const surface = "plain";
  const density = kit.useKit().density;
  const { hint, filters, query, sort } = kit.useLiveControls(meta, input) as ViewProps;
  const { lang, words } = kit.useWords();
  return (
    <kit.KitCard padded density={density} surface={surface}>
      <kit.KitContent>
        <kit.KitInput kind="search" part="field" hint={hint} value={query} />
        <kit.KitContent group="response">
          <FilterPickers filters={filters} />
        </kit.KitContent>
      </kit.KitContent>
      <kit.KitGrid fitLast density={density}>
        <kit.KitContent inset="md" density={density}>
          <kit.KitContent inset="md" density={density}>
            {detail === "full" && (
              <kit.KitText part="count" role="label" tone="muted" density={density}>
                {filterCount(filters, lang)}
              </kit.KitText>
            )}
          </kit.KitContent>
        </kit.KitContent>
        <kit.KitContent inset="md" density={density}>
          <kit.KitAction part="clear" action="press" kind="quiet" label={words.filterClear} />
        </kit.KitContent>
      </kit.KitGrid>
      {sort && (
        <kit.KitContent inset="md" density={density}>
          <kit.KitContent inset="md" density={density}>
            <kit.KitText part="sort" role="caption" tone="muted">
              {words.filterSort(sort)}
            </kit.KitText>
          </kit.KitContent>
        </kit.KitContent>
      )}
    </kit.KitCard>
  );
}
