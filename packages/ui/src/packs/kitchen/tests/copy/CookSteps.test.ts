import { expect, it } from "vitest";
import { cookStepsLabels, cookStepsReading } from "../../copy";

it("reads only the current instruction and its timer controls", () => {
  const steps = [
    { text: "First instruction", uses: ["First", "Second"], minutes: 0.1 },
    { text: "Last instruction", uses: [] },
  ];
  expect(cookStepsReading(steps, 1)).toEqual([
    "Step 1 of 2",
    '"First instruction"',
    '"First · Second"',
    '"Cooking timer"',
    "0:06",
    '"Start"',
    '"Stop"',
    '"Next step"',
    '"Back"',
  ]);
  expect(cookStepsReading(steps, 2)).toEqual(["Step 2 of 2", '"Last instruction"', '"Next step"', '"Back"']);
});

it("quotes instruction text and preserves the longest timer", () => {
  expect(cookStepsReading([{ text: 'Say "ready"', uses: ["One"], minutes: 240 }], 1)).toContain(
    JSON.stringify('Say "ready"'),
  );
  expect(cookStepsReading([{ text: "Wait", uses: [], minutes: 240 }], 1)).toContain("240:00");
  expect(cookStepsLabels.done).toBe("Recipe complete");
});
