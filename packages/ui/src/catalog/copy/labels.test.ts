import { expect, it } from "vitest";
import { anyoneLabel, charLine, emptyLine, loadingLabel, photoLabels, swipeLabels } from "./labels";

it("keeps neutral labels and empty-state inflection unchanged", () => {
  expect([emptyLine(), emptyLine(" "), emptyLine("plant"), emptyLine("city"), emptyLine("box")]).toEqual([
    "Nothing here yet",
    "Nothing here yet",
    "No plants yet",
    "No cities yet",
    "No boxes yet",
  ]);
  expect(emptyLine("garden-bed")).toBe("No garden beds yet");
  expect(loadingLabel).toBe("Loading");
  expect(charLine(42, 600)).toBe("42 / 600");
  expect(photoLabels).toEqual({ add: "Add photo", take: "Take photo", scan: "Scan" });
  expect(swipeLabels).toEqual({ left: "Skip", right: "Keep" });
  expect(anyoneLabel).toBe("Anyone");
});
