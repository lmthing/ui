import { expect, expectTypeOf, it } from "vitest";
import { packIds, type PackId, type PackMeta, type ArchetypeMeta } from "./index";
import type { PackProbe, ChooseProbe } from "../probes";

it("exposes exactly the 27 unique pack ids, excluding the old content id", () => {
  expect(packIds).toHaveLength(27);
  expect(new Set(packIds).size).toBe(27);
  expect(packIds).toContain("media");
  expect(packIds).not.toContain("content");
  expectTypeOf<PackMeta["id"]>().toEqualTypeOf<PackId>();
  expectTypeOf<PackMeta["probes"]>().toEqualTypeOf<readonly (PackProbe | ChooseProbe)[]>();
  expectTypeOf<ArchetypeMeta["layouts"][string]["defaults"][number]["c"]>().toEqualTypeOf<string>();
});

it("includes all nine newly planned packs in the runtime list and PackId type", () => {
  const newPackIds = [
    "play",
    "requests",
    "community",
    "projects",
    "paperwork",
    "hiring",
    "property",
    "invest",
    "books",
  ] as const satisfies readonly PackId[];
  expect(packIds).toEqual(expect.arrayContaining([...newPackIds]));
});
