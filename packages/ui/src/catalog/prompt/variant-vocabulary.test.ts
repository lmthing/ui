import { expect, it } from "vitest";
import { variantAxes } from "../props";
import { writePrompt } from "../probes";
import { variantProbeDefinitions } from "../probes/variants";
import { estimateTokens, variantVocabulary } from "./index";

it("states the whole shared axis vocabulary in at most 160 estimated tokens", () => {
  expect(estimateTokens(variantVocabulary)).toBeLessThanOrEqual(160);
  for (const [axis, { values }] of Object.entries(variantAxes)) {
    expect(variantVocabulary).toMatch(new RegExp(`^${axis}( \\([^\\n]+\\))?: ${values.join("\\|")}$`, "m"));
  }
});

it("shows the shared vocabulary once and only declared choices in the component signature", async () => {
  const def = variantProbeDefinitions.find(({ meta }) => meta.id === "Photo")!;
  const prompt = writePrompt(def, "Show the photo lib:dogs cropped to a square.");
  expect(prompt.split(variantVocabulary)).toHaveLength(2);
  expect(prompt.split("\n").find((line) => line.startsWith("props:"))).not.toMatch(/auto|media|density/);
  await expect(prompt).toMatchFileSnapshot("../../../test/snapshots/write-variant-prompt.txt");
});
