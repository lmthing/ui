import { expect, it } from "vitest";
import { directorMode } from "./director-mode";

it("allows a Director-only sweep and replay without changing other modes", () => {
  expect(directorMode(["--director"])).toBe(true);
  expect(directorMode(["--replay", "--director"])).toBe(true);
  expect(directorMode(["--pack", "comms", "--replay"])).toBe(false);
});

it.each(["--component", "--pack", "--compose", "--merges"])("rejects --director with %s", (mode) => {
  expect(() => directorMode([mode, "--director"])).toThrow(`--director cannot be combined with ${mode}`);
});
