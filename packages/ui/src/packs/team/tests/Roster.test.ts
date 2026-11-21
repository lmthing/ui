import { expect, it } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";

it("groups shifts by person without changing their original action addresses", () => {
  const roster = components.Roster.examples[0]!;
  const reading = readComponent(components.Roster, roster, "r1").join("\n").split("\n");
  expect(reading).toContain("Anna: Mon 07:00–12:00 Watering (r1), Wed 08:00–14:00 (r3)");
  expect(reading).toContain("Rae: Mon 12:00–17:00 Potting (r2)");
  expect(reading.filter((line) => line.includes("Watering"))).toHaveLength(1);
  expect(reading.filter((line) => line.includes("Potting"))).toHaveLength(1);
  expect(reading.filter((line) => line.includes(" press "))).toEqual([
    "  r1 [r1/r1 press !needs-people]",
    "  r2 [r1/r2 press !needs-people]",
    "  r3 [r1/r3 press !needs-people]",
  ]);
});

it("keeps authored line breaks out of the per-person reading without changing the data", () => {
  const roster = {
    week: "2026-11-16",
    people: [{ name: "Anna\nLee", photo: "lib:people" }],
    shifts: [{ person: 0, day: 0, from: "07:00", to: "12:00", role: "Front\nDesk" }],
  };
  expect(components.Roster.props.parse(roster)).toMatchObject(roster);
  expect(readComponent(components.Roster, roster, "r1").join("\n").split("\n")).toContain(
    "Anna Lee: Mon 07:00–12:00 Front Desk (r1)",
  );
});
