import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import * as cabinView from "../cabin-seats";
import { cabinControls, cabinReading, cabinSeatStatuses, cabinSelection, validCabin } from "../copy";
import { prompt } from "../../../entry/prompt-CabinSeats.generated";

const localSeat = c.defineLocalState({
  schema: z.strictObject({
    cabin: z.string().min(1).max(24),
    passenger: z.string().min(1).max(24).nullable(),
    selectedSeat: z
      .string()
      .regex(/^[1-9][0-9]?[A-Z]{1,2}$/)
      .nullable(),
  }),
  itemEvents: ["root.select"],
  initial: ({ cabin, passenger }) => ({
    cabin: String(cabin),
    passenger: typeof passenger === "string" ? passenger : null,
    selectedSeat: null,
  }),
  reduce: (state, { value }) =>
    typeof value === "string" ? { state: { ...state, selectedSeat: value } } : { error: "Invalid seat" },
  project: ({ selectedSeat }) => ({ selectedSeat: selectedSeat ?? undefined }),
});

// Core first: Choice/default compares fare options, but cannot show numbered rows, aisles and seat availability.
// prettier-ignore
export const meta = {
  id: "CabinSeats",
  status: "ready",
  group: "input",
  tier: "service",
  pick: prompt.pick,
  purpose: prompt.purpose,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  realPath: "Fetch cabin availability and reserve a seat through the carrier's booking service.",
  dense: true,
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["root", "legend"] } }, // Cropped seats and absent marks.
  parts: ["root", "notice", "sub", "passenger", "legend", "preview", "fee_label", "fee", "confirm"],
  items: { key: "$seats", parts: ["root"], visibleWhen: { visible: true } },
  // Resolve the omitted select value from the addressed seat. The local event owns the mutation.
  select: { prop: "seatFlag", mode: "flags", value: { field: "code" }, runtime: true },
  localState: localSeat,
  actions: { parts: { confirm: ["press"] }, items: { root: ["select"] }, when: { confirm: { canConfirm: true } } },
  partTiers: { root: "phone", confirm: "service" },
  confirmParts: ["confirm"],
  hostCommands: { parts: { "confirm.press": {
    kind: "command", name: "reserve_seat", input: ({ props }) => {
      const seat = cabinSelection(props as unknown as Parameters<typeof cabinSelection>[0]);
      return seat ? { cabin: String(props.cabin), passenger: String(props.passenger ?? ""),
        row: seat.row, column: seat.col, fee: seat.fee ?? null } : undefined;
    },
  } } },
  states: ["filled", "empty", "loading", "success", "error"],
  deviceData: ["cabin_inventory"],
  previewDeviceData: ({ state }): c.DeviceData => state === "empty" ? { cabin_inventory: [] } : {},
  live: { derive: (input) => cabinControls(input as unknown as Parameters<typeof cabinControls>[0]) },
  readSuccess: true,
  read: (input, state, lang, _data, currency): string[] =>
    cabinReading(input as Parameters<typeof cabinReading>[0], state, lang, currency),
} as const satisfies c.Meta;

const col = c
  .text(2)
  .regex(/^[A-Za-z]{1,2}$/)
  .toUpperCase();
const seat = z.strictObject({ col, status: z.enum(cabinSeatStatuses), fee: z.number().min(0).optional() });
const row = z.strictObject({
  row: z.int().min(1).max(99),
  exit: z.boolean().default(false),
  seats: z.array(seat).min(1).max(10),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    cabin: c.text(24),
    columns: z
      .array(z.union([z.literal(""), col]))
      .min(2)
      .max(10),
    rows: z.array(row).min(1).max(20),
    passenger: c.text(24).optional(),
  })
  .refine(validCabin, {
    path: ["rows"],
    message: "Use distinct rows and columns, a valid column per seat, and at most one selection",
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [item, passenger] = c.itemsOf(cast, 2),
    thing = c.thingOf(cast);
  const title = item && c.titleOf(item, 24, thing);
  const name = passenger && c.titleOf(passenger, 24, thing);
  return {
    cabin: title || c.placeholderTitle(0, lang),
    ...(name ? { passenger: name } : {}),
    columns: ["A", "B"],
    rows: [
      {
        row: 1,
        seats: [
          { col: "A", status: "open" },
          { col: "B", status: "open" },
        ],
      },
    ],
  };
}

// prettier-ignore
export const examples = [
  { cabin: "NH 212 Economy", passenger: "Sam", columns: ["A", "B", "", "C", "D"], rows: [
    { row: 10, seats: [{ col: "A", status: "occupied" }, { col: "B", status: "open" }, { col: "C", status: "open" }, { col: "D", status: "occupied" }] },
    { row: 11, seats: [{ col: "A", status: "open" }, { col: "B", status: "occupied" }, { col: "C", status: "occupied" }, { col: "D", status: "open" }] },
    { row: 12, exit: true, seats: [{ col: "A", status: "extra", fee: 45 }, { col: "B", status: "open" }, { col: "C", status: "selected", fee: 35 }, { col: "D", status: "extra", fee: 45 }] },
    { row: 13, seats: [{ col: "A", status: "occupied" }, { col: "B", status: "open" }, { col: "C", status: "open" }, { col: "D", status: "occupied" }] },
    { row: 14, seats: [{ col: "A", status: "open" }, { col: "B", status: "occupied" }, { col: "C", status: "occupied" }, { col: "D", status: "open" }] },
  ] },
  { cabin: "Shinkansen Car 8", columns: ["A", "B", "", "C", "D"], rows: [
    { row: 7, seats: [{ col: "A", status: "open" }, { col: "B", status: "open" }, { col: "C", status: "occupied" }, { col: "D", status: "occupied" }] },
    { row: 8, seats: [{ col: "A", status: "open" }, { col: "B", status: "occupied" }, { col: "C", status: "open" }, { col: "D", status: "open" }] },
    { row: 9, seats: [{ col: "A", status: "occupied" }, { col: "B", status: "open" }, { col: "C", status: "open" }, { col: "D", status: "occupied" }] },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CabinSeats");
const brief =
  "Show Economy seating for Sam. Columns are A, B, aisle, C, D. Row 11 has A occupied and B, C and D open. Row 12 is an exit row: A and D extra legroom at 45 each, B open and C selected at 35. Row 13 seats are all open.";
// prettier-ignore
export const probes = [
  choose("Let me pick the seat in my flight's numbered rows and lettered columns. Show the aisle, occupied seats, exit rows and the upgrade fee before I confirm."),
  choose("Let me pick among three airfare options: Saver with no changes, Standard with one change, and Flexible with refundable tickets. Show what each fare includes.", "Choice"),
  write(brief),
  { ...write(`${brief} Zoom in to the preselected row and the rows immediately above and below it, without changing the seating data or styling.`), variant: { axis: "detail", value: "brief" } },
  read("Preview seat 12A, the extra-legroom seat in the exit row. Do not confirm it yet.", { address: "c1/r12001", action: "select" }),
] satisfies c.Probe[];

// prettier-ignore
export function CabinSeats(input: c.Props<typeof props, typeof meta>) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const live = kit.useLiveControls(meta, input) as unknown as Parameters<typeof cabinSelection>[0];
  const selected = cabinSelection(live);
  const targets = new Map(live.$seats.map(({ code, id }) => [code, id]));
  return <cabinView.CabinSeats cabin={input.cabin} columns={input.columns} {...(input.passenger ? { passenger: input.passenger } : {})}
    density={density} surface={surface} style={detail === "brief" ? "compact" : "cabin"}
    selection={selected ?? null} confirmPart="confirm"
    rows={input.rows.map((row) => ({ ...row, seats: row.seats.map((seat) => {
      const item = targets.get(`${row.row}${seat.col}`);
      return item ? { ...seat, target: { item, part: "root" } } : seat;
    }) }))} />;
}
