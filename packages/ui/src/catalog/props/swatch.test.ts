import { expect, it } from "vitest";
import { z } from "zod";
import { swatch } from "./index";
import { swatchNames } from "../tokens";
import { signature } from "../probes";

it.each(swatchNames)("preserves swatch %s", (name) => {
  expect(swatch.parse(name)).toBe(name);
});
it.each([
  [" BLUE ", "blue"],
  ["gray", "grey"],
  ["purpel", "purple"],
  ["oragne", "orange"],
  ["", "grey"],
  [null, "grey"],
])("snaps %j to %s", (input, expected) => {
  expect(swatch.parse(input)).toBe(expected);
});
it("keeps the closed vocabulary in metadata and model prompts", () => {
  expect(swatch.meta()).toEqual({ kind: "swatch", values: swatchNames });
  expect(signature(z.object({ colour: swatch }))).toContain(swatchNames.join("|"));
});
