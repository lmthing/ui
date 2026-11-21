import { expect, expectTypeOf, it } from "vitest";
import { packIds, type PackId, type PackMeta, type ArchetypeMeta } from "./index";
import type { PackProbe, ChooseProbe } from "../probes";

it("exposes exactly 57 unique pack ids, excluding the old content id", () => {
  expect(packIds).toHaveLength(57);
  expect(new Set(packIds).size).toBe(packIds.length);
  expect(packIds).toContain("media");
  expect(packIds).not.toContain("content");
  expectTypeOf<PackMeta["id"]>().toEqualTypeOf<PackId>();
  expectTypeOf<PackMeta["probes"]>().toEqualTypeOf<readonly (PackProbe | ChooseProbe)[]>();
  expectTypeOf<ArchetypeMeta["layouts"][string]["defaults"][number]["c"]>().toEqualTypeOf<string>();
});

it("includes the nine later Waves 1–5 packs in the runtime list and PackId type", () => {
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
