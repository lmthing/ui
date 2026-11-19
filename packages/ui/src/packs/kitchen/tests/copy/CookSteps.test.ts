import { expect, it } from "vitest";
import { cookStepText, cookStepsLabels, cookStepsReading } from "../../copy";

it("reads only the current instruction and its timer controls", () => {
  const steps = [
    { text: "First instruction", uses: ["First", "Second"], minutes: 0.1 },
    { text: "Last instruction", uses: [] },
  ];
  expect(cookStepsReading(steps, 1)).toEqual([
    "Step 1 of 2",
    '"First\u00a0instruction"',
    '"First · Second"',
    '"Cooking timer"',
    "0:06",
    '"Start"',
    '"Stop"',
    '"Next step"',
    '"Back"',
  ]);
  expect(cookStepsReading(steps, 2)).toEqual([
    "Step 2 of 2",
    '"Last\u00a0instruction"',
    '"Next step"',
    '"Back"',
  ]);
});

it("quotes instruction text and preserves the longest timer", () => {
  expect(cookStepsReading([{ text: 'Say "ready"', uses: ["One"], minutes: 240 }], 1)).toContain(
    JSON.stringify('Say\u00a0"ready"'),
  );
  expect(cookStepsReading([{ text: "Wait", uses: [], minutes: 240 }], 1)).toContain("4:00:00");
  expect(cookStepsLabels.done).toBe("Recipe complete");
  expect(cookStepText("Stir until thickened.")).toBe("Stir until\u00a0thickened.");
});

it.each([
  [0.1, "0:06"],
  [1, "1:00"],
  [60, "1:00:00"],
  [240, "4:00:00"],
])("uses the shared clock format for %s minutes", (minutes, expected) => {
  expect(cookStepsReading([{ text: "Wait", uses: [], minutes: Number(minutes) }], 1)).toContain(expected);
});
