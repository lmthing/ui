import { expect, it } from "vitest";
import type { PackMeta } from "../meta";
import { buildPackIndex } from "./index";

const booking = {
  id: "booking",
  name: "Booking",
  purpose: "Book time with someone.",
  pick: "Appointments and classes. Not selling goods (commerce).",
  example: "./example.jsonl",
  probes: [],
} satisfies PackMeta;

it("snapshots the Director's fixture pack index", () => {
  expect(buildPackIndex({ booking })).toMatchInlineSnapshot(
    `"- booking: Book time with someone. Pick: Appointments and classes. Not selling goods (commerce)."`,
  );
});

it("orders packs by id without changing the map", () => {
  const commerce = { ...booking, id: "commerce" as const };
  const packs = { commerce, booking };
  expect(buildPackIndex(packs)).toBe(buildPackIndex({ booking, commerce }));
  expect(
    buildPackIndex(packs)
      .split("\n")
      .map((line) => line.split(":")[0]),
  ).toEqual(["- booking", "- commerce"]);
  expect(Object.keys(packs)).toEqual(["commerce", "booking"]);
  expect(buildPackIndex({})).toBe("");
});
