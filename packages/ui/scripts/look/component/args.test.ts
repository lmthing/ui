import { expect, it } from "vitest";
import { presets } from "../../../src/catalog";
import { lookArgs } from "./args";

it("defaults to calm light at 390px", () => {
  expect(lookArgs(["--component", "List"])).toEqual({
    id: "List",
    widths: [390],
    modes: ["light"],
    presets: ["calm"],
    all: false,
  });
});

it("accepts repeated and comma-separated selectors without duplicate captures", () => {
  expect(
    lookArgs([
      "--component",
      "List",
      "--widths",
      "430,320",
      "--widths",
      "320",
      "--mode",
      "dark, light",
      "--mode",
      "dark",
      "--preset",
      "bold, calm",
      "--preset",
      "editorial",
      "--preset",
      "calm",
    ]),
  ).toMatchObject({ widths: [430, 320], modes: ["dark", "light"], presets: ["bold", "calm", "editorial"] });
});

it("restores the former matrix with --all, while permitting explicit overrides", () => {
  const args = ["--component", "List", "--all"];
  expect(lookArgs(args)).toMatchObject({
    widths: [320, 390, 430],
    modes: ["light", "dark"],
    presets: presets.map(({ id }) => id),
    all: true,
  });
  expect(lookArgs([...args, "--widths", "390", "--mode", "dark", "--preset", "bold"])).toMatchObject({
    widths: [390],
    modes: ["dark"],
    presets: ["bold"],
    all: true,
  });
});

it.each([
  { args: [], error: "Usage:" },
  { args: ["--component", "../List"], error: "Unknown component" },
  { args: ["--component", "List", "--preset", "missing"], error: "Invalid --preset" },
  { args: ["--component", "List", "--mode", "dark,"], error: "Invalid --mode" },
  { args: ["--component", "List", "--widths", "0"], error: "Invalid --widths" },
  { args: ["--component", "List", "--preset"], error: "argument missing" },
])("rejects $args", ({ args, error }) => {
  expect(() => lookArgs(args)).toThrow(error);
});
