import { expect, it, vi } from "vitest";
import { checkOptions, nodeTestOptions } from "./check-options";

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

it("preserves Vitest defaults when neither Node override is set", () => {
  const warn = vi.fn();
  expect(nodeTestOptions({}, warn)).toEqual({});
  expect(warn).not.toHaveBeenCalled();
});

it("maps each Node override independently to Vitest settings", () => {
  const warn = vi.fn();
  expect(nodeTestOptions({ UI_TEST_TIMEOUT: "15000" }, warn)).toEqual({
    testTimeout: 15_000,
    hookTimeout: 15_000,
  });
  expect(nodeTestOptions({ UI_TEST_WORKERS: "04" }, warn)).toEqual({ maxWorkers: 4 });
  expect(warn).not.toHaveBeenCalled();
});

it.each(["", " ", "0", "-2", "2.5", "2e3", "0x10", "2workers", "2\n", "Infinity"])(
  "warns once per invalid Node override and ignores it: %j",
  (value) => {
    const warn = vi.fn();
    expect(nodeTestOptions({ UI_TEST_TIMEOUT: value, UI_TEST_WORKERS: value }, warn)).toEqual({});
    expect(warn.mock.calls).toEqual([
      [expect.stringMatching(/^Ignoring UI_TEST_TIMEOUT:[^\n]+$/)],
      [expect.stringMatching(/^Ignoring UI_TEST_WORKERS:[^\n]+$/)],
    ]);
  },
);

it("accepts both overrides at the upper bounds", () => {
  const warn = vi.fn();
  expect(nodeTestOptions({ UI_TEST_TIMEOUT: "2147483647", UI_TEST_WORKERS: "256" }, warn)).toEqual({
    testTimeout: 2_147_483_647,
    hookTimeout: 2_147_483_647,
    maxWorkers: 256,
  });
  expect(warn).not.toHaveBeenCalled();
});

it("ignores an overflowing timeout without discarding a valid worker count", () => {
  const warn = vi.fn();
  expect(nodeTestOptions({ UI_TEST_TIMEOUT: "2147483648", UI_TEST_WORKERS: "1" }, warn)).toEqual({
    maxWorkers: 1,
  });
  expect(warn.mock.calls).toEqual([[expect.stringContaining("UI_TEST_TIMEOUT")]]);
});

it.each(["257", "4294967296"])(
  "ignores oversized worker count %s without discarding a valid timeout",
  (workers) => {
    const warn = vi.fn();
    expect(nodeTestOptions({ UI_TEST_TIMEOUT: "15000", UI_TEST_WORKERS: workers }, warn)).toEqual({
      testTimeout: 15_000,
      hookTimeout: 15_000,
    });
    expect(warn.mock.calls).toEqual([[expect.stringContaining("UI_TEST_WORKERS")]]);
  },
);
