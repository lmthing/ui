import { expect, it } from "vitest";
import { sampleWalks, sampleWalkRows } from "./samples";

it("preserves the timed walk example values and order", () => {
  expect(sampleWalks).toEqual([
    { time: "09:00", title: "Morning park walk", done: true },
    { time: "12:30", title: "Lunch walk" },
    { time: "17:00", title: "River walk" },
  ]);
});

it("preserves the list-row example values and order", () => {
  expect(sampleWalkRows).toEqual([
    { title: "Morning park walk", meta: "09:00 · two dogs", icon: "dog", trail: "value", value: "£18" },
    { title: "River walk", meta: "14:30 · one dog", icon: "clock", trail: "badge", value: "Booked" },
  ]);
});
