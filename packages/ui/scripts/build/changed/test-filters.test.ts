import { afterEach, expect, it, vi } from "vitest";
import { selectedIds, selectedEntries, selectedLayouts, wholePack } from "./test-filters";

afterEach(() => vi.unstubAllEnvs());

const ids = ["List", "Cycle"];
const metas = [
  {
    id: "sample",
    layouts: {
      first: { slots: [{ allow: ["List"] }] },
      second: { slots: [{ allow: ["Cycle"] }] },
    },
  },
];

it("keeps all cases without filters", () => {
  vi.stubEnv("UI_TEST_COMPONENTS", undefined);
  vi.stubEnv("UI_TEST_PACKS", undefined);
  expect(selectedIds(ids)).toEqual(ids);
  expect(selectedLayouts(metas)).toBeUndefined();
  expect(wholePack("health")).toBe(true);
});

it("filters components, entries, layouts and whole packs", () => {
  vi.stubEnv("UI_TEST_COMPONENTS", "Cycle");
  vi.stubEnv("UI_TEST_PACKS", "health");
  expect(selectedIds(ids)).toEqual(["Cycle"]);
  expect(selectedEntries({ List: 1, Cycle: 2 })).toEqual([["Cycle", 2]]);
  expect(selectedLayouts(metas)).toEqual(["sample/second"]);
  expect(wholePack("health")).toBe(true);
  expect(wholePack("booking")).toBe(false);
});

it("distinguishes a selected suite's own changes from an empty component selection", () => {
  vi.stubEnv("UI_TEST_COMPONENTS", "");
  vi.stubEnv("UI_TEST_PACKS", "");
  vi.stubEnv("UI_TEST_UNFILTERED", "test/conformance.test.tsx");
  expect(selectedIds(ids)).toEqual([]);
  expect(selectedLayouts(metas)).toEqual([]);
  expect(selectedIds(ids, "file:///ui/test/conformance.test.tsx")).toEqual(ids);
  expect(selectedIds(ids, "file:///ui/test/reading.test.tsx")).toEqual([]);
});
