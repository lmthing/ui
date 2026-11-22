import { components } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";
import { flightReading, flightView } from "../../copy";

const flight = components.FlightStatus.examples[0]!;

it("distinguishes a midnight delay from an earlier estimate", () => {
  const times = flightView({
    ...flight,
    scheduledDep: "23:50",
    estimatedDep: "00:15",
    estimatedArr: "17:00",
  }).times;
  expect(times.map(({ estimated }) => estimated)).toEqual(["Est. 00:15 · +25 min", "Est. 17:00"]);
});

it("quotes airport and gate data and reads only visible full/brief figures", () => {
  const full = flightReading(flight).join("\n");
  expect(full).toContain('"LHR" ("London") → "HND" ("Tokyo")');
  expect(full).toContain("62%");
  expect(full).toContain("Est. 19:45 · +45 min");
  const brief = flightReading({ ...flight, detail: "brief" }).join("\n");
  expect(brief).toContain('Gate: "B42"');
  expect(brief).not.toMatch(/62%|Arrival|HND/);
});
