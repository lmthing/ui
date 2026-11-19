import { afterEach, expect, it, vi } from "vitest";
import {
  changeSelection,
  checkOptions,
  relatedIncludes,
  selectedIds,
  selectedEntries,
  selectedLayouts,
} from "./check-options";

afterEach(() => vi.unstubAllEnvs());
it("separates real changed/browser options from file filters", () => {
  expect(checkOptions(["--changed"])).toEqual({ changed: "main", browser: false, filters: [] });
  expect(checkOptions(["--changed", "origin/main", "List"])).toEqual({
    changed: "origin/main",
    browser: false,
    filters: ["List"],
  });
  expect(checkOptions(["--changed=HEAD"])).toMatchObject({ changed: "HEAD" });
  expect(checkOptions(["--browser", "runtime"])).toEqual({
    changed: undefined,
    browser: true,
    filters: ["runtime"],
  });
  expect(() => checkOptions(["--browser", "--changed"])).toThrow("cannot be combined");
  expect(() => checkOptions(["--unknown"])).toThrow("Unknown test option");
});
it("derives component ids from views, copy, recordings and component-named tests", () => {
  expect(
    changeSelection([
      "packages/ui/src/components/List.tsx",
      "packages/ui/src/packs/health/components/Cycle.tsx",
      "packages/ui/src/packs/health/copy/Cycle.ts",
      "packages/ui/test/recordings/Cycle/model.json",
      "packages/ui/src/packs/booking/tests/Appointment.loading.test.ts",
      "docs/spec.md",
    ]),
  ).toEqual({ full: false, ids: ["Appointment", "Cycle", "List"], packs: ["booking", "health"] });
});
it.each([
  "src/kit/base/input/KitInput.tsx",
  "src/kit/interact/controller.ts",
  "src/catalog/agent/read.ts",
  "src/catalog/meta/pack.ts",
  "src/entry/catalog.ts",
  "scripts/build/check.ts",
  "test/render.tsx",
  "test/fixtures/cast.ts",
  "src/packs/health/pack.ts",
  "tsconfig.json",
  "package.json",
])("falls back to every Node test for shared or unclassified code: %s", (path) => {
  expect(changeSelection([`packages/ui/${path}`]).full).toBe(true);
});
it("includes cross-cutting and touched-pack checks without other packs", () => {
  const include = relatedIncludes(["Cycle"], ["health"]);
  expect(include).toContain("src/**/Cycle.test.{ts,tsx}");
  expect(include).toContain("src/packs/health/tests/**/*.test.{ts,tsx}");
  expect(include.join(" ")).not.toContain("booking");
});
it("filters ids, entries and individual layouts, and restores full coverage without an env list", () => {
  const metas = [
    {
      id: "sample",
      layouts: {
        first: { slots: [{ allow: ["List"] }] },
        second: { slots: [{ allow: ["Cycle"] }] },
      },
    },
  ];
  expect(selectedIds(["List", "Cycle"])).toEqual(["List", "Cycle"]);
  expect(selectedLayouts(metas)).toBeUndefined();
  vi.stubEnv("UI_TEST_COMPONENTS", "Cycle");
  expect(selectedIds(["List", "Cycle"])).toEqual(["Cycle"]);
  expect(selectedEntries({ List: 1, Cycle: 2 })).toEqual([["Cycle", 2]]);
  expect(selectedLayouts(metas)).toEqual(["sample/second"]);
});
