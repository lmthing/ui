import { expect, it } from "vitest";
import {
  bookLabel,
  charLine,
  contactLabels,
  emptyLine,
  loadingLabel,
  nextLine,
  photoLabels,
  swipeLabels,
  tagsLine,
} from "./labels";

it("keeps contact actions, next details and static tags readable", () => {
  expect(contactLabels).toEqual({ call: "Call", message: "Message", directions: "Directions" });
  expect(nextLine("Friday 09:00")).toBe("Next: Friday 09:00");
  expect(tagsLine([])).toBe("");
  expect(tagsLine(["Regular"])).toBe("Regular");
  expect(tagsLine(["Regular", "Key holder", "New"])).toBe("Regular · Key holder · New");
});

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
  expect(bookLabel).toBe("Book");
  expect(charLine(42, 600)).toBe("42 / 600");
  expect(photoLabels).toEqual({ add: "Add photo", take: "Take photo", scan: "Scan" });
  expect(swipeLabels).toEqual({ left: "Skip", right: "Keep" });
});
