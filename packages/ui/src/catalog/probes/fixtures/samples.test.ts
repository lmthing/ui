import { expect, it } from "vitest";
import { sampleWalks } from "./samples";

it("preserves the timed walk example values and order", () => {
  expect(sampleWalks).toEqual([
    { time: "09:00", title: "Morning park walk", done: true },
    { time: "12:30", title: "Lunch walk" },
    { time: "17:00", title: "River walk" },
  ]);
});
