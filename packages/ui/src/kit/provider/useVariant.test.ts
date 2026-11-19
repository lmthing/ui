import { expect, expectTypeOf, it } from "vitest";
import { resolveVariant } from "./useVariant";

it("resolves explicit, app and declared-default values in order", () => {
  const density = ["comfortable", "compact"] as const;
  expect(resolveVariant(density, "comfortable", "compact")).toBe("comfortable");
  expect(resolveVariant(density, undefined, "compact")).toBe("compact");
  expect(resolveVariant(density)).toBe("comfortable");
  expect(resolveVariant(["normal", "hero"], undefined, "compact")).toBe("normal");
});

it("never returns choices outside the declaration", () => {
  const value = resolveVariant(["normal", "hero"], "quiet", "quiet");
  expect(value).toBe("normal");
  expectTypeOf(value).toEqualTypeOf<"normal" | "hero">();
  expect(resolveVariant(["comfortable"], "compact", "compact")).toBe("comfortable");
});
