import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  groupSeating,
  seatInitials,
  seatingCount,
  seatingFigures,
  seatingReading,
  seatingTotals,
} from "../copy";
import { eventsWordsFor } from "../lang";
import { seedTitles } from "../seeds";

// Core first: MapPins/default cannot represent round and long tables, seat capacity or guest moves.
export const meta = {
  id: "Seating",
  status: "ready",
  group: "input",
  purpose: "Arrange guests at tables and see who still needs a seat.",
  pick: "A seating plan of round or long tables with guest initials, available seats and a tray of unseated guests. Not locations on a geographic map (MapPins), an invitation roster (GuestList) or a staff rota (Roster).",
  writeHints: [
    "Each table's guests array may be empty and cannot exceed seats. Table labels must be distinct; unseated is an array of names, not a number.",
    'Use detail "brief" only when asked to omit the overall seated count; keep the tables, seats and unseated tray. Use JSON null for density and surface unless separately requested; do not spell out their defaults.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The seating plan is stored on the organiser's device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["summary"] } },
  parts: ["root", "summary", "map", "tray", "empty"],
  items: {
    key: "entries",
    parts: ["root", "label", "seats", "name"],
    // Reuse the shared one-open-at-a-time disclosure; the table's own label identifies it.
    pickers: { root: { prop: "openTable", choices: { prop: "disclosure" } } },
    move: { column: "at", columns: "tables", derived: true, capacity: "seats" },
  },
  states: ["filled", "empty"],
  actions: {
    items: { root: ["press", "move"] },
    when: { "root.press": { kind: "table" }, "root.move": { kind: "guest" } },
  },
  read: seatingReading,
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
      ...input.tables.map(({ label, shape, seats }) => ({
        label,
        shape,
        seats,
        kind: "table" as const,
        disclosure: [label],
      })),
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
      { label: "Birch", shape: "long", seats: 8, guests: [] },
    ],
    unseated: ["Deepa Shah"],
  },
  {
    density: "compact",
    surface: "outlined",
    tables: [{ label: "Long table", shape: "long", seats: 6, guests: ["Imani Cole", "Hugo Wells"] }],
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
  {
    ...write(
      "Make a seating plan with four seats at round Oak, Ruth Shah seated there and Deepa Shah unseated. Show the tables and tray but omit the overall seated count. Leave the spacing and card surface unset.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Move unseated Deepa Shah to the Birch table.", { address: "s1/r5", action: "move" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;

// prettier-ignore
function TableGuests({ table, lang }: { table: ReturnType<typeof groupSeating>["tables"][number]; lang: string }) {
  const { seating: words } = eventsWordsFor(lang);
  return <kit.KitContent group="response" inset="md">
    <kit.KitText part="label" item={table.id} role="heading">{table.label}</kit.KitText>
    <kit.KitText part="seats" item={table.id} role="caption" tone="muted">
      {seatingCount(table.guests.length, table.seats, lang)}
    </kit.KitText>
    {table.guests.length ? table.guests.map(({ id, name }) =>
      <kit.KitText key={id} item={id} part="name" role="body">{name}</kit.KitText>,
    ) : <kit.KitText part={null} role="body" tone="muted">{words.noGuests}</kit.KitText>}
  </kit.KitContent>;
}

// prettier-ignore
export function Seating(input: View) {
  const { lang, words: { seating: words } } = kit.useWords(eventsWordsFor);
  const { state, screen, component } = kit.usePartContext();
  const open = kit.useControlValue<string | undefined>(`${screen}/${component}/${c.pickerKey}`, undefined);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const live = kit.useLiveControls(meta, input) as View;
  if (state === "empty") return <kit.KitCard part="root" {...{ density, surface }}>
    <kit.KitEmpty part="empty" icon="users" decorativeIcon />
  </kit.KitCard>;
  const { tables, unseated } = groupSeating(live.entries);
  const table = tables.find(({ id }) => id === open);
  const guest = (row: typeof unseated[number]) => ({
    id: row.id, label: row.name, target: { part: "root" },
    move: { destinations: c.itemMoveOffer(meta, live, row)?.choices ?? [], label: words.move },
  });
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitContent density={density} align="center">
      <kit.KitText role="heading" part={null}>{words.title}</kit.KitText>
      {detail === "full" && <kit.KitText part="summary" role="number" numberScale="compact" tabular>
        {seatingFigures(...seatingTotals(tables), lang)}{" "}
        <kit.KitText role="caption" tone="muted" part={null}>{words.filled}</kit.KitText>
      </kit.KitText>}
    </kit.KitContent>
    {table && <TableGuests table={table} lang={lang} />}
    <kit.KitSeatMap part="map" tables={tables.map(({ id, label, shape, seats, guests }) => ({
      id, label, shape, target: { part: "root" },
      seats: Array.from({ length: seats }, (_, index) => {
        const row = guests[index];
        return row
          ? { ...guest(row), initials: seatInitials(row.name, lang) }
          : { id: `${id}-${index}`, label: words.freeSeat };
      }),
    }))} tray={<kit.KitContent inset="md"><kit.KitText part="tray" role="label" tone="muted" density={density}>
      {words.tray(c.numberLine(unseated.length, lang))}
    </kit.KitText></kit.KitContent>} trayGuests={unseated.map(guest)} />
  </kit.KitCard>;
}
