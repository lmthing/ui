import { expect, it } from "vitest";
import { packIds, packIndex, type PackMeta } from "./index";

it("covers exactly all pack ids in their declared order", () => {
  expect(packIndex.map(({ id }) => id)).toEqual(packIds);
  for (const entry of packIndex) {
    expect(Object.keys(entry)).toEqual(["id", "name", "purpose", "pick"]);
    for (const value of Object.values(entry)) expect(value.trim()).not.toBe("");
  }
});

it("keeps the probe-tuned booking and customers wording in the shared index", () => {
  expect(packIndex[0]).toEqual({
    id: "booking",
    name: "Booking",
    purpose: "Offer services and book appointments, classes and free start times.",
    pick: "Booking time with someone: appointments, classes, slots and class waitlists. Booking alone covers clients booking a provider's appointments or studio classes; clients, providers, paid services and class groups do not imply customers, team, commerce, events or community. Add another pack only for an explicitly requested separate job. Not selling goods (commerce). Reply only with a valid JSON array of pack ids, never an object, invented app name or explanation.",
  });
  expect(packIndex[1]).toEqual({
    id: "customers",
    name: "Customers",
    purpose: "Keep a business's client records, history, invoices, reviews, rewards and signed agreements.",
    pick: "A client book: keep records about clients, such as profiles, visit history and notes, consent, agreements, client invoices, reviews and loyalty. Choose customers for a client-records job, not because another workflow has customers or records transactions. Buying goods and checking out are commerce; reserving appointments is booking. Friends sharing posts, comments and follows belong to social.",
  });
});

it("leaves scaffold metadata owning only its example and probes", () => {
  const pack = { id: "booking", example: "example.jsonl", probes: [] } satisfies PackMeta;
  expect(Object.keys(pack)).toEqual(["id", "example", "probes"]);
});
