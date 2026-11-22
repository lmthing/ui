import { z } from "zod";
import {
  clip,
  itemsOf,
  placeholderTitle,
  placeholderValue,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../../../catalog";
import * as kit from "../../../kit";
import { heatCells, heatGrid, heatReading } from "../copy";
import { dataWordsFor } from "../lang";

// Core first: Calendar/month marks dates with events, not quantitative intensity across days or hours.
export const meta = {
  id: "Heatmap",
  status: "ready",
  group: "data",
  purpose: "Spot recurring highs and lows across days or two-hour time blocks.",
  pick: "Shade each cell by numeric intensity across weeks of days or weekdays by two-hour blocks. Not a month of dates with event marks (Calendar) or a weekly habit checklist (HabitGrid).",
  writeHints: [
    'For style "weeks" write 4 to 26 weeks of exactly 7 numbers each, and omit days. For style "hours" write exactly 7 days of 12 numbers each, and omit weeks. Days are Monday first; two-hour blocks start at midnight.',
    "Use JSON null for unrequested detail and emphasis, not their defaults. If asked to omit the explanatory line under the title, set only detail to brief; keep the grid and scale. Never write cells, axes or the legend.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Counts per day or block aggregated from records on the device.",
  variants: {
    detail: ["full", "brief"],
    emphasis: ["normal", "hero"],
  },
  variantParts: { "detail.brief": { hides: ["detail"] } },
  parts: ["root", "title", "grid", "legend", "detail"],
  items: { key: "cells", parts: ["root"] },
  states: ["filled", "loading"],
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const heatmap = input as z.output<typeof props>;
    return [
      ...(heatmap.detail === "brief" ? [] : [dataWordsFor(lang).heatDetail(heatmap.style)]),
      ...heatReading(heatmap, lang),
    ];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    title: text(32),
    unit: text(8),
    style: z.enum(["weeks", "hours"]).default("weeks"),
    weeks: z.array(z.array(z.number()).min(7).max(7)).min(4).max(26).optional(),
    days: z.array(z.array(z.number()).min(12).max(12)).min(7).max(7).optional(),
  })
  .refine(({ style, weeks, days }) => (style === "weeks" ? !!weeks && !days : !!days && !weeks), {
    message: "Supply only the matching matrix: weeks for weeks, days for hours",
  })
  .overwrite((input) => ({ ...input, cells: heatCells(input) }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const [item] = itemsOf(cast, 1, thing?.type);
  return {
    title: (item && titleOf(item, 32, thing)) || placeholderTitle(0, lang),
    unit: clip(placeholderTitle(1, lang), 8),
    weeks: Array.from({ length: 4 }, () => Array.from({ length: 7 }, () => Number(placeholderValue))),
  };
}

export const examples = [
  {
    title: "Plant checks",
    unit: "checks",
    weeks: [
      [1, 0, 2, 0, 1, 4, 3],
      [3, 0, 2, 0, 1, 2, 5],
      [1, 1, 1, 0, 2, 4, 3],
      [2, 0, 0, 1, 2, 5, 2],
      [2, 0, 2, 1, 1, 4, 3],
      [1, 1, 1, 2, 2, 3, 5],
      [2, 0, 3, 0, 1, 4, 2],
      [1, 0, 0, 1, 2, 5, 3],
      [3, 0, 2, 0, 1, 5, 4],
    ],
  },
  {
    title: "Busy walking hours",
    unit: "walks",
    style: "hours",
    days: [
      [0, 0, 1, 6, 5, 4, 6, 5, 3, 1, 0, 0],
      [0, 0, 1, 4, 5, 5, 7, 4, 2, 0, 0, 0],
      [0, 0, 2, 4, 6, 5, 8, 4, 2, 1, 0, 0],
      [0, 0, 2, 6, 6, 5, 8, 4, 2, 1, 0, 0],
      [0, 0, 1, 4, 7, 5, 7, 3, 2, 1, 0, 0],
      [0, 0, 0, 1, 4, 5, 4, 2, 1, 0, 0, 0],
      [0, 0, 0, 1, 4, 4, 3, 2, 1, 0, 0, 0],
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Heatmap");
export const probes = [
  choose(
    "Shade each weekday and two-hour-block cell by how many visits it gets. Include a colour intensity key for busy versus quiet.",
  ),
  choose(
    "Give me a month calendar to choose a date, with a dot on days with events. There are no counts or intensity levels.",
    "Calendar",
  ),
  write(
    "Show Plant checks in checks as a four-week shaded grid. Monday through Sunday, week one is 1,0,2,0,1,4,3; week two 3,0,2,0,1,2,5; week three 1,1,1,0,2,4,3; week four 2,0,0,1,2,5,2.",
  ),
  {
    ...write(
      "Show Watering visits in visits as a four-week shaded grid. Each week, Monday through Sunday, has 1,0,2,0,1,4,3 visits. Keep the title, chart and scale, but omit the explanatory line under the title.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];

export function Heatmap(input: Props<typeof props, typeof meta>) {
  const { title, style, unit } = input;
  const { words, lang } = kit.useWords(dataWordsFor);
  const loading = kit.useComponentState() === "loading";
  const density = kit.useKit().density;
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const full = kit.useVariant("detail", meta.variants.detail, input.detail) === "full";
  const detail = words.heatDetail(style);
  const legend = words.heatLegend(unit);
  return (
    <kit.KitCard part="root" padded density={density}>
      <kit.KitContent density={density}>
        {loading ? (
          <kit.KitSkeleton
            rows={1}
            shape="figure"
            inset="none"
            density={density}
            emphasis={emphasis}
            content={
              full
                ? [
                    ["heading", title],
                    ["caption", detail],
                  ]
                : [["heading", title]]
            }
          />
        ) : (
          <>
            <kit.KitText role="heading" part="title" density={density} emphasis={emphasis}>
              {title}
            </kit.KitText>
            {full && (
              <kit.KitText role="caption" tone="muted" part="detail" density={density}>
                {detail}
              </kit.KitText>
            )}
          </>
        )}
      </kit.KitContent>
      <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>
        <kit.KitHeatGrid {...heatGrid(input, lang)} part="grid" style={style} loading={loading} />
      </kit.KitContent>
      {loading ? (
        <kit.KitSkeleton
          rows={1}
          shape="figure"
          inset="none"
          density={density}
          content={[["caption", legend]]}
        />
      ) : (
        <kit.KitText role="caption" tone="muted" part="legend" density={density}>
          {legend}
        </kit.KitText>
      )}
    </kit.KitCard>
  );
}
