import { z } from "zod";
import {
  affordancesOf,
  stampItemIds,
  text,
  type Definition,
  type Props,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { KitSeatMap, useComponentState } from "@lmthing/ui/kit";

const props = z.strictObject({
  tables: z.array(z.strictObject({ label: text(20) })),
  guests: z.array(z.strictObject({ name: text(20), initials: text(2), at: z.int().min(0) })),
});
const meta = {
  id: "SeatMoveFixture",
  purpose: "Move a guest to another table.",
  pick: "Test fixture.",
  group: "input",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Store the guest's current table.",
  items: { key: "guests", parts: ["root"], move: { column: "at", columns: "tables" } },
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
      tables: [{ label: "Oak" }, { label: "Birch" }, { label: "Cherry" }],
      guests: [
        { name: "Ari Shah", initials: "AS", at: 0 },
        { name: "Bea Gray", initials: "BG", at: 1 },
      ],
    },
  ],
};

export function seatMoveOffers() {
  const { id, c: _c, ...input } = seatMoveScreen.components[0]!;
  return affordancesOf(meta, stampItemIds(meta, props.parse(input)), id);
}

export function SeatMoveFixture({ tables, guests }: Props<typeof props, typeof meta>) {
  const loading = useComponentState() === "loading";
  return (
    <KitSeatMap
      loading={loading}
      tables={tables.map(({ label }, index) => ({
        id: label,
        label,
        shape: index === 0 ? "round" : "long",
        seats: guests
          .filter(({ at }) => at === index)
          .map(({ id, name, initials }) => ({
            id,
            label: name,
            initials,
            target: { part: "root" },
            move: {
              destinations: tables.filter((_, at) => at !== index).map((table) => table.label),
              label: (destination) => `Move ${name} to ${destination}`,
            },
          })),
      }))}
    />
  );
}
