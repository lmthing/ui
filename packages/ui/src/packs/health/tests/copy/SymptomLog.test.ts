import { describe, expect, it } from "vitest";
import { symptomChosen, symptomSeverity, symptomSeverityLine, symptomReading } from "../../copy";

describe("SymptomLog copy", () => {
  it.each([0, 1, 2, 3, 4, 5])("derives the initial selection and severity from %i", (severity) => {
    const symptom = { label: "Headache", severity };
    expect(symptomChosen(symptom)).toBe(severity > 0);
    expect(symptomSeverity(symptom)).toBe(severity);
    expect(symptomSeverityLine(symptom)).toBe(`Headache · ${severity}/5`);
  });
  it("reads live toggles, starts newly chosen symptoms at one, and preserves stored severity", () => {
    expect(symptomSeverity({ label: "Dizziness", severity: 0, on: true })).toBe(1);
    expect(symptomSeverity({ label: "Headache", severity: 4, on: false })).toBe(0);
    expect(symptomSeverity({ label: "Headache", severity: 4, on: true })).toBe(4);
  });
  it("reads exactly the chosen visible severity lines across every group", () => {
    expect(
      symptomReading([
        {
          label: "Head",
          symptoms: [
            { label: "Headache", severity: 2 },
            { label: "Dizziness", severity: 0 },
          ],
        },
        { label: "Energy", symptoms: [{ label: "Fatigue", severity: 0, on: true }] },
      ]),
    ).toEqual(["Headache · 2/5", "Fatigue · 1/5"]);
    expect(symptomReading([])).toEqual([]);
  });
});
