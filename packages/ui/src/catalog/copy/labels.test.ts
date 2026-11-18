import { expect, it } from "vitest";
import {
  bookLabel,
  charLine,
  emptyLine,
  historyDetailLine,
  loadingLabel,
  photoLabels,
  swipeLabels,
} from "./labels";

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

it("keeps event kinds and full dates together without inventing record content", () => {
  for (const kind of ["visit", "order", "payment", "note", "message"])
    expect(historyDetailLine(kind, "2026-11-18")).toBe(`${kind} · 2026-11-18`);
});
