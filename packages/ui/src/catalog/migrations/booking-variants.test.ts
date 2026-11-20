import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine, stampItemIds } from "@lmthing/ui/catalog";

const slots = {
  c: "Slots",
  id: "starts",
  state: "filled",
  times: [
    { time: "09:00", taken: false },
    { time: "09:30", taken: true },
  ],
  at: "09:00",
  minutes: 30,
} as const;
const menu = {
  c: "ServiceMenu",
  id: "services",
  services: [{ name: "Park walk", minutes: 30, goto: "time", photo: "lib:dogs" }],
} as const;

it.each(["rows", "cards"] as const)("migrates the ServiceMenu %s surface and preserves links", (style) => {
  const { c, id, ...input } = migrateLine({ ...menu, style });
  expect({ c, id }).toEqual({ c: menu.c, id: menu.id });
  expect(input).toMatchObject({ surface: "card", services: menu.services });
  expect(input).toMatchObject(style === "cards" ? { style: "cards" } : {});
  if (style === "rows") expect(input).not.toHaveProperty("style");
  const { meta, props } = components.ServiceMenu;
  const parsed = stampItemIds(meta, props.parse(input));
  expect(parsed).toMatchObject({ services: [{ id: "r1" }] });
  expect(affordancesOf(meta, parsed, menu.id)).toMatchObject([
    { address: "services/r1", action: "press", detail: "→time" },
  ]);
  expect(migrateLine({ ...menu, style, surface: "outlined" })).toMatchObject({ surface: "outlined" });
});

it.each([
  ["grid", "grid"],
  ["list", "rows"],
] as const)("migrates Slots style %s to arrange %s without changing actions or ids", (style, arrange) => {
  const { c, id, state, ...input } = migrateLine({ ...slots, style });
  expect({ c, id, state }).toEqual({ c: slots.c, id: slots.id, state: slots.state });
  expect(input).not.toHaveProperty("style");
  const { meta, props } = components.Slots;
  const parsed = stampItemIds(meta, props.parse(input));
  expect(parsed).toMatchObject({ arrange, times: [{ id: "r1" }, { id: "r2" }] });
  expect(affordancesOf(meta, parsed, slots.id)).toMatchObject([{ address: "starts/r1", action: "select" }]);
  const explicit = arrange === "rows" ? "grid" : "rows";
  expect(migrateLine({ ...slots, style, arrange: explicit })).toMatchObject({ arrange: explicit });
});
