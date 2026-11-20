import { z } from "zod";
import * as c from "../../../catalog";
import { seedTitles } from "../seeds";

// Core first: MapPins/default cannot represent round and long tables, seat capacity or guest moves.
export const meta = {
  id: "Seating",
  status: "draft",
  group: "input",
  purpose: "Arrange guests at tables and see who still needs a seat.",
  pick: "A seating plan of round or long tables with guest initials, available seats and a tray of unseated guests. Not locations on a geographic map (MapPins), an invitation roster (GuestList) or a staff rota (Roster).",
  writeHints: [
    "Each table's guests array may be empty and cannot exceed seats. Table labels must be distinct; unseated is an array of names, not a number.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The seating plan is stored on the organiser's device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "tray"],
  items: { key: "entries", parts: ["root", "label", "seats", "name"] },
  states: ["filled", "empty"],
  actions: {
    items: { root: ["press", "move"] },
    when: { "root.press": { kind: "table" }, "root.move": { kind: "guest" } },
  },
  read: (input, state): string[] => {
    if (state !== "filled") return [];
    const { tables, unseated } = input as z.output<typeof props>;
    const labels = tables.map(
      ({ label, seats, guests }, index) =>
        `r${index + 1}: ${label} (${guests.length}/${seats})${guests.length ? `: ${guests.join(", ")}` : ""}`,
    );
    const guests = [...tables.flatMap((table) => table.guests), ...unseated];
    return [...labels, ...guests.map((name, index) => `r${tables.length + index + 1}: ${name}`)];
  },
} as const satisfies c.Meta;

const table = z
  .strictObject({
    label: c.text(12),
    shape: z.enum(["round", "long"]),
    seats: z.int().min(2).max(16),
    guests: z.array(c.text(24)).min(0).max(16),
  })
  .refine(({ seats, guests }) => guests.length <= seats, {
    path: ["guests"],
    message: "Guests must fit at the table",
  });

const schema = z
  .strictObject({
    ...c.variantProps(meta.variants),
    tables: z.array(table).min(1).max(20),
    unseated: z.array(c.text(24)).min(0).max(20),
  })
  .refine(({ tables }) => new Set(tables.map(({ label }) => label)).size === tables.length, {
    path: ["tables"],
    message: "Use distinct table labels",
  });

function withEntries(input: z.output<typeof schema>) {
  return {
    ...input,
    entries: [
      ...input.tables.map((table) => ({ ...table, kind: "table" as const })),
      ...input.tables.flatMap((table, at) =>
        table.guests.map((name) => ({ name, at, kind: "guest" as const })),
      ),
      ...input.unseated.map((name) => ({ name, at: null, kind: "guest" as const })),
    ],
  };
}

export const props = schema.overwrite(withEntries) as typeof schema &
  z.ZodType<ReturnType<typeof withEntries>, z.input<typeof schema>>;

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    tables: [{ label: c.clip(c.placeholderTitle(0, input.lang), 12), shape: "round", seats: 2, guests: [] }],
    unseated: seedTitles(input, 24, 3),
  };
}

export const examples = [
  {
    tables: [
      { label: "Oak", shape: "round", seats: 8, guests: ["Ruth Shah", "Sam Gray"] },
      { label: "Birch", shape: "long", seats: 10, guests: [] },
    ],
    unseated: ["Deepa Shah"],
  },
  {
    density: "compact",
    surface: "outlined",
    tables: [{ label: "Long table", shape: "long", seats: 12, guests: ["Imani Cole", "Hugo Wells"] }],
    unseated: [],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Seating");
export const probes = [
  choose(
    "Lay out the banquet with round and long tables, dots for seats with guest initials, and a tray for guests I still need to place.",
  ),
  choose(
    "Put three venues at their geographic locations on a map, with numbered pins and labels underneath.",
    "MapPins",
  ),
  write(
    "Create a seating plan: round Oak has eight chairs with Ruth Shah and Sam Gray seated, long Birch has ten chairs and nobody seated, and Deepa Shah is unseated.",
  ),
  read("Move unseated Deepa Shah to the Birch table.", { address: "s1/r5", action: "move" }),
] satisfies c.Probe[];
