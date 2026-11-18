import { expect, it } from "vitest";
import * as catalog from "@lmthing/ui/catalog";
import { denseIds } from "./dense-ids";
import { checkPacks } from "./index";

it("keeps density exemptions unique and excludes explicitly non-dense extensions and charts", () => {
  expect(new Set(denseIds).size).toBe(denseIds.length);
  for (const id of ["Loan", "Payoff", "Performance", "PriceChart", "Signature"])
    expect(denseIds).not.toContain(id);
  expect(denseIds).toContain("Devices");
});

it.each(denseIds)("requires %s to declare dense and accepts its declaration", (id) => {
  const input: Parameters<typeof checkPacks>[0] = {
    ...catalog,
    components: { [id]: { ...catalog.components.List, meta: { ...catalog.components.List.meta, id } } },
    packOf: { [id]: "booking" as const },
  };
  expect(checkPacks(input)).toContain(`${id}: dense`);
  input.components[id]!.meta = { ...input.components[id]!.meta, dense: true };
  expect(checkPacks(input)).not.toContain(`${id}: dense`);
});
