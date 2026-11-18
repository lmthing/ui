import { expect, expectTypeOf, it } from "vitest";
import { packIds, type PackId, type PackMeta, type ArchetypeMeta } from "./index";
import type { PackProbe } from "../probes";

it("exposes exactly the 18 unique pack ids, excluding the old content id", () => {
  expect(packIds).toHaveLength(18);
  expect(new Set(packIds).size).toBe(18);
  expect(packIds).toContain("media");
  expect(packIds).not.toContain("content");
  expectTypeOf<PackMeta["id"]>().toEqualTypeOf<PackId>();
  expectTypeOf<PackMeta["probes"]>().toEqualTypeOf<readonly PackProbe[]>();
  expectTypeOf<ArchetypeMeta["layouts"][string]["defaults"][number]["c"]>().toEqualTypeOf<string>();
});
