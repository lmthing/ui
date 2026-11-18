import { afterEach, expect, it, vi } from "vitest";
import { chromium } from "playwright-core";
import { chromePaths, launchChrome } from "./launch-chrome";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it("uses the look search list, including a user-local installation", () => {
  expect(chromePaths({ CHROME: "/custom/chrome", HOME: "/users/test" })).toEqual([
    "/custom/chrome",
    "/usr/bin/google-chrome",
    "/users/test/.local/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ]);
  expect(chromePaths({})).toEqual(["/usr/bin/google-chrome", "/usr/bin/chromium-browser"]);
});
it("tries failed paths in order and preserves caller launch flags", async () => {
  vi.stubEnv("CHROME", "");
  vi.stubEnv("HOME", "/users/test");
  const browser = {} as Awaited<ReturnType<typeof chromium.launch>>;
  const launch = vi
    .spyOn(chromium, "launch")
    .mockRejectedValueOnce(new Error("missing"))
    .mockResolvedValueOnce(browser);
  expect(await launchChrome({ args: ["--autoplay-policy=no-user-gesture-required"] })).toBe(browser);
  expect(launch.mock.calls.map(([options]) => options?.executablePath)).toEqual([
    "/usr/bin/google-chrome",
    "/users/test/.local/bin/google-chrome",
  ]);
  expect(launch.mock.calls[1]?.[0]?.args).toEqual(["--autoplay-policy=no-user-gesture-required"]);
});
it("reports a clear failure after all candidates fail", async () => {
  vi.spyOn(chromium, "launch").mockRejectedValue(new Error("missing"));
  await expect(launchChrome()).rejects.toThrow("No Chrome found. Set CHROME");
});
