import { z } from "zod";
import {
  affordancesOf,
  itemMoveOffer,
  stampItemIds,
  text,
  type Definition,
  type Props,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { KitSeatMap, KitText, useComponentState, useLiveControls } from "@lmthing/ui/kit";

const guest = z.strictObject({ name: text(20), initials: text(2) });
const wire = z.strictObject({
  tables: z.array(z.strictObject({ label: text(20), capacity: z.int(), seated: z.array(guest) })),
  waiting: z.array(guest),
});
function withGuests(input: z.output<typeof wire>) {
  return {
    ...input,
    guests: [
      ...input.tables.flatMap(({ seated }, at) => seated.map((member) => ({ ...member, at }))),
      ...input.waiting.map((member) => ({ ...member, at: null })),
    ],
  };
}
const props = wire.overwrite(withGuests) as typeof wire &
  z.ZodType<ReturnType<typeof withGuests>, z.input<typeof wire>>;
const meta = {
  id: "SeatMoveFixture",
  purpose: "Move a guest to another table.",
  pick: "Test fixture.",
  group: "input",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Store the guest's current table.",
  items: {
    key: "guests",
    parts: ["root"],
    move: { column: "at", columns: "tables", derived: true, capacity: "capacity" },
  },
  actions: { items: { root: ["move"] } },
} as const satisfies Definition["meta"];

export const seatMoveDef = {
  meta,
  props,
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
export const seatMoveDefs = { SeatMoveFixture: seatMoveDef };
export const seatMoveScreen: ScreenLike = {
  id: "home",
  components: [
    {
      id: "c1",
      c: "SeatMoveFixture",
      tables: [
        { label: "Oak", capacity: 2, seated: [{ name: "Ari Shah", initials: "AS" }] },
        { label: "Birch", capacity: 2, seated: [{ name: "Bea Gray", initials: "BG" }] },
        { label: "Cherry", capacity: 2, seated: [] },
      ],
      waiting: [
        { name: "Cam Cole", initials: "CC" },
        { name: "Dee Park", initials: "DP" },
      ],
    },
  ],
};

export function seatMoveOffers() {
  const { id, c: _c, ...input } = seatMoveScreen.components[0]!;
  return affordancesOf(meta, stampItemIds(meta, props.parse(input)), id);
}

type ViewProps = Props<typeof props, typeof meta>;

export function SeatMoveFixture(input: ViewProps) {
  const loading = useComponentState() === "loading";
  const live = useLiveControls(meta, input);
  const { tables, guests } = live as ViewProps;
  const drawings = guests.map((row) => ({
    id: row.id,
    label: row.name,
    initials: row.initials,
    at: row.at,
    target: { part: "root" },
    move: {
      destinations: itemMoveOffer(meta, live, row)?.choices ?? [],
      label: (destination: string) => `Move ${row.name} to ${destination}`,
    },
  }));
  const trayGuests = drawings.filter(({ at }) => at === null);
  return (
    <KitSeatMap
      loading={loading}
      tables={tables.map(({ label, capacity }, index) => {
        const assigned = drawings.filter(({ at }) => at === index);
        const open = Array.from({ length: capacity - assigned.length }, (_, slot) => ({
          id: `${label}-${slot}`,
          label: "Open seat",
        }));
        return { id: label, label, shape: index === 0 ? "round" : "long", seats: [...assigned, ...open] };
      })}
      tray={
        trayGuests.length ? (
          <KitText role="label" part="tray">
            Unassigned guests
          </KitText>
        ) : null
      }
      trayGuests={trayGuests}
    />
  );
}
