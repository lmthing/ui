import { expect, it } from "vitest";
import { agendaDay, agendaInitial, agendaLabels, agendaPeople, agendaReading } from "../../copy";

it("keeps the add-event action unchanged", () => {
  expect(agendaLabels.add).toBe("Add event");
});

it("formats date headings in UTC and takes initials by code point", () => {
  expect(agendaDay("2026-11-20")).toBe("Fri 20 Nov");
  expect(agendaInitial("émile")).toBe("É");
  expect(agendaInitial("𐐨")).toBe("𐐀");
});

it("keeps the locale's date suffixes and separators", () => {
  expect(agendaDay("2026-11-20", "ja-JP")).toBe("11月20日(金)");
});

it("reads all-day events, attendees and conflicts as displayed", () => {
  expect(agendaPeople(["Sam", "everyone"])).toBe("Everyone");
  expect(agendaReading({ id: "r1", title: "Visit", who: ["Sam", "Mia"], conflict: false })).toBe(
    "r1 All day Visit · Sam, Mia (S, M)",
  );
  expect(agendaReading({ id: "r2", time: "09:30", title: "Meet", who: ["Everyone"], conflict: true })).toBe(
    "r2 09:30 Meet · Everyone · Time conflict",
  );
});
