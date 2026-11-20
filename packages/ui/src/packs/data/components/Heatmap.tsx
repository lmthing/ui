import { z } from "zod";
import {
  numberLine,
  placeholderTitle,
  placeholderValue,
  probesFor,
  text,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Calendar/month marks dates with events, not quantitative intensity across days or hours.
export const meta = {
  id: "Heatmap",
  status: "draft",
  group: "data",
  purpose: "Spot recurring highs and lows across days or two-hour time blocks.",
  pick: "Shade each cell by numeric intensity across weeks of days or weekdays by two-hour blocks. Not a month of dates with event marks (Calendar) or a weekly habit checklist (HabitGrid).",
  writeHints: [
    'For style "weeks" write 4 to 26 weeks of exactly 7 numbers each, and omit days. For style "hours" write exactly 7 days of 12 numbers each, and omit weeks. Rows follow Monday first; hours start at midnight.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Counts per day or block aggregated from records on the device.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "title", "grid", "legend"],
  states: ["filled", "loading"],
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { style, weeks, days } = input as z.output<typeof props>;
    return (
      (style === "weeks" ? weeks : days)?.map((row) =>
        row.map((value) => numberLine(value, lang)).join(" · "),
      ) ?? []
    );
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
  });

export function fallback({ lang }: FallbackInput): z.input<typeof props> {
  return {
    title: placeholderTitle(0, lang),
    unit: placeholderTitle(1, lang).slice(0, 8),
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
    ],
  },
  {
    density: "compact",
    title: "Busy walking hours",
    unit: "walks",
    style: "hours",
    days: [
      [0, 0, 0, 3, 5, 4, 6, 5, 3, 1, 0, 0],
      [0, 0, 0, 2, 5, 5, 7, 4, 2, 0, 0, 0],
      [0, 0, 0, 2, 6, 5, 8, 4, 2, 1, 0, 0],
      [0, 0, 0, 3, 6, 5, 8, 4, 2, 1, 0, 0],
      [0, 0, 0, 2, 7, 5, 7, 3, 2, 1, 0, 0],
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
] satisfies Probe[];
