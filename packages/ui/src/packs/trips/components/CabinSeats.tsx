import { z } from "zod";
import {
  clip,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: Choice with cards compares fare options; it cannot show named seats in numbered rows with aisle gaps and seat-specific availability.
export const meta = {
  id: "CabinSeats",
  status: "draft",
  group: "input",
  tier: "service",
  pick: "picking or changing a numbered seat on a plane or train. Not banquet event tables (events Seating), cinema auditorium seats (watch SeatPicker), or fare tier options (Choice).",
  purpose: "Choose or change a numbered seat on a flight or train.",
  region: "body",
  weight: 3,
  realPath: "live cabin inventory and seat fees fetched and reserved through the carrier's booking service.",
  dense: true,
  parts: ["root", "confirm"],
  items: { key: "$rows", parts: ["root"] },
  actions: {
    parts: { confirm: ["press"] },
    items: { root: ["select"] },
    when: { "root.select": { $root_select: true } },
  },
  states: ["filled", "empty", "loading", "success", "error"],
} as const satisfies Meta;
export const props = z
  .strictObject({
    cabin: text(24),
    columns: z.array(text(2)).min(2).max(10),
    rows: z
      .array(
        z.strictObject({
          row: z.int().min(1).max(99),
          exit: z.boolean().default(false),
          seats: z
            .array(
              z.strictObject({
                col: text(2),
                status: z.enum(["open", "occupied", "extra", "selected"]),
                fee: z.number().min(0).optional(),
              }),
            )
            .min(1)
            .max(10),
        }),
      )
      .min(1)
      .max(20),
    passenger: text(24).optional(),
    style: z.enum(["cabin", "compact"]).default("cabin"),
  })
  .overwrite((input) => ({
    ...input,
    $rows: [
      ...(input.rows ?? []).flatMap((parent0) =>
        (parent0.seats ?? []).map((row) => ({ ...row, $root_select: true })),
      ),
    ],
  }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 2);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    cabin: castTitle(24, 0),
    columns: Array.from({ length: 2 }, (_, index) => castTitle(2, index)),
    rows: Array.from({ length: 1 }, (_, index) => ({
      row: 1,
      seats: Array.from({ length: 1 }, (_, index) => ({ col: castTitle(2, index), status: "open" })),
    })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("CabinSeats");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("Compare Saver, Standard and Flexible fares and let me pick one fare.", "Choice"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/confirm", action: "press" }),
] satisfies Probe[];

export function CabinSeats(_input: Props<typeof props, typeof meta>) {
  return null;
}
