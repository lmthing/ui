import { expect, it } from "vitest";
import * as catalog from "@lmthing/ui/catalog";
import type { ArchetypeMeta, PackId } from "../meta";
import type { CoreArchetypeMeta } from "../archetypes";
import { checkArchetypes } from "./index";

const archetype = (id = "visit"): ArchetypeMeta => ({
  id,
  job: "Book time",
  layouts: {
    booking_day: {
      recipe: [{ allow: ["Header", "Slots"], required: true }],
      defaults: [],
    },
  },
  defaultLayout: "booking_day",
});
const fixture = (): Parameters<typeof checkArchetypes>[0] => ({
  archetypes: { home: catalog.archetypes.home },
  packArchetypes: { booking: [archetype()] },
  components: {
    Header: catalog.components.Header,
    Slots: { ...catalog.components.List, meta: { ...catalog.components.List.meta, id: "Slots" } },
    Cart: { ...catalog.components.List, meta: { ...catalog.components.List.meta, id: "Cart" } },
  },
  packOf: { Slots: "booking", Cart: "commerce" },
});
const packMeta = (input: ReturnType<typeof fixture>) => input.packArchetypes.booking![0]!;

it("checks every real core and pack archetype", () => {
  expect(checkArchetypes(catalog)).toEqual([]);
});

it("accepts core-only and same-pack recipes without changing input", () => {
  const input = fixture();
  input.archetypes = {};
  const before = JSON.stringify(input);
  expect(checkArchetypes(input)).toEqual([]);
  expect(JSON.stringify(input)).toBe(before);
});

it.each<PackId>(["booking", "commerce"])("rejects duplicate archetypes in %s", (owner) => {
  const input = fixture();
  input.archetypes = {};
  input.packArchetypes[owner] = [...(input.packArchetypes[owner] ?? []), archetype()];
  expect(checkArchetypes(input)).toContain(`${owner}: visit/-: duplicate archetype id (already in booking)`);
});

it("rejects core/pack collisions in the separate archetype namespace", () => {
  const input = fixture();
  input.components = catalog.components;
  input.packArchetypes.booking = [archetype("home")];
  expect(checkArchetypes(input)).toContain("booking: home/-: duplicate archetype id (already in core)");
});

it("rejects duplicate core ids", () => {
  const input = { ...catalog, archetypes: { home: catalog.archetypes.home, copy: catalog.archetypes.home } };
  expect(checkArchetypes(input)).toContain("core: home/-: duplicate archetype id (already in core)");
});

it("allows archetype ids to equal a component id and layouts to repeat in another archetype", () => {
  const input = fixture();
  input.archetypes = {};
  input.packArchetypes.booking = [...input.packArchetypes.booking!, archetype("Slots")];
  expect(checkArchetypes(input)).toEqual([]);
});

it.each(["missing", "toString", ""])("rejects defaultLayout %j", (layout) => {
  const input = fixture();
  input.archetypes = {};
  packMeta(input).defaultLayout = layout;
  expect(checkArchetypes(input)).toContain(`booking: visit/${layout}: defaultLayout does not name a layout`);
});

it("rejects an archetype with no layouts", () => {
  const input = fixture();
  input.archetypes = {};
  packMeta(input).layouts = {};
  expect(checkArchetypes(input)).toContain(
    "booking: visit/booking_day: defaultLayout does not name a layout",
  );
});

it("layout ids are unique by construction as record keys", () => {
  const input = fixture();
  input.archetypes = {};
  const meta = packMeta(input);
  meta.layouts = Object.fromEntries([
    ["booking_day", meta.layouts.booking_day!],
    ["booking_day", meta.layouts.booking_day!],
  ]);
  expect(Object.keys(meta.layouts)).toEqual(["booking_day"]);
  expect(checkArchetypes(input)).toEqual([]);
});

it.each(["Unknown", "Cart", "header"])("rejects recipe component %s", (id) => {
  const input = fixture();
  input.archetypes = {};
  packMeta(input).layouts.booking_day!.recipe = [{ allow: [id], required: false }];
  const what = id === "Cart" ? "commerce component Cart" : `unknown component ${id}`;
  expect(checkArchetypes(input)).toEqual([`booking: visit/booking_day: recipe names ${what}`]);
});

it("checks defaults as well as optional recipe alternatives", () => {
  const input = fixture();
  input.archetypes = {};
  packMeta(input).layouts.booking_day!.defaults = [{ c: "Cart", id: "cart" }];
  expect(checkArchetypes(input)).toEqual([
    "booking: visit/booking_day: recipe names commerce component Cart",
  ]);
});

it("checks core slot recipes and per-layout defaults with no inferred pack default", () => {
  const meta: CoreArchetypeMeta = {
    id: "core_fixture",
    purpose: "Core fixture",
    layouts: { plain: { slots: [{ id: "slot", allow: ["Header"], min: 1, max: 1 }] } },
    defaults: { plain: [{ c: "Header" }] },
  };
  const input = { ...fixture(), archetypes: { fixture: { meta } }, packArchetypes: {} };
  expect(checkArchetypes(input)).toEqual([]);
  meta.layouts.plain!.slots[0]!.allow = ["Slots"];
  expect(checkArchetypes(input)).toEqual(["core: core_fixture/plain: recipe names booking component Slots"]);
  meta.layouts.plain!.slots[0]!.allow = ["Header"];
  meta.defaults = { missing: [{ c: "Header" }] };
  expect(checkArchetypes(input)).toEqual(["core: core_fixture/missing: default names a missing layout"]);
});
