import { expect, it } from "vitest";
import { packIds, type PackMeta } from "../meta";
import { buildPackIndex } from "./index";

const booking = {
  id: "booking",
  example: "./example.jsonl",
  probes: [],
} satisfies PackMeta;

it("snapshots the Director's fixture pack index", () => {
  expect(buildPackIndex({ booking }, {}, () => true)).toMatchInlineSnapshot(
    `"- booking: Offer services and book appointments, classes and free start times. Pick: Booking time with someone: appointments, classes, slots. Not selling goods (commerce)."`,
  );
});

it("orders packs by id without changing the map", () => {
  const commerce = { ...booking, id: "commerce" as const };
  const packs = { commerce, booking };
  expect(buildPackIndex(packs, { includeDrafts: true })).toBe(
    buildPackIndex({ booking, commerce }, { includeDrafts: true }),
  );
  expect(
    buildPackIndex(packs, {}, () => true)
      .split("\n")
      .map((line) => line.split(":")[0]),
  ).toEqual(["- booking", "- commerce"]);
  expect(Object.keys(packs)).toEqual(["commerce", "booking"]);
  expect(buildPackIndex({})).toBe("");
});

it("lists only ready fixture packs unless drafts are requested", () => {
  const commerce = { ...booking, id: "commerce" as const };
  const packs = { commerce, booking };
  const ready = (id: PackMeta["id"]) => id === "booking";
  expect(buildPackIndex(packs)).toBe("");
  expect(buildPackIndex(packs, {}, ready)).toBe(
    "- booking: Offer services and book appointments, classes and free start times. Pick: Booking time with someone: appointments, classes, slots. Not selling goods (commerce).",
  );
  expect(buildPackIndex(packs, { includeDrafts: true }, ready).split("\n")).toHaveLength(packIds.length);
  expect(
    buildPackIndex(packs, { includeDrafts: true }, () => {
      throw new Error("gate called");
    }),
  ).toBe(buildPackIndex(packs, { includeDrafts: true }));
  expect(buildPackIndex({}, { includeDrafts: true })).toBe(buildPackIndex(packs, { includeDrafts: true }));
  expect(buildPackIndex({}, {}, () => true)).toBe("");
});
