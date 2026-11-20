import { describe, expect, it } from "vitest";
import { lessonReading } from "../../copy";
import { registerLearningWords } from "../../lang";

describe("Lesson reading copy", () => {
  it("names the example only when it is visible and always names the action", () => {
    expect(lessonReading(true)).toEqual(["Worked example", "Continue"]);
    expect(lessonReading(false, "en-GB")).toEqual(["Continue"]);
  });

  it("uses the requested language with a fallback for unregistered languages", () => {
    const unregister = registerLearningWords("fr", { lesson: { example: "Exemple", next: "Continuer" } });
    try {
      expect(lessonReading(true, "fr-CA")).toEqual(["Exemple", "Continuer"]);
      expect(lessonReading(true, "de")).toEqual(["Worked example", "Continue"]);
    } finally {
      unregister();
    }
  });
});
