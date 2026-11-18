import { expect, it } from "vitest";
import {
  balancedLine,
  charLine,
  emptyLine,
  historyDetailLine,
  loadingLabel,
  loyaltyLabels,
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
  expect(charLine(42, 600)).toBe("42 / 600");
  expect(photoLabels).toEqual({ add: "Add photo", take: "Take photo", scan: "Scan" });
  expect(swipeLabels).toEqual({ left: "Skip", right: "Keep" });
});

it("labels reward-card actions and completion", () => {
  expect(loyaltyLabels).toEqual({ stamp: "Add stamp", redeem: "Redeem reward", earned: "Reward earned" });
});

it("keeps event kinds and full dates together without inventing record content", () => {
  for (const kind of ["visit", "order", "payment", "note", "message"])
    expect(historyDetailLine(kind, "2026-11-18")).toBe(`${kind} · 2026-11-18`);
});

it("keeps short endings together without changing their words", () => {
  expect(balancedLine("two hours before.")).toBe("two hours\u00a0before.");
  expect(balancedLine("Terms")).toBe("Terms");
});
