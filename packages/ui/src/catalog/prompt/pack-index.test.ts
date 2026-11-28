import { expect, it } from "vitest";
import { packIndex, type PackMeta } from "../meta";
import { buildPackIndex } from "./index";

const booking = {
  id: "booking",
  example: "./example.jsonl",
  probes: [],
} satisfies PackMeta;

it("snapshots the Director's fixture pack index", () => {
  expect(buildPackIndex({ booking }, {}, () => true)).toMatchInlineSnapshot(
    `"- booking: Offer services and book appointments, classes and free start times. Pick: Booking time with someone: appointments, classes, slots and class waitlists. Booking alone covers clients booking a provider's appointments or studio classes; clients, providers, paid services and class groups do not imply customers, team, commerce, events or community. Add another pack only for an explicitly requested separate job. Not selling goods (commerce). Reply only with a valid JSON array of pack ids, never an object, invented app name or explanation."`,
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

it("snapshots current health and money guidance with their service boundaries", () => {
  const guidance = buildPackIndex({}, { includeDrafts: true });
  expect(guidance.match(/^- (health|money): .*$/gm)).toMatchInlineSnapshot(`
    [
      "- health: The most-asked personal app family: logging workouts set by set, taking medication on time, watching a body measurement move toward a goal, keeping several healthy habits, tracking symptoms, vitals and a menstrual cycle. Everything stays on the phone; nothing here is medical advice. Pick: The body: workouts, medication, measurements, symptoms, cycles. Not the mind (mind), not food (kitchen)",
      "- money: Personal and household money: what is in each account, where it went, what is due, who owes whom, how to clear debts, and how a holding is doing. It never moves money in a first showcase; bank links and payments are service. Pick: The person's own money: balances, budgets, bills, splitting costs, debts and repayment plans. Not a business's sales (commerce)",
    ]
  `);
});

it("lists only ready fixture packs unless drafts are requested", () => {
  const commerce = { ...booking, id: "commerce" as const };
  const packs = { commerce, booking };
  const ready = (id: PackMeta["id"]) => id === "booking";
  expect(buildPackIndex(packs)).toBe("");
  expect(buildPackIndex(packs, {}, ready)).toBe(
    "- booking: Offer services and book appointments, classes and free start times. Pick: Booking time with someone: appointments, classes, slots and class waitlists. Booking alone covers clients booking a provider's appointments or studio classes; clients, providers, paid services and class groups do not imply customers, team, commerce, events or community. Add another pack only for an explicitly requested separate job. Not selling goods (commerce). Reply only with a valid JSON array of pack ids, never an object, invented app name or explanation.",
  );
  expect(buildPackIndex(packs, { includeDrafts: true }, ready).split("\n")).toHaveLength(packIndex.length);
  expect(
    buildPackIndex(packs, { includeDrafts: true }, () => {
      throw new Error("gate called");
    }),
  ).toBe(buildPackIndex(packs, { includeDrafts: true }));
  expect(buildPackIndex({}, { includeDrafts: true })).toBe(buildPackIndex(packs, { includeDrafts: true }));
  expect(buildPackIndex({}, {}, () => true)).toBe("");
});

it("offers indexed Wave 6 drafts only in the draft index", () => {
  const comms = { ...booking, id: "comms" } satisfies PackMeta;
  expect(buildPackIndex({ comms }, {}, () => false)).toBe("");
  expect(buildPackIndex({ comms }, {}, () => true)).toMatch(/^- comms: /);
  expect(buildPackIndex({}, { includeDrafts: true })).toMatch(/^- comms: /m);
  expect(buildPackIndex({ comms }, { includeDrafts: true })).toBe(
    buildPackIndex({}, { includeDrafts: true }),
  );
});
