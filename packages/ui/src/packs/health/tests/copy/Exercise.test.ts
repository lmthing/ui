import { describe, expect, it } from "vitest";
import { exerciseLabels, exerciseReading } from "../../copy";

describe("Exercise copy", () => {
  it("names the local add action and information groups", () => {
    expect(exerciseLabels).toEqual({
      muscles: "Muscles",
      cues: "Form cues",
      equipment: "Equipment",
      best: "Best",
      last: "Last",
      start: "Add to workout",
    });
  });
  it("reads every muscle and cue and labels both optional results independently", () => {
    const input = { muscles: ["Chest", "Triceps"], cues: ["Feet planted", "Lower slowly"] };
    for (const best of [undefined, "50 kg × 8"])
      for (const last of [undefined, "40 kg × 8"]) {
        expect(exerciseReading({ ...input, best, last })).toEqual([
          'Muscles: "Chest", "Triceps"',
          'Form cues: "Feet planted"; "Lower slowly"',
          ...(best ? [`Best: ${best}`] : []),
          ...(last ? [`Last: ${last}`] : []),
          'start button: "Add to workout"',
        ]);
      }
  });
  it("includes optional equipment and safely quotes authored punctuation", () => {
    expect(exerciseReading({ muscles: ['A "muscle"'], cues: ["Don't bounce"], equipment: "Bench" })).toEqual([
      'Muscles: "A \\"muscle\\""',
      'Form cues: "Don\'t bounce"',
      'Equipment: "Bench"',
      'start button: "Add to workout"',
    ]);
  });
});
